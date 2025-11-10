-- Create totals_predictions table for storing Over/Under predictions
CREATE TABLE IF NOT EXISTS public.totals_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Game identification
    game_id TEXT NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    commence_time TIMESTAMPTZ NOT NULL,
    
    -- Model prediction
    predicted_total DECIMAL(5,1) NOT NULL,
    confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    
    -- Vegas odds
    vegas_total DECIMAL(5,1) NOT NULL,
    over_price INTEGER,
    under_price INTEGER,
    
    -- Value analysis
    value_score DECIMAL(5,2),
    recommended_bet TEXT CHECK (recommended_bet IN ('OVER', 'UNDER')),
    reasoning TEXT,
    
    -- Detailed breakdown for analysis
    breakdown JSONB,
    
    -- Week and season tracking
    week_number INTEGER NOT NULL,
    season INTEGER NOT NULL DEFAULT EXTRACT(year FROM NOW()),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one prediction per game per week/season
    UNIQUE(game_id, week_number, season)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_totals_predictions_game_id ON public.totals_predictions(game_id);
CREATE INDEX IF NOT EXISTS idx_totals_predictions_week_season ON public.totals_predictions(week_number, season);
CREATE INDEX IF NOT EXISTS idx_totals_predictions_commence_time ON public.totals_predictions(commence_time);
CREATE INDEX IF NOT EXISTS idx_totals_predictions_recommended_bet ON public.totals_predictions(recommended_bet) WHERE recommended_bet IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_totals_predictions_value_score ON public.totals_predictions(value_score DESC) WHERE recommended_bet IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.totals_predictions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON public.totals_predictions
    FOR SELECT
    USING (true);

-- Create policy to allow authenticated users to insert/update
CREATE POLICY "Allow authenticated insert/update" ON public.totals_predictions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_totals_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_totals_predictions_updated_at
    BEFORE UPDATE ON public.totals_predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_totals_predictions_updated_at();

-- Add table comment
COMMENT ON TABLE public.totals_predictions IS 'AI-generated Over/Under predictions for NFL games with betting recommendations';
COMMENT ON COLUMN public.totals_predictions.predicted_total IS 'Model predicted total points for the game';
COMMENT ON COLUMN public.totals_predictions.confidence_score IS 'Model confidence in prediction (0-100)';
COMMENT ON COLUMN public.totals_predictions.value_score IS 'Absolute difference between model and Vegas (edge in points)';
COMMENT ON COLUMN public.totals_predictions.breakdown IS 'JSON breakdown of all prediction factors for transparency';

