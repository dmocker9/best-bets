import os
import sys
from typing import Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError

import pandas as pd
from dotenv import load_dotenv

# nfl_data_py relies on pandas; import after pandas
from nfl_data_py import import_weekly_data

try:
    from supabase import create_client, Client
except Exception as e:
    # Provide a clearer error if supabase isn't installed
    raise RuntimeError("Supabase client not available. Did you install requirements?") from e


PREFERRED_SEASON = 2025  # Strictly require 2025
DEFAULT_TABLE_NAME = os.getenv("PLAYER_STATS_TABLE", "player_stats_2025")


def read_supabase_client() -> Client:
    """Initialize Supabase client from environment variables."""
    load_dotenv()
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in environment.")
    return create_client(url, key)


def safe_int(value: Optional[float]) -> int:
    """Convert numeric to int safely (treat NaN/None as 0)."""
    if value is None:
        return 0
    try:
        if pd.isna(value):
            return 0
        return int(round(float(value)))
    except Exception:
        return 0


def safe_float(value: Optional[float]) -> float:
    """Convert numeric to float safely (treat NaN/None as 0.0)."""
    if value is None:
        return 0.0
    try:
        if pd.isna(value):
            return 0.0
        return float(value)
    except Exception:
        return 0.0


def coalesce_columns(df: pd.DataFrame, candidates: List[str], default_value=0) -> pd.Series:
    """Return first present column, else a default-filled Series of same length."""
    for col in candidates:
        if col in df.columns:
            return df[col].fillna(default_value)
    return pd.Series([default_value] * len(df))


def fetch_weekly_data() -> pd.DataFrame:
    """Fetch weekly player data for the specified seasons."""
    print("Fetching data...")
    try:
        weekly = import_weekly_data([PREFERRED_SEASON])
    except Exception as e:
        raise RuntimeError(
            "2025 data is not available from nfl_data_py yet. Please try again later."
        ) from e
    # Ensure expected columns exist or create them as 0
    # nfl_data_py uses specific column names; we coalesce common variants
    # Normalize a few important fields to consistent names used below

    # Player identifiers and metadata
    if "player_id" not in weekly.columns:
        # Fallbacks seen in some datasets
        weekly["player_id"] = coalesce_columns(weekly, ["gsis_id", "pfr_player_id", "player\nid"], "")
    if "player_name" not in weekly.columns:
        weekly["player_name"] = coalesce_columns(weekly, ["player_display_name", "player"], "")
    if "position" not in weekly.columns:
        weekly["position"] = coalesce_columns(weekly, ["position_group", "pos"], "")
    # Team
    team_series = None
    for candidate in ["recent_team", "team", "club_code"]:
        if candidate in weekly.columns:
            team_series = weekly[candidate]
            break
    if team_series is None:
        weekly["team"] = ""
    else:
        weekly["team"] = team_series

    # Passing
    weekly["passing_attempts"] = coalesce_columns(weekly, ["attempts", "pass_attempts", "att"], 0)
    weekly["passing_completions"] = coalesce_columns(weekly, ["completions", "pass_completions", "cmp"], 0)
    weekly["passing_yards"] = coalesce_columns(weekly, ["passing_yards", "pass_yards", "yds_pass", "pass_yds"], 0)
    weekly["passing_tds"] = coalesce_columns(weekly, ["passing_tds", "pass_tds", "td_pass"], 0)
    weekly["passing_interceptions"] = coalesce_columns(weekly, ["interceptions", "int"], 0)

    # Rushing
    weekly["carries"] = coalesce_columns(weekly, ["carries", "rush_attempts", "rush_att"], 0)
    weekly["rushing_yards"] = coalesce_columns(weekly, ["rushing_yards", "rush_yards", "yds_rush", "rush_yds"], 0)
    weekly["rushing_tds"] = coalesce_columns(weekly, ["rushing_tds", "rush_tds", "td_rush"], 0)

    # Receiving
    weekly["targets"] = coalesce_columns(weekly, ["targets", "rec_tgts"], 0)
    weekly["receptions"] = coalesce_columns(weekly, ["receptions", "rec"], 0)
    weekly["receiving_yards"] = coalesce_columns(weekly, ["receiving_yards", "rec_yards", "yds_rec", "rec_yds"], 0)
    weekly["receiving_tds"] = coalesce_columns(weekly, ["receiving_tds", "rec_tds", "td_rec"], 0)

    # Ensure numeric types
    numeric_cols = [
        "passing_attempts",
        "passing_completions",
        "passing_yards",
        "passing_tds",
        "passing_interceptions",
        "carries",
        "rushing_yards",
        "rushing_tds",
        "targets",
        "receptions",
        "receiving_yards",
        "receiving_tds",
    ]
    for c in numeric_cols:
        weekly[c] = pd.to_numeric(weekly[c], errors="coerce").fillna(0)

    # Normalize player/team/name fields to strings
    weekly["player_id"] = weekly["player_id"].astype(str).fillna("")
    weekly["player_name"] = weekly["player_name"].astype(str).fillna("")
    weekly["position"] = weekly["position"].astype(str).fillna("")
    weekly["team"] = weekly["team"].astype(str).fillna("")

    # Week sorting for last-3 computations
    if "week" not in weekly.columns:
        weekly["week"] = 0
    weekly["week"] = pd.to_numeric(weekly["week"], errors="coerce").fillna(0).astype(int)

    # Ensure we only keep the 2025 season
    if "season" in weekly.columns:
        weekly = weekly[weekly["season"] == 2025].copy()

    return weekly


