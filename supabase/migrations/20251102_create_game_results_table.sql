-- Create game_results table to store actual game outcomes
CREATE TABLE game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES odds_bets(id) ON DELETE SET NULL,
  
  -- Game details
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  winner TEXT NOT NULL, -- home_team or away_team
  
  -- Game metadata
  week_number INTEGER NOT NULL,
  season INTEGER NOT NULL,
  game_date TIMESTAMPTZ NOT NULL,
  game_status TEXT DEFAULT 'Final', -- Final, In Progress, etc.
  
  -- Spread/moneyline results
  home_spread_result TEXT, -- 'cover', 'push', 'loss' based on predicted spread
  away_spread_result TEXT,
  home_moneyline_result TEXT, -- 'win' or 'loss'
  away_moneyline_result TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one result per game per week/season
  UNIQUE(home_team, away_team, week_number, season)
);

-- Indexes for faster queries
CREATE INDEX idx_game_results_game_id ON game_results(game_id);
CREATE INDEX idx_game_results_week_season ON game_results(week_number, season);
CREATE INDEX idx_game_results_season ON game_results(season);
CREATE INDEX idx_game_results_game_date ON game_results(game_date);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_game_results_updated_at
  BEFORE UPDATE ON game_results
  FOR EACH ROW
  EXECUTE FUNCTION update_game_results_updated_at();

-- Add helpful comment
COMMENT ON TABLE game_results IS 'Stores actual NFL game results for tracking prediction accuracy';


