# Flattening Changes Summary

## 🎯 What Changed

The bookmakers data structure has been **flattened** to make odds data much easier to query and use.

---

## 📝 Files Modified

### 1. **`src/lib/syncOdds.ts`**
**Added:**
- `FlattenedBookmaker` interface
- `flattenBookmakers()` function to transform complex API data

**Modified:**
- `syncOddsToDatabase()` now calls `flattenBookmakers()` before saving to database

**New Structure:**
```typescript
interface FlattenedBookmaker {
  bookmaker_name: string;
  home_team_price: number | null;
  away_team_price: number | null;
  home_team_line: number | null;
  away_team_line: number | null;
}
```

### 2. **`src/app/api/sync-odds/route.ts`**
**Added:**
- Same `FlattenedBookmaker` interface
- Same `flattenBookmakers()` function

**Modified:**
- `syncOddsData()` now flattens bookmakers before database insert

### 3. **`src/components/OddsDisplay.tsx`**
**Modified:**
- `getFirstSpread()` function updated to work with flattened structure
- Render logic updated to display `home_team_line`, `away_team_line`, and prices

**Before:**
```typescript
spread.outcomes[0].point  // Complex nested access
```

**After:**
```typescript
spread.away_line  // Direct property access
```

### 4. **`supabase/seed.sql`**
**Modified:**
- Updated sample data to use flattened bookmakers format

**Before:**
```json
[{
  "key": "draftkings",
  "title": "DraftKings",
  "markets": [...]
}]
```

**After:**
```json
[{
  "bookmaker_name": "DraftKings",
  "home_team_price": -110,
  "away_team_price": -110,
  "home_team_line": 7.5,
  "away_team_line": -7.5
}]
```

---

## 🔄 Before vs After

### Original API Response (Complex)
```json
{
  "bookmakers": [
    {
      "key": "draftkings",
      "title": "DraftKings",
      "markets": [
        {
          "key": "spreads",
          "outcomes": [
            {
              "name": "Baltimore Ravens",
              "price": -110,
              "point": -7.5
            },
            {
              "name": "Miami Dolphins",
              "price": -110,
              "point": 7.5
            }
          ]
        }
      ]
    }
  ]
}
```

### New Flattened Structure (Simple) ✅
```json
{
  "bookmakers": [
    {
      "bookmaker_name": "DraftKings",
      "home_team_price": -110,
      "away_team_price": -110,
      "home_team_line": 7.5,
      "away_team_line": -7.5
    }
  ]
}
```

---

## ✨ Benefits

### 1. **Simpler Queries**
```sql
-- Extract odds directly
SELECT 
  bookmaker->>'bookmaker_name' as bookmaker,
  (bookmaker->>'home_team_price')::numeric as price
FROM odds_bets, jsonb_array_elements(bookmakers) as bookmaker;
```

### 2. **Easier JavaScript Access**
```typescript
// Before (nested)
const price = bookmaker.markets[0].outcomes[0].price;

// After (flat)
const price = bookmaker.home_team_price;
```

### 3. **Better Performance**
- Smaller data size
- Faster JSON parsing
- More efficient queries

### 4. **Less Error-Prone**
- No need to navigate nested structures
- Direct property access
- Type-safe with TypeScript

---

## 🔍 How Flattening Works

The `flattenBookmakers()` function:

1. **Iterates** through each bookmaker in the API response
2. **Finds** the "spreads" market
3. **Matches** home/away team outcomes by name
4. **Extracts** prices and lines into a flat object
5. **Filters** out bookmakers without valid odds

