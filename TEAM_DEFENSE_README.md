# Team Defense Stats - Data Source Documentation

## Overview

The `team_defense_stats` table contains comprehensive defensive statistics for all 32 NFL teams, sourced directly from **Pro Football Reference**.

---

## Data Source

**Primary Source:** [Pro Football Reference - Team Defense Statistics](https://www.pro-football-reference.com/years/2025/opp.htm)

This is the **official source** for defensive team statistics. The data includes:
- Points allowed
- Total yards allowed
- Yards per play
- Turnovers forced
- Passing defense stats
- Rushing defense stats
- Penalties
- Advanced metrics (Expected Points Added by Defense)

---

## Database Table Structure

### `team_defense_stats` Table Schema:

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Auto-generated primary key |
| `team_name` | text | Full team name (e.g., "Houston Texans") |
| `team_abbr` | text | Team abbreviation (e.g., "HOU") |
| `games_played` | bigint | Number of games played |
| `points_allowed` | bigint | Total points allowed |
| `total_yards_allowed` | bigint | Total yards allowed |
| `plays_allowed` | bigint | Total offensive plays against |
| `yards_per_play` | double precision | Yards allowed per play |
| `turnovers_forced` | bigint | Total turnovers forced |
| `fumbles_forced` | bigint | Fumbles recovered |
| `first_downs_allowed` | bigint | Total first downs allowed |
| `pass_completions_allowed` | bigint | Pass completions allowed |
| `pass_attempts_allowed` | bigint | Pass attempts against |
| `pass_yards_allowed` | bigint | Passing yards allowed |
| `pass_tds_allowed` | bigint | Passing TDs allowed |
| `interceptions` | bigint | Interceptions made |
| `net_yards_per_attempt` | double precision | Net yards per pass attempt |
| `pass_first_downs_allowed` | bigint | First downs via pass |
| `rush_attempts_allowed` | bigint | Rushing attempts against |
| `rush_yards_allowed` | bigint | Rushing yards allowed |
| `rush_tds_allowed` | bigint | Rushing TDs allowed |
| `yards_per_rush_attempt` | double precision | Yards per rush attempt |
| `rush_first_downs_allowed` | bigint | First downs via rush |
| `penalties` | bigint | Opponent penalties |
| `penalty_yards` | bigint | Opponent penalty yards |
| `first_downs_by_penalty` | bigint | First downs by penalty |
| `expected_points_added_by_defense` | numeric | EPA by defense (advanced metric) |
| `season` | bigint | Season year (e.g., 2025) |
| `week` | bigint | Week number (1-18) |

---

## How to Update the Data

### Run the Scraper:

```bash
cd "/Applications/Cursor : Supabase/Test 2"
npx tsx scrape-team-defense.ts
```

### What it does:
1. ✅ Fetches the latest defensive stats from Pro Football Reference
2. ✅ Parses all 32 NFL teams
3. ✅ Clears old data for the current season/week
4. ✅ Inserts fresh data into `team_defense_stats`

### Frequency:
- **Weekly updates recommended** (after Week 10 games complete)
- Data on PFR updates after each game week

---

## Data Quality

### ✅ Real Data (100% Accurate)
All data is scraped directly from Pro Football Reference with no estimations or fallbacks.

### Sample Data (Week 10, 2025):
| Team | GP | PA | YDS | Y/P | TO | Pass YDS | Rush YDS |
|------|----|----|-----|-----|-------|----------|----------|
| Denver Broncos | 10 | 173 | 2707 | 4.3 | 8 | 1795 | 912 |
| Houston Texans | 9 | 150 | 2352 | 4.6 | 15 | 1539 | 813 |
| Kansas City Chiefs | 9 | 159 | 2626 | 5.4 | 9 | 1685 | 941 |

---

## Usage in Prediction Models

### Current Usage:
The `predictGames.ts` model uses defensive stats for:
- **Defensive Score Calculation**: Uses `yards_per_play` as a key metric
- **Team Strength Assessment**: Combines with offensive metrics

### Example Query:
```typescript
const { data: defenseStats } = await supabase
  .from('team_defense_stats')
  .select('yards_per_play')
  .eq('team_name', teamName)
  .order('week', { ascending: false })
  .limit(1)
  .maybeSingle();
```

---

## Troubleshooting

### Issue: "duplicate key value violates unique constraint"
**Solution:** Reset the ID sequence:
```sql
SELECT setval('team_defense_stats_id_seq', 
  (SELECT COALESCE(MAX(id), 0) FROM team_defense_stats) + 1, false);
```

### Issue: "Missing Supabase environment variables"
**Solution:** Ensure `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=your_url_here
SUPABASE_SERVICE_ROLE_KEY=your_key_here
```

### Issue: All values showing 0
**Solution:** Data-stat attributes may have changed on PFR. Check the debug output when running the scraper.

---

## Maintenance

### Files:
- **Scraper**: `scrape-team-defense.ts`
- **Migration**: `fix_team_defense_stats_id_sequence.sql`
- **This README**: `TEAM_DEFENSE_README.md`

### Last Updated:
- **Data**: Week 10, 2025 NFL Season
- **Scraper**: November 11, 2025

---

## Example SQL Queries

### Top 10 Defenses by Points Allowed:
```sql
SELECT team_name, team_abbr, points_allowed, yards_per_play
FROM team_defense_stats
WHERE season = 2025 AND week = 10
ORDER BY points_allowed ASC
LIMIT 10;
```

### Teams with Most Turnovers Forced:
```sql
SELECT team_name, turnovers_forced, interceptions, fumbles_forced
FROM team_defense_stats
WHERE season = 2025 AND week = 10
ORDER BY turnovers_forced DESC
LIMIT 10;
```

### Best Pass Defenses:
```sql
SELECT team_name, pass_yards_allowed, net_yards_per_attempt
FROM team_defense_stats
WHERE season = 2025 AND week = 10
ORDER BY pass_yards_allowed ASC
LIMIT 10;
```

---

## Related Documentation

- **Injury Data**: See `INJURY_DATA_README.md`
- **Snap Counts**: See `SNAP_COUNTS_README.md`
- **Team Stats**: See `auto_nfl_team_stats` table (offensive data)
- **Model Parameters**: See `MODEL_PARAMETERS.md`

---

**✅ Data Source Verified**: Pro Football Reference is the gold standard for NFL statistics and is used by analysts, teams, and media worldwide.


