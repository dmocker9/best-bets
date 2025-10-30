# Moneyline & Spreads Update - Complete Guide

## 🎯 What Changed

The sync function now extracts **BOTH** moneyline (h2h) and spreads markets from The Odds API, making it much more comprehensive.

---

## 📊 Before vs After

### Before (Spreads Only)
```json
{
  "bookmaker_name": "DraftKings",
  "home_team_price": -110,
  "away_team_price": -110,
  "home_team_line": 3,
  "away_team_line": -3
}
```

### After (Both Markets) ✅
```json
{
  "bookmaker_name": "DraftKings",
  // Spreads
  "spread_home_price": -110,
  "spread_away_price": -110,
  "spread_home_line": 3,
  "spread_away_line": -3,
  // Moneyline
  "moneyline_home_price": -425,
  "moneyline_away_price": 330
}
```

---

## 🔄 Updated Interface

### New FlattenedBookmaker Structure

```typescript
interface FlattenedBookmaker {
  bookmaker_name: string;
  
  // Spreads (point spread betting)
  spread_home_price: number | null;    // e.g., -110
  spread_away_price: number | null;    // e.g., -110
  spread_home_line: number | null;     // e.g., 3
  spread_away_line: number | null;     // e.g., -3
  
  // Moneyline (h2h - win/loss betting)
  moneyline_home_price: number | null; // e.g., -425
  moneyline_away_price: number | null; // e.g., +330
}
```

---

## 🆕 Market Types Explained

### 1. **Spreads** (Point Spread)
- Team must win by more than the line
- Lines: e.g., +3 or -3
- Prices: Usually around -110 for both sides

**Example:**
```
Chiefs -3 (-110)  → Chiefs must win by 4+ to cover
Bills +3 (-110)   → Bills can lose by 2 or win
```

### 2. **Moneyline** (h2h - Head to Head)
- Straight up win/loss bet
- No point spread
- Prices vary based on favorite/underdog

**Example:**
```
Chiefs -425  → Bet $425 to win $100 (heavy favorite)
Bills +330   → Bet $100 to win $330 (underdog)
```

---

## 📝 Files Modified

### 1. **`src/app/api/sync-odds/route.ts`**

**Changes:**
- Updated `FlattenedBookmaker` interface
- Modified `flattenBookmakers()` to extract both h2h and spreads
- Added logging for both market types
- **Removed test mode** - now processes all games

**New Logging Output:**
```
   📊 Processing bookmaker 1/15:
      Key: draftkings
      Title: DraftKings
      Markets: 3
      ✓ Found spreads market with 2 outcomes
      ✓ Spread Home: 3 (-110)
      ✓ Spread Away: -3 (-110)
      ✓ Found h2h (moneyline) market with 2 outcomes
      ✓ Moneyline Home: -425
      ✓ Moneyline Away: 330
```

### 2. **`src/lib/syncOdds.ts`**

**Changes:**
- Updated `FlattenedBookmaker` interface
- Modified `flattenBookmakers()` to match route.ts
- Now handles both market types

### 3. **`src/components/OddsDisplay.tsx`**

**Changes:**
- Updated to display both spreads and moneyline
- Shows clear labels: "Spread" and "ML"
- Side-by-side display of both bet types

**New UI Display:**
```
Kansas City Chiefs
  Spread: -3 (-110)    ML: -425

Buffalo Bills
  Spread: +3 (-110)    ML: +330
```

---

## 🧪 Testing

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Trigger Sync
```bash
curl http://localhost:3000/api/sync-odds
```

### 3. Check Terminal Output

Look for both markets being extracted:
```
✓ Found spreads market with 2 outcomes
✓ Spread Home: 3 (-110)
✓ Spread Away: -3 (-110)
✓ Found h2h (moneyline) market with 2 outcomes
✓ Moneyline Home: -425
✓ Moneyline Away: 330
```

### 4. Verify in Database

```sql
SELECT 
  home_team,
  away_team,
  jsonb_pretty(bookmakers) as odds
FROM odds_bets
LIMIT 1;
```

**Expected Result:**
```json
[
  {
    "bookmaker_name": "DraftKings",
    "spread_home_price": -110,
    "spread_away_price": -110,
    "spread_home_line": 3,
    "spread_away_line": -3,
    "moneyline_home_price": -425,
    "moneyline_away_price": 330
  }
]
```

---

## 🔍 SQL Queries

### Get Both Spreads and Moneyline
```sql
SELECT 
  home_team,
  away_team,
  bookmaker->>'bookmaker_name' as bookmaker,
  -- Spreads
  (bookmaker->>'spread_home_line')::numeric as spread_line,
  (bookmaker->>'spread_home_price')::numeric as spread_price,
  -- Moneyline
  (bookmaker->>'moneyline_home_price')::numeric as moneyline_price
FROM odds_bets,
     jsonb_array_elements(bookmakers) as bookmaker
WHERE sport_key = 'americanfootball_nfl';
```

### Find Best Moneyline Odds
```sql
SELECT 
  home_team,
  away_team,
  MAX((bookmaker->>'moneyline_away_price')::numeric) as best_away_moneyline
FROM odds_bets,
     jsonb_array_elements(bookmakers) as bookmaker
WHERE (bookmaker->>'moneyline_away_price') IS NOT NULL
GROUP BY home_team, away_team
ORDER BY best_away_moneyline DESC;
```

