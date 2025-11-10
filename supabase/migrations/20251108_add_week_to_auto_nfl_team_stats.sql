-- Add week_number column to auto_nfl_team_stats table
ALTER TABLE auto_nfl_team_stats
ADD COLUMN week_number INTEGER NOT NULL DEFAULT 10;

-- Update existing rows to week 10
UPDATE auto_nfl_team_stats
SET week_number = 10;

-- Update the unique constraint to include week_number
-- First drop the old constraint
ALTER TABLE auto_nfl_team_stats
DROP CONSTRAINT IF EXISTS auto_nfl_team_stats_team_name_season_key;

-- Add new constraint including week_number
ALTER TABLE auto_nfl_team_stats
ADD CONSTRAINT auto_nfl_team_stats_team_name_season_week_key 
UNIQUE(team_name, season, week_number);

-- Add index for queries by week
CREATE INDEX IF NOT EXISTS idx_auto_nfl_team_stats_week_number 
ON auto_nfl_team_stats(week_number);

-- Add comment
COMMENT ON COLUMN auto_nfl_team_stats.week_number IS 'NFL week number (1-18) for which these stats are current';

