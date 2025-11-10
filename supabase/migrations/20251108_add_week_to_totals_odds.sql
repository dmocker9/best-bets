-- Add week column to totals_odds table
ALTER TABLE totals_odds ADD COLUMN IF NOT EXISTS week INTEGER;

-- Populate week column for all existing records using the existing calculate_nfl_week function
UPDATE totals_odds
SET week = calculate_nfl_week(commence_time);

-- Create an index on week for better query performance
CREATE INDEX IF NOT EXISTS idx_totals_odds_week ON totals_odds(week);

-- Create a trigger to automatically set week on insert/update
CREATE TRIGGER trigger_set_nfl_week_totals_odds
  BEFORE INSERT OR UPDATE OF commence_time ON totals_odds
  FOR EACH ROW
  EXECUTE FUNCTION set_nfl_week();

-- Add comment to column
COMMENT ON COLUMN totals_odds.week IS 'NFL week number (1-18) calculated from commence_time';