### Compare Spreads vs Moneyline
```sql
SELECT 
  home_team,
  away_team,
  -- Count bookmakers with spreads
  COUNT(*) FILTER (WHERE (bookmaker->>'spread_home_price') IS NOT NULL) as spread_count,
  -- Count bookmakers with moneyline
  COUNT(*) FILTER (WHERE (bookmaker->>'moneyline_home_price') IS NOT NULL) as moneyline_count
FROM odds_bets,
     jsonb_array_elements(bookmakers) as bookmaker
GROUP BY home_team, away_team;
```

---

## 💻 TypeScript Usage

### Accessing Both Market Types

```typescript
import { supabase } from '@/lib/supabase';

const { data: games } = await supabase
  .from('odds_bets')
  .select('*')
  .single();

if (games) {
  games.bookmakers.forEach(bookmaker => {
    console.log(`\n${bookmaker.bookmaker_name}:`);
    
    // Spreads
    if (bookmaker.spread_home_line !== null) {
      console.log(`  Spread: ${bookmaker.spread_away_line} (${bookmaker.spread_away_price})`);
    }
    
    // Moneyline
    if (bookmaker.moneyline_away_price !== null) {
      console.log(`  Moneyline: ${bookmaker.moneyline_away_price}`);
    }
  });
}
```

### Find Best Odds
```typescript
// Find best moneyline for away team
const bestMoneyline = Math.max(
  ...game.bookmakers
    .map(b => b.moneyline_away_price)
    .filter((price): price is number => price !== null)
);

// Find best spread price for away team
const bestSpreadPrice = Math.max(
  ...game.bookmakers
    .map(b => b.spread_away_price)
    .filter((price): price is number => price !== null)
);

console.log(`Best Moneyline: ${bestMoneyline}`);
console.log(`Best Spread Price: ${bestSpreadPrice}`);
```

---

## 🎨 UI Display

The `OddsDisplay` component now shows both bet types side by side:

```tsx
// Away Team Row
Kansas City Chiefs
  [Spread]           [ML]
  -3 (-110)          -425

// Home Team Row
Buffalo Bills
  [Spread]           [ML]
  +3 (-110)          +330
```

Clear labels make it easy to distinguish between:
- **Spread** - Point spread betting
- **ML** - Moneyline betting

---

## ✅ Benefits

### 1. **More Comprehensive Data**
- Captures both popular bet types
- Doesn't miss moneyline-only games
- More valuable for users

### 2. **Clear Separation**
- Field names clearly indicate bet type
- No confusion between markets
- Easy to query specific types

### 3. **Flexible Queries**
```sql
-- Only games with spreads
WHERE (bookmaker->>'spread_home_price') IS NOT NULL

-- Only games with moneyline
WHERE (bookmaker->>'moneyline_home_price') IS NOT NULL

-- Games with both
WHERE (bookmaker->>'spread_home_price') IS NOT NULL 
  AND (bookmaker->>'moneyline_home_price') IS NOT NULL
```

### 4. **Better User Experience**
- Show both bet types in UI
- Let users choose their preference
- Compare value across bet types

---

## 🚀 Production Ready

### Test Mode Removed ✅

The sync now processes **all games**, not just the first one:

```typescript
// Before
const gamesToProcess = games.slice(0, 1);

// After
console.log(`\n🔄 Processing all ${games.length} games...\n`);
for (const game of games) {
  // Process all games
}
```

---

## 📊 Example Response

### Full Sync Response
```json
{
  "success": true,
  "message": "Successfully synced 15 games (15 new, 0 updated)",
  "inserted": 15,
  "updated": 0,
  "failed": 0,
  "errors": [],
  "totalGames": 15
}
```

### Sample Data
```json
{
  "home_team": "Buffalo Bills",
  "away_team": "Kansas City Chiefs",
  "bookmakers": [
    {
      "bookmaker_name": "DraftKings",
      "spread_home_price": -110,
      "spread_away_price": -110,
      "spread_home_line": 3,
      "spread_away_line": -3,
      "moneyline_home_price": -425,
      "moneyline_away_price": 330
    },
    {
      "bookmaker_name": "FanDuel",
      "spread_home_price": -108,
      "spread_away_price": -112,
      "spread_home_line": 3,
      "spread_away_line": -3,
      "moneyline_home_price": -420,
      "moneyline_away_price": 335
    }
  ]
}
```

---

## 📚 Related Documentation

- **`FLATTENED_BOOKMAKERS_GUIDE.md`** - Original flattening guide (now updated)
- **`ODDS_SYNC_GUIDE.md`** - Complete sync setup
- **`DEBUG_SYNC.md`** - Debugging guide
- **`IMPLEMENTATION_SUMMARY.md`** - System overview

---

## 🎯 What's Next?

### Optional: Add More Markets

You can extend the flattening function to include:
- **Totals (Over/Under)** - `totals` market key
- **Player Props** - Various market keys
- **Futures** - Long-term bets

**Example:**
```typescript
// Add totals market
const totalsMarket = bookmaker.markets?.find((m: any) => m.key === 'totals');

if (totalsMarket && totalsMarket.outcomes) {
  const overOutcome = totalsMarket.outcomes.find(o => o.name === 'Over');
  const underOutcome = totalsMarket.outcomes.find(o => o.name === 'Under');
  
  result.total_over_price = overOutcome?.price || null;
  result.total_under_price = underOutcome?.price || null;
  result.total_line = overOutcome?.point || null;
}
```

---

**Your sync function is now capturing both spreads and moneyline odds! 🎉**

