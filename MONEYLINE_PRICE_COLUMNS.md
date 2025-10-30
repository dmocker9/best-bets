# Moneyline Price Columns - Quick Access Guide

## 🎯 What Was Added

Two new columns for quick access to moneyline prices without querying the JSONB array:

- **`home_price`** (INTEGER) - Extracts moneyline price for home team
- **`away_price`** (INTEGER) - Extracts moneyline price for away team

---

## 📊 Schema Update

### New Columns

```sql
ALTER TABLE odds_bets 
ADD COLUMN home_price INTEGER,
ADD COLUMN away_price INTEGER;
```

### Example Data

| id | home_team | away_team | home_price | away_price |
|----|-----------|-----------|------------|------------|
| uuid-1 | Buffalo Bills | Kansas City Chiefs | **-425** | **+330** |
| uuid-2 | Miami Dolphins | Baltimore Ravens | **+250** | **-170** |

---

## 🔄 How It Works

### Automatic Extraction

The columns are **automatically populated** from the first bookmaker in the `bookmakers` JSONB array:

```json
// bookmakers array:
[
  {
    "bookmaker_name": "DraftKings",
    "moneyline_home_price": -425,  ← Extracted to home_price
    "moneyline_away_price": 330    ← Extracted to away_price
  },
  {
    "bookmaker_name": "FanDuel",
    "moneyline_home_price": -420,
    "moneyline_away_price": 335
  }
]

// Result:
home_price = -425
away_price = 330
```

### Trigger Function

The `update_moneyline_prices()` trigger automatically extracts prices on:
- ✅ INSERT - When new game is added
- ✅ UPDATE - When bookmakers data changes

---

## 🔍 Benefits

### 1. **Faster Queries**
```sql
-- Before (slow - requires JSONB parsing)
SELECT * FROM odds_bets 
WHERE (bookmakers->0->>'moneyline_away_price')::INTEGER > 200;

-- After (fast - uses indexed column)
SELECT * FROM odds_bets 
WHERE away_price > 200;
```

### 2. **Simpler Queries**
```sql
-- Get all underdogs (positive moneyline)
SELECT home_team, away_team, away_price 
FROM odds_bets 
WHERE away_price > 0
ORDER BY away_price DESC;
```

### 3. **Better Performance**
- Indexed columns for fast filtering
- No JSONB parsing needed
- Direct integer comparison

---

## 📝 Common Queries

### Find Big Underdogs
```sql
SELECT 
  home_team,
  away_team,
  away_price as underdog_price
FROM odds_bets 
WHERE away_price > 200  -- +200 or better
ORDER BY away_price DESC;
```

### Find Heavy Favorites
```sql
SELECT 
  home_team,
  away_team,
  home_price as favorite_price
FROM odds_bets 
WHERE home_price < -300  -- -300 or worse
ORDER BY home_price ASC;
```

### Get All Prices for a Sport
```sql
SELECT 
  home_team,
  away_team,
  home_price,
  away_price
FROM odds_bets 
WHERE sport_key = 'americanfootball_nfl'
ORDER BY commence_time;
```

### Find Close Games (Competitive Odds)
```sql
SELECT 
  home_team,
  away_team,
  home_price,
  away_price
FROM odds_bets 
WHERE ABS(home_price) BETWEEN 100 AND 150
  AND ABS(away_price) BETWEEN 100 AND 150;
```

---

## 💻 TypeScript Usage

### Updated Interface

```typescript
interface OddsBet {
  id: string;
  api_id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: FlattenedBookmaker[];
  home_price: number | null;  // NEW
  away_price: number | null;  // NEW
  created_at: string;
  updated_at: string;
}
```

### Fetching Data

```typescript
import { supabase } from '@/lib/supabase';

// Get games with moneyline odds
const { data: games } = await supabase
  .from('odds_bets')
  .select('*')
  .not('away_price', 'is', null)
  .order('away_price', { ascending: false });

// Access prices directly
games?.forEach(game => {
  console.log(`${game.away_team} at ${game.home_team}`);
  console.log(`  Home: ${game.home_price}`);
  console.log(`  Away: ${game.away_price}`);
});
```

### Find Best Value

```typescript
// Find biggest underdog
const { data: biggestUnderdog } = await supabase
  .from('odds_bets')
  .select('*')
  .gt('away_price', 0)
  .order('away_price', { ascending: false })
  .limit(1)
  .single();

console.log(`Best underdog: ${biggestUnderdog?.away_team} at +${biggestUnderdog?.away_price}`);
```

