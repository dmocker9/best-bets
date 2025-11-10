-- Drop old table and create new simplified team_recent_games table
-- ONE ROW PER TEAM with last 3 games stored as JSONB array

DROP TABLE IF EXISTS recent_game_stats CASCADE;
DROP VIEW IF EXISTS team_momentum CASCADE;

CREATE TABLE team_recent_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Team identification
    team_name TEXT NOT NULL UNIQUE,
    overall_record TEXT NOT NULL,
    
    -- Last 3 games stored as JSON array
    recent_games JSONB NOT NULL,
    
    -- Pre-calculated aggregates for quick queries
    games_played INTEGER NOT NULL DEFAULT 3,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    ties INTEGER NOT NULL DEFAULT 0,
    recent_form TEXT NOT NULL, -- e.g., "W-W-L"
    avg_margin NUMERIC(5,1) NOT NULL,
    momentum TEXT NOT NULL CHECK (momentum IN ('Hot', 'Average', 'Cold')),
    
    -- Metadata
    season INTEGER NOT NULL DEFAULT 2025,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one team per season
    UNIQUE(team_name, season)
);

-- Create indexes
CREATE INDEX idx_team_recent_games_team ON team_recent_games(team_name);
CREATE INDEX idx_team_recent_games_momentum ON team_recent_games(momentum);
CREATE INDEX idx_team_recent_games_season ON team_recent_games(season);

-- Add comment
COMMENT ON TABLE team_recent_games IS 'Stores last 3 games for each NFL team in a single row with pre-calculated momentum metrics';
COMMENT ON COLUMN team_recent_games.recent_games IS 'JSONB array of last 3 games with week, date, opponent, location, result, score, margin';
COMMENT ON COLUMN team_recent_games.recent_form IS 'Win/loss pattern for last 3 games (e.g., "W-W-L", "L-L-L")';
COMMENT ON COLUMN team_recent_games.momentum IS 'Hot (2+ wins), Average (1 win), Cold (0 wins)';

-- Example of recent_games structure:
-- [
--   {"week": 8, "date": "Oct 26", "opponent": "Carolina Panthers", "location": "AWAY", "result": "W", "score": "40-9", "margin": 31},
--   {"week": 9, "date": "Nov 2", "opponent": "Kansas City Chiefs", "location": "HOME", "result": "W", "score": "28-21", "margin": 7},
--   {"week": 10, "date": "Nov 9", "opponent": "Miami Dolphins", "location": "AWAY", "result": "L", "score": "13-30", "margin": -17}
-- ]

