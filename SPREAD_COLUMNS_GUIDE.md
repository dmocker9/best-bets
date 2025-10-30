# Spread Columns Implementation Guide

## Overview
This guide documents the implementation of spread columns (`away_spread` and `home_spread`) in the `odds_bets` table. These columns automatically extract and store the point spread values from each game's bookmakers data.

## What Was Changed

### 1. Database Schema Updates

#### New Columns Added
- `away_spread` - DECIMAL(4,1) - Stores the away team's spread point value (e.g., -7.5, 3.5)
- `home_spread` - DECIMAL(4,1) - Stores the home team's spread point value (e.g., 7.5, -3.5)

#### New Indexes
```sql
CREATE INDEX idx_odds_bets_away_spread ON odds_bets(away_spread);
CREATE INDEX idx_odds_bets_home_spread ON odds_bets(home_spread);
```

### 2. Database Trigger Function

A new trigger function `update_spread_values()` was created that automatically extracts spread values from the `bookmakers` JSONB column when data is inserted or updated:

```sql
CREATE OR REPLACE FUNCTION update_spread_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract spread values from first bookmaker (if exists)
  IF NEW.bookmakers IS NOT NULL AND jsonb_array_length(NEW.bookmakers) > 0 THEN
    NEW.away_spread := (NEW.bookmakers->0->>'spread_away_line')::DECIMAL(4,1);
    NEW.home_spread := (NEW.bookmakers->0->>'spread_home_line')::DECIMAL(4,1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. API Updates

Both sync functions now include the `markets=h2h,spreads` parameter to ensure spread data is fetched from The Odds API:

**Before:**
```typescript
const apiUrl = `https://api.the-odds-api.com/v4/sports/${sport}/odds?regions=us&oddsFormat=american&apiKey=${key}`;
```

**After:**
```typescript
const apiUrl = `https://api.the-odds-api.com/v4/sports/${sport}/odds?regions=us&oddsFormat=american&markets=h2h,spreads&apiKey=${key}`;
```

Files updated:
- `/src/lib/syncOdds.ts` - Core sync library
- `/src/app/api/sync-odds/route.ts` - API route

### 4. Migration Applied

Migration: `20251029_add_spread_columns.sql`
- Added `away_spread` and `home_spread` columns
- Created indexes for performance
- Created trigger function to auto-populate spread values
- Backfilled existing records

## How It Works

### Data Flow

1. **API Fetch** → The Odds API returns game data with bookmakers array
2. **Flattening** → Each bookmaker's spread market is flattened into:
   - `spread_away_line` - Away team's point spread
   - `spread_home_line` - Home team's point spread
   - `spread_away_price` - American odds for away spread
   - `spread_home_price` - American odds for home spread
3. **Storage** → Flattened data stored in `bookmakers` JSONB column
4. **Extraction** → Trigger automatically extracts first bookmaker's spread values into dedicated columns

### Example Data Structure

#### API Response (Spread Market)
```json
{
  "key": "spreads",
  "outcomes": [
    {
      "name": "Baltimore Ravens",
      "price": -112,
      "point": -7.5
    },
    {
      "name": "Miami Dolphins",
      "price": -108,
      "point": 7.5
    }
  ]
}
```

#### Flattened in Database
```json
{
  "bookmaker_name": "DraftKings",
  "spread_away_line": -7.5,
  "spread_home_line": 7.5,
  "spread_away_price": -112,
  "spread_home_price": -108,
  "moneyline_away_price": -440,
  "moneyline_home_price": 340
}
```

#### Extracted Columns
```sql
away_spread: -7.5
home_spread: 7.5
```

## Usage

### Triggering a Sync

To populate the spread columns with the latest data:

**Option 1: Using the Sync Button in UI**
1. Open your application
2. Click the "Sync Odds" button
3. Spread values will be automatically populated

**Option 2: Direct API Call**
```bash
curl http://localhost:3000/api/sync-odds
```

**Option 3: Using Supabase Client**
```typescript
import { syncOddsToDatabase } from '@/lib/syncOdds';

