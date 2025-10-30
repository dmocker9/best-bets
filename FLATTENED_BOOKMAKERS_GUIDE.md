# Flattened Bookmakers Structure Guide

## 📊 Overview

The `odds_bets` table now stores bookmakers data in a **flattened, easy-to-query format** instead of the complex nested structure from The Odds API.

This makes it much simpler to extract odds numbers and compare prices across bookmakers.

---

## 🔄 Data Transformation

### Before (Complex Nested Structure)
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

### After (Flattened Structure) ✅
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

## 📋 Flattened Schema

Each bookmaker object contains:

| Field | Type | Description |
|-------|------|-------------|
| `bookmaker_name` | string | Bookmaker display name (e.g., "DraftKings") |
| `home_team_price` | number \| null | American odds for home team (e.g., -110) |
| `away_team_price` | number \| null | American odds for away team (e.g., -110) |
| `home_team_line` | number \| null | Point spread for home team (e.g., 7.5) |
| `away_team_line` | number \| null | Point spread for away team (e.g., -7.5) |

---

## 🔍 Easy SQL Queries

### 1. Get All Odds for a Game
```sql
SELECT 
  home_team,
  away_team,
  bookmakers
FROM odds_bets
WHERE api_id = 'ravens_dolphins_2025';
```

**Result:**
```json
{
  "home_team": "Miami Dolphins",
  "away_team": "Baltimore Ravens",
  "bookmakers": [
    {
      "bookmaker_name": "DraftKings",
      "home_team_price": -110,
      "away_team_price": -110,
      "home_team_line": 7.5,
      "away_team_line": -7.5
    },
    {
      "bookmaker_name": "FanDuel",
      "home_team_price": -108,
      "away_team_price": -112,
      "home_team_line": 7.5,
      "away_team_line": -7.5
    }
  ]
}
```

### 2. Extract Just the Prices
```sql
SELECT 
  home_team,
  away_team,
  bookmaker->>'bookmaker_name' as bookmaker,
  (bookmaker->>'home_team_price')::numeric as home_price,
  (bookmaker->>'away_team_price')::numeric as away_price,
  (bookmaker->>'home_team_line')::numeric as home_line,
  (bookmaker->>'away_team_line')::numeric as away_line
FROM odds_bets,
     jsonb_array_elements(bookmakers) as bookmaker
WHERE api_id = 'ravens_dolphins_2025';
```

**Result:**
| home_team | away_team | bookmaker | home_price | away_price | home_line | away_line |
|-----------|-----------|-----------|------------|------------|-----------|-----------|
| Miami Dolphins | Baltimore Ravens | DraftKings | -110 | -110 | 7.5 | -7.5 |
| Miami Dolphins | Baltimore Ravens | FanDuel | -108 | -112 | 7.5 | -7.5 |

### 3. Find Best Odds Across All Bookmakers
```sql
SELECT 
  home_team,
  away_team,
  MAX((bookmaker->>'away_team_price')::numeric) as best_away_price,
  MAX((bookmaker->>'home_team_price')::numeric) as best_home_price
FROM odds_bets,
     jsonb_array_elements(bookmakers) as bookmaker
WHERE sport_key = 'americanfootball_nfl'
GROUP BY home_team, away_team;
```

### 4. Get All DraftKings Odds
```sql
SELECT 
  home_team,
  away_team,
  bookmaker->>'home_team_line' as spread,
  bookmaker->>'home_team_price' as price
FROM odds_bets,
     jsonb_array_elements(bookmakers) as bookmaker
WHERE bookmaker->>'bookmaker_name' = 'DraftKings'
AND sport_key = 'americanfootball_nfl';
```

### 5. Compare Prices for Same Line
```sql
-- Find games where different bookmakers offer different prices for the same line
SELECT 
  home_team,
  away_team,
  bookmaker->>'bookmaker_name' as bookmaker,
  (bookmaker->>'away_team_line')::numeric as line,
  (bookmaker->>'away_team_price')::numeric as price
FROM odds_bets,
     jsonb_array_elements(bookmakers) as bookmaker
WHERE api_id = 'ravens_dolphins_2025'
ORDER BY (bookmaker->>'away_team_price')::numeric DESC;
```

---

## 💻 TypeScript Usage

### Type Definition
```typescript
interface FlattenedBookmaker {
  bookmaker_name: string;
  home_team_price: number | null;
  away_team_price: number | null;
  home_team_line: number | null;
  away_team_line: number | null;
}

interface OddsBet {
  id: string;
  api_id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: FlattenedBookmaker[];
  created_at: string;
  updated_at: string;
}
```

