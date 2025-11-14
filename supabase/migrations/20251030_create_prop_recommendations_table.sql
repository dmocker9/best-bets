-- Create prop_recommendations table to store precomputed player prop recommendations
CREATE TABLE IF NOT EXISTS prop_recommendations (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  team TEXT,
  opponent TEXT,
  position TEXT,
  prop_market TEXT NOT NULL,
  bookmaker TEXT,
  line NUMERIC,
  odds INTEGER,
  side TEXT NOT NULL CHECK (side IN ('Over', 'Under', 'No Bet')),
  probability NUMERIC(5,2) CHECK (probability >= 0 AND probability <= 100),
  edge NUMERIC(5,4),
  expected_value NUMERIC(6,4),
  reasoning TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique recommendations per prop
  UNIQUE(event_id, player_name, prop_market, bookmaker, line, side)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_prop_recs_ev ON prop_recommendations(expected_value DESC);
CREATE INDEX IF NOT EXISTS idx_prop_recs_market ON prop_recommendations(prop_market);
CREATE INDEX IF NOT EXISTS idx_prop_recs_player ON prop_recommendations(player_name);
CREATE INDEX IF NOT EXISTS idx_prop_recs_event ON prop_recommendations(event_id);
CREATE INDEX IF NOT EXISTS idx_prop_recs_side ON prop_recommendations(side) WHERE side != 'No Bet';

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prop_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prop_recommendations_updated_at
  BEFORE UPDATE ON prop_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_prop_recommendations_updated_at();

-- Add helpful comment
COMMENT ON TABLE prop_recommendations IS 'Stores precomputed player prop betting recommendations for fast UI loading';






