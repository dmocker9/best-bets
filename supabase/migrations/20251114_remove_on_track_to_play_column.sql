-- Remove on_track_to_play column from injuries table
-- Players are now only considered "out" if game_status = 'Out'

ALTER TABLE injuries
DROP COLUMN IF EXISTS on_track_to_play;

-- Update comment to reflect new logic
COMMENT ON COLUMN injuries.game_status IS 'Official game status: Out, Doubtful, Questionable, or blank if not yet determined. Only players with game_status = ''Out'' are considered unavailable.';


