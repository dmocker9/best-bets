-- Create team_injuries table to store current NFL injury reports
-- Categorized by team and player importance

CREATE TABLE team_injuries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Team information
    team_name TEXT NOT NULL,
    
    -- Player information
    player_name TEXT NOT NULL,
    position TEXT NOT NULL,
    
    -- Injury details
    status TEXT NOT NULL, -- Out, Questionable, Doubtful, IR, etc.
    injury_type TEXT,
    injury_details TEXT,
    
    -- Importance metrics
    importance TEXT NOT NULL CHECK (importance IN ('Critical', 'High', 'Medium', 'Low')),
    importance_score NUMERIC(5,1) NOT NULL,
    
    -- Metadata
    season INTEGER NOT NULL DEFAULT 2025,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate player injuries
    UNIQUE(team_name, player_name, season)
);

-- Create indexes
CREATE INDEX idx_team_injuries_team ON team_injuries(team_name);
CREATE INDEX idx_team_injuries_importance ON team_injuries(importance);
CREATE INDEX idx_team_injuries_position ON team_injuries(position);
CREATE INDEX idx_team_injuries_status ON team_injuries(status);
CREATE INDEX idx_team_injuries_season ON team_injuries(season);

-- Create a view for team injury summary
CREATE OR REPLACE VIEW team_injury_summary AS
SELECT 
    team_name,
    COUNT(*) as total_injuries,
    SUM(CASE WHEN importance = 'Critical' THEN 1 ELSE 0 END) as critical_injuries,
    SUM(CASE WHEN importance = 'High' THEN 1 ELSE 0 END) as high_impact_injuries,
    SUM(CASE WHEN importance = 'Medium' THEN 1 ELSE 0 END) as medium_impact_injuries,
    SUM(CASE WHEN importance = 'Low' THEN 1 ELSE 0 END) as low_impact_injuries,
    AVG(importance_score) as avg_importance_score,
    STRING_AGG(
        CASE WHEN importance = 'Critical' 
        THEN player_name || ' (' || position || ')' 
        ELSE NULL END, 
        ', ' 
        ORDER BY importance_score DESC
    ) as critical_players
FROM team_injuries
WHERE season = 2025
GROUP BY team_name
ORDER BY critical_injuries DESC, total_injuries DESC;

-- Add comments
COMMENT ON TABLE team_injuries IS 'Current NFL injury reports categorized by team and player importance';
COMMENT ON COLUMN team_injuries.importance IS 'Player importance: Critical (QB/Star), High (Starter), Medium (Rotational), Low (Backup)';
COMMENT ON COLUMN team_injuries.importance_score IS 'Calculated score (0-100) based on position and injury status';
COMMENT ON VIEW team_injury_summary IS 'Aggregated injury counts and critical players by team';

