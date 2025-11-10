-- Add points_per_game and points_allowed_per_game columns to auto_nfl_team_stats
ALTER TABLE auto_nfl_team_stats
ADD COLUMN points_per_game DECIMAL(5,2),
ADD COLUMN points_allowed_per_game DECIMAL(5,2);

-- Calculate and populate for existing data
UPDATE auto_nfl_team_stats
SET 
  points_per_game = ROUND(
    points_for::NUMERIC / NULLIF(wins + losses + COALESCE(ties, 0), 0), 
    2
  ),
  points_allowed_per_game = ROUND(
    points_against::NUMERIC / NULLIF(wins + losses + COALESCE(ties, 0), 0), 
    2
  );

-- Create trigger function to auto-calculate on insert/update
CREATE OR REPLACE FUNCTION calculate_per_game_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate games played
  DECLARE
    games_played INTEGER := NEW.wins + NEW.losses + COALESCE(NEW.ties, 0);
  BEGIN
    IF games_played > 0 THEN
      NEW.points_per_game := ROUND(NEW.points_for::NUMERIC / games_played, 2);
      NEW.points_allowed_per_game := ROUND(NEW.points_against::NUMERIC / games_played, 2);
    ELSE
      NEW.points_per_game := 0;
      NEW.points_allowed_per_game := 0;
    END IF;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before insert or update
CREATE TRIGGER trigger_calculate_per_game_stats
  BEFORE INSERT OR UPDATE OF points_for, points_against, wins, losses, ties
  ON auto_nfl_team_stats
  FOR EACH ROW
  EXECUTE FUNCTION calculate_per_game_stats();

-- Add comments
COMMENT ON COLUMN auto_nfl_team_stats.points_per_game IS 'Average points scored per game (calculated from points_for / games_played)';
COMMENT ON COLUMN auto_nfl_team_stats.points_allowed_per_game IS 'Average points allowed per game (calculated from points_against / games_played)';