```typescript
function flattenBookmakers(
  bookmakers: any[],
  homeTeam: string,
  awayTeam: string
): FlattenedBookmaker[] {
  return bookmakers.map(bookmaker => {
    // Find spreads market
    const spreadMarket = bookmaker.markets?.find(m => m.key === 'spreads');
    
    // Match outcomes by team name
    const homeOutcome = spreadMarket?.outcomes?.find(o => o.name === homeTeam);
    const awayOutcome = spreadMarket?.outcomes?.find(o => o.name === awayTeam);

    // Return flat structure
    return {
      bookmaker_name: bookmaker.title,
      home_team_price: homeOutcome?.price || null,
      away_team_price: awayOutcome?.price || null,
      home_team_line: homeOutcome?.point || null,
      away_team_line: awayOutcome?.point || null,
    };
  }).filter(b => b.home_team_price !== null || b.away_team_price !== null);
}
```

---

## 📊 Example Usage

### Query Best Odds
```sql
SELECT 
  home_team,
  away_team,
  MAX((bookmaker->>'away_team_price')::numeric) as best_away_price
FROM odds_bets,
     jsonb_array_elements(bookmakers) as bookmaker
WHERE sport_key = 'americanfootball_nfl'
GROUP BY home_team, away_team;
```

### TypeScript Example
```typescript
// Fetch game
const { data: game } = await supabase
  .from('odds_bets')
  .select('*')
  .eq('api_id', 'ravens_dolphins_2025')
  .single();

// Find best price
const bestPrice = Math.max(
  ...game.bookmakers.map(b => b.away_team_price || -Infinity)
);

// Get bookmaker name
const bestBookmaker = game.bookmakers.find(
  b => b.away_team_price === bestPrice
)?.bookmaker_name;

console.log(`Best odds: ${bestBookmaker} at ${bestPrice}`);
```

---

## 🎯 What's Preserved

The flattening process **only extracts spread odds** but you can easily extend it to include:

- Moneyline odds
- Over/under totals
- Player props
- Other market types

To add more markets, modify the `flattenBookmakers()` function:

```typescript
// Example: Add moneyline and totals
const moneylineMarket = bookmaker.markets?.find(m => m.key === 'h2h');
const totalsMarket = bookmaker.markets?.find(m => m.key === 'totals');

return {
  bookmaker_name: bookmaker.title,
  // Spreads
  home_team_price: homeSpreadOutcome?.price || null,
  away_team_price: awaySpreadOutcome?.price || null,
  home_team_line: homeSpreadOutcome?.point || null,
  away_team_line: awaySpreadOutcome?.point || null,
  // Moneyline (add these fields)
  home_moneyline: homeMoneylineOutcome?.price || null,
  away_moneyline: awayMoneylineOutcome?.price || null,
  // Totals (add these fields)
  over_price: overOutcome?.price || null,
  under_price: underOutcome?.price || null,
  total_line: overOutcome?.point || null,
};
```

---

## 🚀 Testing

### 1. Database Reset
```bash
npx supabase db reset
```
✅ Database reset with flattened seed data

### 2. Sync Real Data
```bash
curl http://localhost:3000/api/sync-odds
```
✅ Fetches from API and stores flattened data

### 3. Query Data
```sql
SELECT * FROM odds_bets LIMIT 1;
```
✅ Returns data in flattened format

---

## 📚 Documentation

New documentation file created:
- **`FLATTENED_BOOKMAKERS_GUIDE.md`** - Complete guide on using the flattened structure

Existing docs still apply:
- **`ODDS_SYNC_GUIDE.md`** - How to sync data
- **`IMPLEMENTATION_SUMMARY.md`** - System overview

---

## ✅ Summary

### What Changed:
- ✅ Flattened bookmakers structure
- ✅ Updated sync functions
- ✅ Updated UI components
- ✅ Updated seed data
- ✅ Added comprehensive documentation

### What Stayed the Same:
- ✅ Database schema (still JSONB)
- ✅ API endpoints
- ✅ Sync workflow
- ✅ Authentication

### Benefits:
- ✅ Easier to query
- ✅ Simpler code
- ✅ Better performance
- ✅ Less error-prone
- ✅ Type-safe

**Your odds data is now much easier to work with! 🎉**