---

## 🎨 UI Display

### Simple Price Display

```tsx
import { supabase } from '@/lib/supabase';

function GameOdds({ gameId }: { gameId: string }) {
  const [game, setGame] = useState(null);

  useEffect(() => {
    const fetchGame = async () => {
      const { data } = await supabase
        .from('odds_bets')
        .select('*')
        .eq('id', gameId)
        .single();
      setGame(data);
    };
    fetchGame();
  }, [gameId]);

  if (!game) return <div>Loading...</div>;

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>{game.away_team}</span>
        <span className="font-bold text-green-500">
          {game.away_price > 0 ? '+' : ''}{game.away_price}
        </span>
      </div>
      <div className="flex justify-between">
        <span>{game.home_team}</span>
        <span className="font-bold text-green-500">
          {game.home_price > 0 ? '+' : ''}{game.home_price}
        </span>
      </div>
    </div>
  );
}
```

---

## 🔧 Manual Updates

### If You Want Different Logic

The default extracts from the **first bookmaker** in the array. To change this:

#### Extract from Specific Bookmaker

```sql
-- Update function to extract from DraftKings specifically
CREATE OR REPLACE FUNCTION update_moneyline_prices()
RETURNS TRIGGER AS $$
DECLARE
  draftkings_odds JSONB;
BEGIN
  -- Find DraftKings in the bookmakers array
  SELECT value INTO draftkings_odds
  FROM jsonb_array_elements(NEW.bookmakers) 
  WHERE value->>'bookmaker_name' = 'DraftKings'
  LIMIT 1;
  
  IF draftkings_odds IS NOT NULL THEN
    NEW.home_price := (draftkings_odds->>'moneyline_home_price')::INTEGER;
    NEW.away_price := (draftkings_odds->>'moneyline_away_price')::INTEGER;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Extract Best Odds

```sql
-- Update function to extract best (highest) odds
CREATE OR REPLACE FUNCTION update_moneyline_prices()
RETURNS TRIGGER AS $$
BEGIN
  -- Get best home price (closest to 0 or highest positive)
  SELECT MAX((value->>'moneyline_home_price')::INTEGER)
  INTO NEW.home_price
  FROM jsonb_array_elements(NEW.bookmakers);
  
  -- Get best away price (highest)
  SELECT MAX((value->>'moneyline_away_price')::INTEGER)
  INTO NEW.away_price
  FROM jsonb_array_elements(NEW.bookmakers);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Understanding Moneyline Prices

### Negative Numbers (Favorite)
- **-425** = Bet $425 to win $100
- **-170** = Bet $170 to win $100
- Lower (more negative) = bigger favorite

### Positive Numbers (Underdog)
- **+330** = Bet $100 to win $330
- **+250** = Bet $100 to win $250
- Higher (more positive) = bigger underdog

### Examples

```sql
-- Ravens vs Dolphins game
home_team: 'Miami Dolphins'
away_team: 'Baltimore Ravens'
home_price: +250  -- Dolphins are underdogs
away_price: -170  -- Ravens are favorites

-- Interpretation:
-- Ravens are expected to win
-- Bet $170 on Ravens to win $100
-- Bet $100 on Dolphins to win $250
```

---

## 🎯 Indexes

Two indexes are automatically created for performance:

```sql
CREATE INDEX idx_odds_bets_home_price ON odds_bets(home_price);
CREATE INDEX idx_odds_bets_away_price ON odds_bets(away_price);
```

This makes queries filtering by price **very fast**.

---

## ✅ Automatic Maintenance

### No Manual Updates Needed

The trigger handles everything automatically:

1. **New games** - Prices extracted on insert
2. **Updated odds** - Prices re-extracted on update
3. **Bookmaker changes** - Prices stay in sync

### Backfilled Existing Data

All existing records were automatically updated when the migration ran.

---

## 🚀 Summary

### What You Get:

✅ **`home_price`** - Direct access to home team moneyline
✅ **`away_price`** - Direct access to away team moneyline
✅ **Automatic updates** - Trigger keeps them in sync
✅ **Fast queries** - Indexed columns
✅ **Simple access** - No JSONB parsing needed

### Usage:

```sql
-- Simple and fast!
SELECT * FROM odds_bets WHERE away_price > 200;

-- Instead of:
SELECT * FROM odds_bets 
WHERE (bookmakers->0->>'moneyline_away_price')::INTEGER > 200;
```

---

**Your moneyline prices are now easily accessible! 🎉**