def aggregate_season_totals(weekly: pd.DataFrame) -> pd.DataFrame:
    """Aggregate season totals and per-game counts by player."""
    # Games played: count of rows with any snap; fallback to count of rows
    grouped = weekly.groupby(["player_id", "player_name", "position", "team"], dropna=False)

    totals = grouped[[
        "passing_attempts",
        "passing_completions",
        "passing_yards",
        "passing_tds",
        "passing_interceptions",
        "carries",
        "rushing_yards",
        "rushing_tds",
        "targets",
        "receptions",
        "receiving_yards",
        "receiving_tds",
    ]].sum().reset_index()

    games_played = grouped.size().reset_index(name="games_played")
    merged = totals.merge(games_played, on=["player_id", "player_name", "position", "team"], how="left")

    # Per-game statistics
    def pg(n, d):
        return (n / d).round(2).where(d != 0, 0.0)

    merged["passing_yards_per_game"] = pg(merged["passing_yards"], merged["games_played"])
    merged["rushing_yards_per_game"] = pg(merged["rushing_yards"], merged["games_played"])
    merged["receiving_yards_per_game"] = pg(merged["receiving_yards"], merged["games_played"])

    return merged


def compute_last_three_averages(weekly: pd.DataFrame) -> pd.DataFrame:
    """Compute last 3 games averages for passing, rushing, receiving yards per player."""
    weekly_sorted = weekly.sort_values(["player_id", "week"])  # ascending
    last3 = (
        weekly_sorted
        .groupby("player_id", as_index=False)
        .apply(lambda g: g.tail(3))
        .reset_index(drop=True)
    )

    agg = last3.groupby("player_id")[
        ["passing_yards", "rushing_yards", "receiving_yards"]
    ].mean().round(2).reset_index()

    agg.rename(columns={
        "passing_yards": "last_3_games_passing_avg",
        "rushing_yards": "last_3_games_rushing_avg",
        "receiving_yards": "last_3_games_receiving_avg",
    }, inplace=True)

    return agg


def select_top_players(merged: pd.DataFrame) -> pd.DataFrame:
    """Filter to Top 100 as specified by role-based criteria."""
    # Derive selection metrics
    merged = merged.copy()
    merged["opportunities"] = merged["carries"].astype(float) + merged["targets"].astype(float)

    # Normalize positions (keep as given if already QB/RB/WR/TE)
    merged["position_norm"] = merged["position"].str.upper().str.strip()

    # QBs: Top 25 by passing_yards
    qbs = merged[merged["position_norm"] == "QB"].sort_values("passing_yards", ascending=False).head(25)

    # RBs: Top 30 by carries + targets
    rbs = merged[merged["position_norm"] == "RB"].sort_values("opportunities", ascending=False).head(30)

    # WRs: Top 30 by targets
    wrs = merged[merged["position_norm"] == "WR"].sort_values("targets", ascending=False).head(30)

    # TEs: Top 15 by targets
    tes = merged[merged["position_norm"] == "TE"].sort_values("targets", ascending=False).head(15)

    top = pd.concat([qbs, rbs, wrs, tes], ignore_index=True)
    # Remove potential duplicates if a player is mispositioned
    top = top.drop_duplicates(subset=["player_id"])  # keep first occurrence by priority order above
    return top