const result = await syncOddsToDatabase('americanfootball_nfl');
console.log(result);
```

### Querying Spread Data

**Get all games with spreads:**
```sql
SELECT 
  home_team,
  away_team,
  home_spread,
  away_spread,
  commence_time
FROM odds_bets
WHERE home_spread IS NOT NULL
ORDER BY commence_time;
```

**Find games with large spreads (underdogs):**
```sql
SELECT 
  home_team,
  away_team,
  home_spread,
  away_spread
FROM odds_bets
WHERE ABS(home_spread) > 7.0
ORDER BY ABS(home_spread) DESC;
```

**Get complete odds including spreads:**
```sql
SELECT 
  home_team,
  away_team,
  home_spread,
  away_spread,
  home_price as moneyline_home,
  away_price as moneyline_away,
  bookmakers
FROM odds_bets
WHERE home_team = 'Miami Dolphins';
```

## Verification

To verify the implementation is working:

```sql
-- Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'odds_bets'
ORDER BY ordinal_position;

-- Check spread values are populated
SELECT 
  COUNT(*) as total_games,
  COUNT(home_spread) as games_with_spreads,
  AVG(ABS(home_spread)) as avg_spread
FROM odds_bets;

-- View sample data
SELECT 
  home_team,
  away_team,
  home_spread,
  away_spread,
  bookmakers->0->>'spread_home_line' as raw_spread
FROM odds_bets
LIMIT 5;
```

## Understanding Spread Values

### What is a Spread?
The spread (or point spread) is a betting line that handicaps the favored team. 

**Example:**
- Ravens vs Dolphins
- Home Spread: **7.5** (Dolphins are 7.5-point underdogs)
- Away Spread: **-7.5** (Ravens are 7.5-point favorites)

This means the Ravens need to win by more than 7.5 points to cover the spread.

### Interpreting Values
- **Negative spread** (e.g., -7.5) = Team is favored
- **Positive spread** (e.g., +7.5) = Team is underdog
- **0 or near 0** = Even matchup (pick'em)

### Multiple Bookmakers
The `away_spread` and `home_spread` columns store the spread from the **first bookmaker** in the array. To see spreads from all bookmakers, query the `bookmakers` JSONB column:

```sql
SELECT 
  home_team,
  away_team,
  jsonb_agg(
    jsonb_build_object(
      'bookmaker', bookmaker->>'bookmaker_name',
      'home_spread', bookmaker->>'spread_home_line',
      'away_spread', bookmaker->>'spread_away_line'
    )
  ) as all_spreads
FROM odds_bets,
  jsonb_array_elements(bookmakers) as bookmaker
WHERE api_id = '677dbbb6ad96fc5f5b36bb20b43139dd'
GROUP BY home_team, away_team;
```

## Files Modified

1. **Migration**: `supabase/migrations/20251029_add_spread_columns.sql` (new)
2. **Sync Library**: `src/lib/syncOdds.ts` (line 164)
3. **API Route**: `src/app/api/sync-odds/route.ts` (line 12)
4. **Recreate Script**: `recreate_odds_bets_table.sql` (updated for reference)

## Next Steps

1. **Sync the data**: Run a sync to populate spread values
2. **Update UI**: Display spread values in your components if needed
3. **Add analytics**: Calculate edge by comparing spreads across bookmakers
4. **Historical tracking**: Track how spreads change over time

## Troubleshooting

### Spread values are NULL
- Ensure you've run a sync after the migration
- Check that the API is returning spread data: `markets=h2h,spreads` must be in the URL
- Verify bookmakers array has spread data: 
  ```sql
  SELECT bookmakers->0 FROM odds_bets LIMIT 1;
  ```

### Trigger not firing
- Check trigger exists: 
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_spread_values';
  ```
- Verify function exists:
  ```sql
  SELECT * FROM pg_proc WHERE proname = 'update_spread_values';
  ```

### Performance issues
- Indexes are created on both spread columns for fast queries
- Use `WHERE home_spread IS NOT NULL` to filter out games without spreads

## Support

For issues or questions about spread columns:
1. Check that API key has sufficient requests remaining
2. Verify the API response includes spread data
3. Check Supabase logs for any errors during sync
4. Review the JSONB bookmakers structure for unexpected formats

