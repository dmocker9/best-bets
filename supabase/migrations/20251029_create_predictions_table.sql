-- Create predictions table to store game predictions
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES odds_bets(id) ON DELETE CASCADE,
  
  -- Prediction details
  predicted_winner TEXT NOT NULL,
  predicted_spread NUMERIC(5,2),
  confidence_score NUMERIC(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Team strengths
  home_team_strength NUMERIC(6,2),
  away_team_strength NUMERIC(6,2),
  
  -- Betting recommendation
  recommended_bet TEXT CHECK (recommended_bet IN ('home_spread', 'away_spread', 'home_ml', 'away_ml', 'none')),
  value_score NUMERIC(6,2), -- Difference from Vegas odds
  reasoning TEXT,
  
  -- Context
  week_number INTEGER NOT NULL,
  season INTEGER NOT NULL DEFAULT EXTRACT(year FROM now()),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one prediction per game per week
  UNIQUE(game_id, week_number, season)
);

-- Index for faster queries
CREATE INDEX idx_predictions_game_id ON predictions(game_id);
CREATE INDEX idx_predictions_week_season ON predictions(week_number, season);
CREATE INDEX idx_predictions_confidence ON predictions(confidence_score DESC);
CREATE INDEX idx_predictions_recommended_bet ON predictions(recommended_bet) WHERE recommended_bet != 'none';
CREATE INDEX idx_predictions_value_score ON predictions(value_score DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_predictions_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_predictions_updated_at();

-- Add helpful comment
COMMENT ON TABLE predictions IS 'Stores AI-generated predictions for NFL games with betting recommendations';


