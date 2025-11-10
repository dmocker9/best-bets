-- Add season column if it doesn't exist
ALTER TABLE auto_nfl_team_stats
ADD COLUMN IF NOT EXISTS season INTEGER NOT NULL DEFAULT 2025;

-- Set all existing rows to 2025 season
UPDATE auto_nfl_team_stats
SET season = 2025
WHERE season IS NULL OR season = 0;

-- Rename week_number to week in auto_nfl_team_stats
ALTER TABLE auto_nfl_team_stats
RENAME COLUMN week_number TO week;

-- Drop old unique constraint if it exists
ALTER TABLE auto_nfl_team_stats
DROP CONSTRAINT IF EXISTS auto_nfl_team_stats_team_name_season_key;

-- Add new unique constraint with week
ALTER TABLE auto_nfl_team_stats
ADD CONSTRAINT auto_nfl_team_stats_team_name_season_week_key 
UNIQUE(team_name, season, week);

-- Update the index
DROP INDEX IF EXISTS idx_auto_nfl_team_stats_week_number;
CREATE INDEX IF NOT EXISTS idx_auto_nfl_team_stats_week 
ON auto_nfl_team_stats(week);

-- Add comments
COMMENT ON COLUMN auto_nfl_team_stats.week IS 'NFL week number (1-18) for which these stats are current';
COMMENT ON COLUMN auto_nfl_team_stats.season IS 'NFL season year (e.g., 2025)';
