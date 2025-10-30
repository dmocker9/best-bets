-- ============================================
-- DROP AND RECREATE odds_bets TABLE
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS trigger_update_odds_bets_updated_at ON odds_bets;
DROP TRIGGER IF EXISTS trigger_update_moneyline_prices ON odds_bets;
DROP TRIGGER IF EXISTS trigger_update_spread_values ON odds_bets;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_odds_bets_updated_at();
DROP FUNCTION IF EXISTS update_moneyline_prices();
DROP FUNCTION IF EXISTS update_spread_values();

-- Drop the table
DROP TABLE IF EXISTS odds_bets CASCADE;

-- ============================================
-- CREATE NEW TABLE WITH ALL COLUMNS
-- ============================================

CREATE TABLE odds_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id TEXT UNIQUE NOT NULL,
  sport_key TEXT NOT NULL,
  sport_title TEXT NOT NULL,
  commence_time TIMESTAMPTZ NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  bookmakers JSONB,
  home_price TEXT,
  away_price TEXT,
  away_spread TEXT,
  home_spread TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX idx_odds_bets_api_id ON odds_bets(api_id);
CREATE INDEX idx_odds_bets_sport_key ON odds_bets(sport_key);
CREATE INDEX idx_odds_bets_commence_time ON odds_bets(commence_time);
CREATE INDEX idx_odds_bets_home_price ON odds_bets(home_price);
CREATE INDEX idx_odds_bets_away_price ON odds_bets(away_price);
CREATE INDEX idx_odds_bets_away_spread ON odds_bets(away_spread);
CREATE INDEX idx_odds_bets_home_spread ON odds_bets(home_spread);

-- ============================================
-- CREATE TRIGGER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_odds_bets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to extract moneyline prices from bookmakers JSONB
CREATE OR REPLACE FUNCTION update_moneyline_prices()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract moneyline prices from first bookmaker (if exists) and format with +/- signs
  IF NEW.bookmakers IS NOT NULL AND jsonb_array_length(NEW.bookmakers) > 0 THEN
    -- Home price
    IF (NEW.bookmakers->0->>'moneyline_home_price') IS NOT NULL THEN
      DECLARE
        home_val INTEGER := (NEW.bookmakers->0->>'moneyline_home_price')::INTEGER;
      BEGIN
        IF home_val >= 0 THEN
          NEW.home_price := '+' || home_val::TEXT;
        ELSE
          NEW.home_price := home_val::TEXT;
        END IF;
      END;
    END IF;
    
    -- Away price
    IF (NEW.bookmakers->0->>'moneyline_away_price') IS NOT NULL THEN
      DECLARE
        away_val INTEGER := (NEW.bookmakers->0->>'moneyline_away_price')::INTEGER;
      BEGIN
        IF away_val >= 0 THEN
          NEW.away_price := '+' || away_val::TEXT;
        ELSE
          NEW.away_price := away_val::TEXT;
        END IF;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to extract spread values from bookmakers JSONB
CREATE OR REPLACE FUNCTION update_spread_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract spread values from first bookmaker (if exists) and format with +/- signs
  IF NEW.bookmakers IS NOT NULL AND jsonb_array_length(NEW.bookmakers) > 0 THEN
    -- Home spread
    IF (NEW.bookmakers->0->>'spread_home_line') IS NOT NULL THEN
      DECLARE
        home_val DECIMAL := (NEW.bookmakers->0->>'spread_home_line')::DECIMAL;
      BEGIN
        IF home_val >= 0 THEN
          NEW.home_spread := '+' || home_val::TEXT;
        ELSE
          NEW.home_spread := home_val::TEXT;
        END IF;
      END;
    END IF;
    
    -- Away spread
    IF (NEW.bookmakers->0->>'spread_away_line') IS NOT NULL THEN
      DECLARE
        away_val DECIMAL := (NEW.bookmakers->0->>'spread_away_line')::DECIMAL;
      BEGIN
        IF away_val >= 0 THEN
          NEW.away_spread := '+' || away_val::TEXT;
        ELSE
          NEW.away_spread := away_val::TEXT;
        END IF;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Trigger to automatically update updated_at on row modification
CREATE TRIGGER trigger_update_odds_bets_updated_at
  BEFORE UPDATE ON odds_bets
  FOR EACH ROW
  EXECUTE FUNCTION update_odds_bets_updated_at();

-- Trigger to automatically populate home_price and away_price
CREATE TRIGGER trigger_update_moneyline_prices
  BEFORE INSERT OR UPDATE OF bookmakers ON odds_bets
  FOR EACH ROW
  EXECUTE FUNCTION update_moneyline_prices();

-- Trigger to automatically populate spread columns
CREATE TRIGGER trigger_update_spread_values
  BEFORE INSERT OR UPDATE OF bookmakers ON odds_bets
  FOR EACH ROW
  EXECUTE FUNCTION update_spread_values();

-- ============================================
-- VERIFY SCHEMA
-- ============================================

-- Check that table was created correctly
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'odds_bets'
ORDER BY ordinal_position;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT '✅ Table odds_bets has been recreated successfully!' as message;

