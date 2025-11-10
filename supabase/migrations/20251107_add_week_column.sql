-- Add week column to odds_bets table
ALTER TABLE odds_bets ADD COLUMN IF NOT EXISTS week INTEGER;

-- Create a function to calculate week number from commence_time
CREATE OR REPLACE FUNCTION calculate_nfl_week(commence_date TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER AS $$
DECLARE
  week_num INTEGER;
BEGIN
  -- 2025 NFL Season week ranges (adjusting for time zones)
  -- Week 1: Sep 4-9, 2025
  -- Week 2: Sep 10-16, 2025
  -- Week 3: Sep 17-23, 2025
  -- Week 4: Sep 24-30, 2025
  -- Week 5: Oct 1-7, 2025
  -- Week 6: Oct 8-14, 2025
  -- Week 7: Oct 15-21, 2025
  -- Week 8: Oct 22-28, 2025
  -- Week 9: Oct 31 - Nov 4, 2025
  -- Week 10: Nov 9-11, 2025 (short week due to bye)
  -- Week 11: Nov 14-19, 2025
  -- Week 12: Nov 20-26, 2025
  -- Week 13: Nov 27 - Dec 2, 2025
  -- Week 14: Dec 3-9, 2025
  -- Week 15: Dec 10-16, 2025
  -- Week 16: Dec 17-23, 2025
  -- Week 17: Dec 24-30, 2025
  -- Week 18: Dec 31, 2025 - Jan 5, 2026
  
  -- Use DATE to compare just the date portion
  CASE
    -- Week 1: Sep 4-9
    WHEN commence_date::DATE BETWEEN '2025-09-04' AND '2025-09-09' THEN week_num := 1;
    -- Week 2: Sep 10-16
    WHEN commence_date::DATE BETWEEN '2025-09-10' AND '2025-09-16' THEN week_num := 2;
    -- Week 3: Sep 17-23
    WHEN commence_date::DATE BETWEEN '2025-09-17' AND '2025-09-23' THEN week_num := 3;
    -- Week 4: Sep 24-30
    WHEN commence_date::DATE BETWEEN '2025-09-24' AND '2025-09-30' THEN week_num := 4;
    -- Week 5: Oct 1-7
    WHEN commence_date::DATE BETWEEN '2025-10-01' AND '2025-10-07' THEN week_num := 5;
    -- Week 6: Oct 8-14
    WHEN commence_date::DATE BETWEEN '2025-10-08' AND '2025-10-14' THEN week_num := 6;
    -- Week 7: Oct 15-21
    WHEN commence_date::DATE BETWEEN '2025-10-15' AND '2025-10-21' THEN week_num := 7;
    -- Week 8: Oct 22-28
    WHEN commence_date::DATE BETWEEN '2025-10-22' AND '2025-10-28' THEN week_num := 8;
    -- Week 9: Oct 31 - Nov 4
    WHEN commence_date::DATE BETWEEN '2025-10-31' AND '2025-11-04' THEN week_num := 9;
    -- Week 10: Nov 9-11 (short week)
    WHEN commence_date::DATE BETWEEN '2025-11-09' AND '2025-11-11' THEN week_num := 10;
    -- Week 11: Nov 14-19
    WHEN commence_date::DATE BETWEEN '2025-11-14' AND '2025-11-19' THEN week_num := 11;
    -- Week 12: Nov 20-26
    WHEN commence_date::DATE BETWEEN '2025-11-20' AND '2025-11-26' THEN week_num := 12;
    -- Week 13: Nov 27 - Dec 2
    WHEN commence_date::DATE BETWEEN '2025-11-27' AND '2025-12-02' THEN week_num := 13;
    -- Week 14: Dec 3-9
    WHEN commence_date::DATE BETWEEN '2025-12-03' AND '2025-12-09' THEN week_num := 14;
    -- Week 15: Dec 10-16
    WHEN commence_date::DATE BETWEEN '2025-12-10' AND '2025-12-16' THEN week_num := 15;
    -- Week 16: Dec 17-23
    WHEN commence_date::DATE BETWEEN '2025-12-17' AND '2025-12-23' THEN week_num := 16;
    -- Week 17: Dec 24-30
    WHEN commence_date::DATE BETWEEN '2025-12-24' AND '2025-12-30' THEN week_num := 17;
    -- Week 18: Dec 31 - Jan 5, 2026
    WHEN commence_date::DATE BETWEEN '2025-12-31' AND '2026-01-05' THEN week_num := 18;
    -- Default to NULL if not in season
    ELSE week_num := NULL;
  END CASE;
  
  RETURN week_num;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Populate week column for all existing records
UPDATE odds_bets
SET week = calculate_nfl_week(commence_time);

-- Create an index on week for better query performance
CREATE INDEX IF NOT EXISTS idx_odds_bets_week ON odds_bets(week);

-- Create a trigger to automatically set week on insert/update
CREATE OR REPLACE FUNCTION set_nfl_week()
RETURNS TRIGGER AS $$
BEGIN
  NEW.week := calculate_nfl_week(NEW.commence_time);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_nfl_week
  BEFORE INSERT OR UPDATE OF commence_time ON odds_bets
  FOR EACH ROW
  EXECUTE FUNCTION set_nfl_week();

-- Add comment to column
COMMENT ON COLUMN odds_bets.week IS 'NFL week number (1-18) calculated from commence_time';

