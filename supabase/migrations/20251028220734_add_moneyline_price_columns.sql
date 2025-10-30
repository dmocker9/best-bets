-- Add home_price and away_price columns to extract moneyline prices
ALTER TABLE odds_bets 
ADD COLUMN home_price INTEGER,
ADD COLUMN away_price INTEGER;

-- Create function to extract and update moneyline prices from bookmakers JSONB
CREATE OR REPLACE FUNCTION update_moneyline_prices()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract moneyline_home_price from first bookmaker (if exists)
  IF jsonb_array_length(NEW.bookmakers) > 0 THEN
    NEW.home_price := (NEW.bookmakers->0->>'moneyline_home_price')::INTEGER;
    NEW.away_price := (NEW.bookmakers->0->>'moneyline_away_price')::INTEGER;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically populate prices on insert/update
CREATE TRIGGER trigger_update_moneyline_prices
  BEFORE INSERT OR UPDATE OF bookmakers ON odds_bets
  FOR EACH ROW
  EXECUTE FUNCTION update_moneyline_prices();

-- Backfill existing data
UPDATE odds_bets
SET 
  home_price = (bookmakers->0->>'moneyline_home_price')::INTEGER,
  away_price = (bookmakers->0->>'moneyline_away_price')::INTEGER
WHERE jsonb_array_length(bookmakers) > 0;

-- Add index for filtering by prices
CREATE INDEX idx_odds_bets_home_price ON odds_bets(home_price);
CREATE INDEX idx_odds_bets_away_price ON odds_bets(away_price);