### Fetching and Using Data
```typescript
import { supabase } from '@/lib/supabase';

// Fetch a game with odds
const { data: game } = await supabase
  .from('odds_bets')
  .select('*')
  .eq('api_id', 'ravens_dolphins_2025')
  .single();

if (game) {
  // Access bookmakers easily
  game.bookmakers.forEach(bookmaker => {
    console.log(`${bookmaker.bookmaker_name}:`);
    console.log(`  Home: ${bookmaker.home_team_line} (${bookmaker.home_team_price})`);
    console.log(`  Away: ${bookmaker.away_team_line} (${bookmaker.away_team_price})`);
  });

  // Find best price for away team
  const bestAwayPrice = Math.max(
    ...game.bookmakers.map(b => b.away_team_price || -Infinity)
  );

  // Get bookmaker with best price
  const bestBookmaker = game.bookmakers.find(
    b => b.away_team_price === bestAwayPrice
  );

  console.log(`Best odds: ${bestBookmaker?.bookmaker_name} at ${bestAwayPrice}`);
}
```

### React Component Example
```typescript
function OddsComparison({ game }: { game: OddsBet }) {
  return (
    <div className="space-y-4">
      <h2>{game.away_team} @ {game.home_team}</h2>
      
      <div className="grid gap-2">
        {game.bookmakers.map((bookmaker, index) => (
          <div key={index} className="flex justify-between p-4 bg-gray-800 rounded">
            <span className="font-semibold">{bookmaker.bookmaker_name}</span>
            <div className="flex gap-4">
              <div>
                <span className="text-green-500">
                  {bookmaker.away_team_line > 0 ? '+' : ''}
                  {bookmaker.away_team_line}
                </span>
                <span className="text-gray-400 ml-2">
                  ({bookmaker.away_team_price})
                </span>
              </div>
              <div>
                <span className="text-green-500">
                  {bookmaker.home_team_line > 0 ? '+' : ''}
                  {bookmaker.home_team_line}
                </span>
                <span className="text-gray-400 ml-2">
                  ({bookmaker.home_team_price})
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🎯 Benefits of Flattened Structure

### ✅ Easier to Query
- No nested navigation through markets and outcomes
- Direct access to prices and lines
- Simple JSONB queries

### ✅ Better Performance
- Smaller data size
- Faster queries
- Efficient indexing

### ✅ Simpler Code
- No complex parsing logic
- Easy to understand
- Less error-prone

### ✅ Easy Comparisons
```typescript
// Simple comparison
const bestPrice = Math.max(...bookmakers.map(b => b.home_team_price));

// Instead of complex nested iteration
// bookmakers.forEach(b => b.markets.forEach(m => m.outcomes.forEach(...)))
```

---

## 🔧 How the Flattening Works

The `flattenBookmakers()` function in `src/lib/syncOdds.ts`:

1. **Extracts** the spreads market from each bookmaker
2. **Matches** home and away team outcomes by name
3. **Creates** a simple object with prices and lines
4. **Filters** out bookmakers without valid odds data

```typescript
function flattenBookmakers(
  bookmakers: any[],
  homeTeam: string,
  awayTeam: string
): FlattenedBookmaker[] {
  return bookmakers.map(bookmaker => {
    const spreadMarket = bookmaker.markets?.find(m => m.key === 'spreads');
    
    const homeOutcome = spreadMarket?.outcomes?.find(o => o.name === homeTeam);
    const awayOutcome = spreadMarket?.outcomes?.find(o => o.name === awayTeam);

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

## 📊 Example Data

### Sample Query Result
```sql
SELECT * FROM odds_bets WHERE api_id = 'chiefs_bills_2025';
```

```json
{
  "id": "uuid-here",
  "api_id": "chiefs_bills_2025",
  "sport_key": "americanfootball_nfl",
  "sport_title": "NFL",
  "commence_time": "2025-11-04T16:00:00Z",
  "home_team": "Buffalo Bills",
  "away_team": "Kansas City Chiefs",
  "bookmakers": [
    {
      "bookmaker_name": "Caesars",
      "home_team_price": -110,
      "away_team_price": -110,
      "home_team_line": 1,
      "away_team_line": -1
    },
    {
      "bookmaker_name": "DraftKings",
      "home_team_price": -115,
      "away_team_price": -105,
      "home_team_line": 1,
      "away_team_line": -1
    }
  ],
  "created_at": "2025-01-28T19:03:18Z",
  "updated_at": "2025-01-28T19:03:18Z"
}
```

---

## 🚀 Next Steps

1. ✅ Sync odds from The Odds API (already flattened automatically)
2. ✅ Query data using the simple structure
3. ✅ Build UI components to display odds
4. ✅ Compare prices across bookmakers
5. ✅ Find best value bets

---

## 📚 Related Documentation

- [ODDS_SYNC_GUIDE.md](./ODDS_SYNC_GUIDE.md) - How to sync data from The Odds API
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Complete system overview
- [The Odds API Docs](https://the-odds-api.com/liveapi/guides/v4/) - API reference

---

**Happy querying! 🎯**

