-- Create comprehensive player passing stats table
-- Data from Pro Football Reference

CREATE TABLE player_passing_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Player Info
    rank INTEGER,
    player_name TEXT NOT NULL,
    age INTEGER,
    team_abbr TEXT,
    position TEXT,
    
    -- Games
    games_played INTEGER,
    games_started INTEGER,
    qb_record TEXT, -- W-L-T format
    
    -- Basic Passing
    completions INTEGER,
    attempts INTEGER,
    completion_pct NUMERIC(5,2),
    passing_yards INTEGER,
    passing_tds INTEGER,
    td_pct NUMERIC(4,2),
    interceptions INTEGER,
    int_pct NUMERIC(4,2),
    
    -- Advanced Passing
    first_downs INTEGER,
    success_rate NUMERIC(5,2),
    longest_pass INTEGER,
    yards_per_attempt NUMERIC(4,2),
    adjusted_yards_per_attempt NUMERIC(4,2),
    yards_per_completion NUMERIC(4,2),
    yards_per_game NUMERIC(5,2),
    passer_rating NUMERIC(5,2),
    qbr NUMERIC(4,2), -- ESPN QBR
    
    -- Sacks
    sacks INTEGER,
    sack_yards INTEGER,
    sack_pct NUMERIC(4,2),
    
    -- Net Efficiency
    net_yards_per_attempt NUMERIC(4,2), -- Y/A minus sacks
    adjusted_net_yards_per_attempt NUMERIC(4,2), -- NY/A with TD/INT adjustment
    
    -- Clutch
    fourth_quarter_comebacks INTEGER,
    game_winning_drives INTEGER,
    
    -- Metadata
    season INTEGER NOT NULL DEFAULT 2025,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(player_name, team_abbr, season)
);

-- Indexes for common queries
CREATE INDEX idx_player_passing_stats_player ON player_passing_stats(player_name);
CREATE INDEX idx_player_passing_stats_team ON player_passing_stats(team_abbr);
CREATE INDEX idx_player_passing_stats_yards ON player_passing_stats(passing_yards DESC);
CREATE INDEX idx_player_passing_stats_ypg ON player_passing_stats(yards_per_game DESC);
CREATE INDEX idx_player_passing_stats_rating ON player_passing_stats(passer_rating DESC);

-- Add comments
COMMENT ON TABLE player_passing_stats IS '2025 NFL passing statistics from Pro Football Reference';
COMMENT ON COLUMN player_passing_stats.qb_record IS 'QB win-loss-tie record as starter (e.g., "8-2-0")';
COMMENT ON COLUMN player_passing_stats.success_rate IS 'Percentage of plays that gain enough yardage (1st down success)';
COMMENT ON COLUMN player_passing_stats.passer_rating IS 'NFL passer rating (0-158.3 scale)';
COMMENT ON COLUMN player_passing_stats.qbr IS 'ESPN Total QBR (0-100 scale)';
COMMENT ON COLUMN player_passing_stats.adjusted_yards_per_attempt IS 'Y/A adjusted for TDs (+20 yards) and INTs (-45 yards)';
COMMENT ON COLUMN player_passing_stats.net_yards_per_attempt IS 'Yards per attempt minus sack yards lost';
COMMENT ON COLUMN player_passing_stats.adjusted_net_yards_per_attempt IS 'NY/A adjusted for TDs and INTs';


