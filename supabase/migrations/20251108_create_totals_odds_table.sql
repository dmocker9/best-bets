-- Create totals_odds table for storing game total over/under odds from various bookmakers
CREATE TABLE IF NOT EXISTS public.totals_odds (
    id BIGSERIAL PRIMARY KEY,
    game_id TEXT NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    commence_time TIMESTAMPTZ NOT NULL,
    bookmaker TEXT NOT NULL,
    over_line DECIMAL(5,1),
    over_price INTEGER,
    under_line DECIMAL(5,1),
    under_price INTEGER,
    last_update TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, bookmaker)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_totals_odds_game_id ON public.totals_odds(game_id);
CREATE INDEX IF NOT EXISTS idx_totals_odds_commence_time ON public.totals_odds(commence_time);
CREATE INDEX IF NOT EXISTS idx_totals_odds_home_team ON public.totals_odds(home_team);
CREATE INDEX IF NOT EXISTS idx_totals_odds_away_team ON public.totals_odds(away_team);

-- Enable Row Level Security
ALTER TABLE public.totals_odds ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON public.totals_odds
    FOR SELECT
    USING (true);

-- Create policy to allow authenticated users to insert/update
CREATE POLICY "Allow authenticated insert/update" ON public.totals_odds
    FOR ALL
    USING (true)
    WITH CHECK (true);