def build_records(df: pd.DataFrame, last3: pd.DataFrame) -> List[Dict[str, object]]:
    """Join last3 averages and build list of dicts ready for Supabase upsert."""
    out = df.merge(last3, on="player_id", how="left")
    out.fillna({
        "last_3_games_passing_avg": 0.0,
        "last_3_games_rushing_avg": 0.0,
        "last_3_games_receiving_avg": 0.0,
    }, inplace=True)

    records: List[Dict[str, object]] = []
    for _, row in out.iterrows():
        records.append({
            "player_id": str(row.get("player_id", "")),
            "player_name": str(row.get("player_name", "")),
            "position": str(row.get("position", "")),
            "team": str(row.get("team", "")) if pd.notna(row.get("team")) else None,
            "games_played": int(row.get("games_played", 0)) if pd.notna(row.get("games_played")) else 0,
            "passing_attempts": safe_int(row.get("passing_attempts")),
            "passing_completions": safe_int(row.get("passing_completions")),
            "passing_yards": safe_int(row.get("passing_yards")),
            "passing_tds": safe_int(row.get("passing_tds")),
            "passing_interceptions": safe_int(row.get("passing_interceptions")),
            "carries": safe_int(row.get("carries")),
            "rushing_yards": safe_int(row.get("rushing_yards")),
            "rushing_tds": safe_int(row.get("rushing_tds")),
            "targets": safe_int(row.get("targets")),
            "receptions": safe_int(row.get("receptions")),
            "receiving_yards": safe_int(row.get("receiving_yards")),
            "receiving_tds": safe_int(row.get("receiving_tds")),
            "passing_yards_per_game": safe_float(row.get("passing_yards_per_game")),
            "rushing_yards_per_game": safe_float(row.get("rushing_yards_per_game")),
            "receiving_yards_per_game": safe_float(row.get("receiving_yards_per_game")),
            "last_3_games_rushing_avg": safe_float(row.get("last_3_games_rushing_avg")),
            "last_3_games_receiving_avg": safe_float(row.get("last_3_games_receiving_avg")),
            "last_3_games_passing_avg": safe_float(row.get("last_3_games_passing_avg")),
        })
    return records


def upsert_records(client: Client, table_name: str, records: List[Dict[str, object]]) -> None:
    """Upsert records to Supabase with on_conflict on player_id."""
    if not records:
        print("No records to upload.")
        return
    # Supabase recommends batching; choose a reasonable chunk size
    chunk_size = 500
    for i in range(0, len(records), chunk_size):
        chunk = records[i : i + chunk_size]
        client.table(table_name).upsert(chunk, on_conflict="player_id").execute()


def main() -> int:
    try:
        client = read_supabase_client()
    except Exception as e:
        print(f"Failed to init Supabase: {e}")
        return 1

    try:
        weekly = fetch_weekly_data()
    except Exception as e:
        print(f"Error fetching data: {e}")
        return 1

    try:
        totals = aggregate_season_totals(weekly)
        last3 = compute_last_three_averages(weekly)
        top100 = select_top_players(totals)
        print(f"Processing {len(top100)} players...")
        records = build_records(top100, last3)
    except Exception as e:
        print(f"Error processing data: {e}")
        return 1

    # Table name: align with provided schema (player_stats_2025).
    # If the user wants 2024 instead, set env PLAYER_STATS_TABLE=player_stats_2024
    table_name = DEFAULT_TABLE_NAME

    try:
        upsert_records(client, table_name, records)
        print("Uploaded to Supabase")
    except Exception as e:
        print(f"Upload failed: {e}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())



