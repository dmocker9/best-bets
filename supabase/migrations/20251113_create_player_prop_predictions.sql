-- Create player_prop_predictions table for storing AI-generated player prop recommendations
-- This table stores predictions for player props (yards, TDs, receptions, etc.)

CREATE TABLE IF NOT EXISTS player_prop_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Prop identifiers
    prop_id BIGINT NOT NULL,
    player_name TEXT NOT NULL,
    team TEXT NOT NULL,
    opponent TEXT NOT NULL,
    position TEXT NOT NULL,
    
    -- Prop details
    prop_market TEXT NOT NULL, -- 'player_pass_yds', 'player_rush_yds', 'player_reception_yds', etc.
    prop_line NUMERIC(6,2) NOT NULL,
    
    -- Model prediction
    predicted_value NUMERIC(6,2) NOT NULL,
    confidence_score NUMERIC(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    value_score NUMERIC(6,2), -- Difference between predicted and line (edge in stat units)
    
    -- Recommendation
    recommended_bet TEXT CHECK (recommended_bet IN ('OVER', 'UNDER')),
    odds INTEGER, -- American odds (e.g., -110, +120)
    reasoning TEXT,
    
    -- Breakdown for transparency
    breakdown JSONB,
    
    -- Temporal tracking
    week_number INTEGER NOT NULL,
    season INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one prediction per prop per week/season
    UNIQUE(prop_id, week_number, season)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_prop_predictions_week_season 
    ON player_prop_predictions(week_number, season);

CREATE INDEX IF NOT EXISTS idx_prop_predictions_confidence 
    ON player_prop_predictions(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_prop_predictions_recommended 
    ON player_prop_predictions(recommended_bet) 
    WHERE recommended_bet IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prop_predictions_player 
    ON player_prop_predictions(player_name);

CREATE INDEX IF NOT EXISTS idx_prop_predictions_position 
    ON player_prop_predictions(position);

CREATE INDEX IF NOT EXISTS idx_prop_predictions_market 
    ON player_prop_predictions(prop_market);

CREATE INDEX IF NOT EXISTS idx_prop_predictions_value_score 
    ON player_prop_predictions(value_score DESC);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_player_prop_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER player_prop_predictions_updated_at
    BEFORE UPDATE ON player_prop_predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_player_prop_predictions_updated_at();

-- Add helpful comments
COMMENT ON TABLE player_prop_predictions IS 'AI-generated player prop predictions with over/under recommendations';
COMMENT ON COLUMN player_prop_predictions.predicted_value IS 'Model predicted value for the stat (e.g., 245.5 passing yards)';
COMMENT ON COLUMN player_prop_predictions.confidence_score IS 'Model confidence in prediction (0-100)';
COMMENT ON COLUMN player_prop_predictions.value_score IS 'Edge in stat units (predicted - line)';
COMMENT ON COLUMN player_prop_predictions.breakdown IS 'JSON breakdown of prediction factors: player_stats_score, defensive_matchup_score, game_environment_score, season_avg, matchup_adjustment, game_script_adjustment';
COMMENT ON COLUMN player_prop_predictions.prop_market IS 'Type of prop: player_pass_yds, player_rush_yds, player_reception_yds, player_receptions, player_pass_tds, player_anytime_td, etc.';

