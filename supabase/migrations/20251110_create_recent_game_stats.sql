-- Create recent_game_stats table to store last 3 games for each team
CREATE TABLE IF NOT EXISTS recent_game_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Team information
    team_name TEXT NOT NULL,
    team_id TEXT NOT NULL,
    overall_record TEXT NOT NULL,
    
    -- Game details
    week_number INTEGER NOT NULL,
    game_date TEXT NOT NULL,
    opponent TEXT NOT NULL,
    is_home BOOLEAN NOT NULL,
    
    -- Result
    result TEXT NOT NULL CHECK (result IN ('W', 'L', 'T')),
    team_score INTEGER NOT NULL,
    opponent_score INTEGER NOT NULL,
    score_display TEXT NOT NULL,
    margin INTEGER NOT NULL,
    
    -- Metadata
    season INTEGER NOT NULL DEFAULT 2025,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(team_name, week_number, season)
);

-- Create indexes for common queries
CREATE INDEX idx_recent_game_stats_team_name ON recent_game_stats(team_name);
CREATE INDEX idx_recent_game_stats_week ON recent_game_stats(week_number);
CREATE INDEX idx_recent_game_stats_season ON recent_game_stats(season);
CREATE INDEX idx_recent_game_stats_result ON recent_game_stats(result);

-- Create a view for easy querying of hot/cold teams
CREATE OR REPLACE VIEW team_momentum AS
SELECT 
    team_name,
    overall_record,
    COUNT(*) as games_played,
    SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN result = 'L' THEN 1 ELSE 0 END) as losses,
    AVG(margin) as avg_margin,
    STRING_AGG(result, '-' ORDER BY week_number) as recent_form,
    CASE 
        WHEN SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) >= 2 THEN 'Hot'
        WHEN SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) = 1 THEN 'Average'
        ELSE 'Cold'
    END as momentum
FROM recent_game_stats
WHERE season = 2025
GROUP BY team_name, overall_record
ORDER BY avg_margin DESC;

-- Add comment
COMMENT ON TABLE recent_game_stats IS 'Stores the last 3 games for each NFL team to track recent performance and momentum';

