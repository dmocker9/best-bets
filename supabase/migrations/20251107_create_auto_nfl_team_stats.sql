-- Create auto_nfl_team_stats table to store NFL team statistics from Pro Football Reference
CREATE TABLE IF NOT EXISTS auto_nfl_team_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Team identification
    team_name TEXT NOT NULL,
    conference TEXT NOT NULL CHECK (conference IN ('AFC', 'NFC')),
    division TEXT NOT NULL,
    season INTEGER NOT NULL,
    
    -- Playoff status
    is_division_leader BOOLEAN DEFAULT FALSE,
    is_wildcard BOOLEAN DEFAULT FALSE,
    
    -- Record
    wins INTEGER NOT NULL,
    losses INTEGER NOT NULL,
    ties INTEGER DEFAULT 0,
    win_percentage DECIMAL(5,3),
    
    -- Scoring
    points_for INTEGER NOT NULL,
    points_against INTEGER NOT NULL,
    point_differential INTEGER,
    margin_of_victory DECIMAL(5,2),
    
    -- Advanced metrics
    strength_of_schedule DECIMAL(5,2),
    srs DECIMAL(5,2), -- Simple Rating System (overall)
    offensive_srs DECIMAL(5,2), -- Offensive Simple Rating System
    defensive_srs DECIMAL(5,2), -- Defensive Simple Rating System
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one record per team per season
    UNIQUE(team_name, season)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_auto_nfl_team_stats_season ON auto_nfl_team_stats(season);
CREATE INDEX IF NOT EXISTS idx_auto_nfl_team_stats_conference ON auto_nfl_team_stats(conference);
CREATE INDEX IF NOT EXISTS idx_auto_nfl_team_stats_division ON auto_nfl_team_stats(division);
CREATE INDEX IF NOT EXISTS idx_auto_nfl_team_stats_team_name ON auto_nfl_team_stats(team_name);
CREATE INDEX IF NOT EXISTS idx_auto_nfl_team_stats_srs ON auto_nfl_team_stats(srs DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_auto_nfl_team_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_auto_nfl_team_stats_updated_at
    BEFORE UPDATE ON auto_nfl_team_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_auto_nfl_team_stats_updated_at();

-- Add table comment
COMMENT ON TABLE auto_nfl_team_stats IS 'NFL team statistics automatically scraped from Pro Football Reference';
COMMENT ON COLUMN auto_nfl_team_stats.srs IS 'Simple Rating System: overall team rating relative to average';
COMMENT ON COLUMN auto_nfl_team_stats.offensive_srs IS 'Offensive Simple Rating System: offensive efficiency relative to average';
COMMENT ON COLUMN auto_nfl_team_stats.defensive_srs IS 'Defensive Simple Rating System: defensive efficiency relative to average';
COMMENT ON COLUMN auto_nfl_team_stats.strength_of_schedule IS 'Strength of schedule: difficulty of opponents faced';

