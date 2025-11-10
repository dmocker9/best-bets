-- Create table for 2025 player stats
CREATE TABLE IF NOT EXISTS public.player_stats_2025 (
    player_id TEXT PRIMARY KEY,
    player_name TEXT NOT NULL,
    position TEXT NOT NULL,
    team TEXT,
    games_played INTEGER,
    passing_attempts INTEGER DEFAULT 0,
    passing_completions INTEGER DEFAULT 0,
    passing_yards INTEGER DEFAULT 0,
    passing_tds INTEGER DEFAULT 0,
    passing_interceptions INTEGER DEFAULT 0,
    carries INTEGER DEFAULT 0,
    rushing_yards INTEGER DEFAULT 0,
    rushing_tds INTEGER DEFAULT 0,
    targets INTEGER DEFAULT 0,
    receptions INTEGER DEFAULT 0,
    receiving_yards INTEGER DEFAULT 0,
    receiving_tds INTEGER DEFAULT 0,
    passing_yards_per_game DECIMAL(5,2),
    rushing_yards_per_game DECIMAL(5,2),
    receiving_yards_per_game DECIMAL(5,2),
    last_3_games_rushing_avg DECIMAL(5,2),
    last_3_games_receiving_avg DECIMAL(5,2),
    last_3_games_passing_avg DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_player_stats_2025_player_name ON public.player_stats_2025(player_name);
CREATE INDEX IF NOT EXISTS idx_player_stats_2025_position ON public.player_stats_2025(position);
CREATE INDEX IF NOT EXISTS idx_player_stats_2025_team ON public.player_stats_2025(team);



