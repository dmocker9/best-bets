-- Create odds_bets table for storing odds from external APIs
CREATE TABLE odds_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id TEXT UNIQUE NOT NULL,
  sport_key TEXT NOT NULL,
  sport_title TEXT NOT NULL,
  commence_time TIMESTAMPTZ NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  bookmakers JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_odds_bets_api_id ON odds_bets(api_id);
CREATE INDEX idx_odds_bets_sport_key ON odds_bets(sport_key);
CREATE INDEX idx_odds_bets_commence_time ON odds_bets(commence_time);

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_odds_bets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before any update on odds_bets table
CREATE TRIGGER trigger_update_odds_bets_updated_at
  BEFORE UPDATE ON odds_bets
  FOR EACH ROW
  EXECUTE FUNCTION update_odds_bets_updated_at();

