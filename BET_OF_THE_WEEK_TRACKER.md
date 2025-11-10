# Bet of the Week Tracker - Implementation

## Summary

Added "Bet of the Week" header to track the performance of only the #1 pick from each week, displayed alongside the "Overall Record" header.

---

## UI Layout

### Header (Top of Page)

```
⚡ Best Bets

┌─────────────────────────────┐  ┌────────────────────────────────┐
│ BET OF THE WEEK             │  │ OVERALL RECORD                │
│ 1-0-0                       │  │ 4-4-0                         │
│ Win Rate: 100.0%            │  │ Win Rate: 50.0%               │
└─────────────────────────────┘  └────────────────────────────────┘
   (Blue border/text)               (Gray border/text)
```

---

## How "Bet of the Week" Works

### Tracking Logic

**Only counts the #1 pick from each week** (highest confidence score)

**Week 9 Example:**
- #1 Pick: Los Angeles Rams -14 (85.6% confidence)
- Result: Rams won 34-10 (covered -14) ✅ WIN
- Week 9 contributes: 1 win to "Bet of the Week"

**Week 10 Example:**
- #1 Pick: Seattle Seahawks -6.5 (83.4% confidence)  
- Result: Game hasn't been played yet
- Week 10 contributes: Nothing yet (0-0-0)

### Current Status

**Bet of the Week Record**: 1-0-0 (100%)
- Week 9: Rams -14 ✅ WIN
- Week 10: Seahawks -6.5 (pending)

**Overall Record**: 4-4-0 (50%)
- Includes all recommended bets from all weeks, not just #1 picks
- Multiple bets per week

---

## Implementation Details

### API Endpoint

**Bet of the Week:**
```bash
GET /api/game-results?season=2025&calculateRecord=true&topPickOnly=true
```

**Response:**
```json
{
  "success": true,
  "record": {
    "wins": 1,
    "losses": 0,
    "pushes": 0
  },
  "total": 1
}
```

**Overall Record:**
```bash
GET /api/game-results?season=2025&calculateRecord=true
```

**Response:**
```json
{
  "success": true,
  "record": {
    "wins": 4,
    "losses": 4,
    "pushes": 0
  },
  "total": 14
}
```

---

## Backend Logic

### Step 1: Find Top Pick per Week

```typescript
// Get all predictions ordered by week and confidence
const topPredictions = await supabase
  .from('spread_predictions')
  .select('game_id, week_number, confidence_score, recommended_bet')
  .eq('season', 2025)
  .neq('recommended_bet', 'none')
  .order('week_number', 'confidence_score DESC');

// Group by week, take first (highest confidence)
const topPicksByWeek = {};
predictions.forEach(pred => {
  if (!topPicksByWeek[pred.week_number]) {
    topPicksByWeek[pred.week_number] = pred;
  }
});
```

### Step 2: Get Results for Top Picks Only

```typescript
const topPickGameIds = Object.values(topPicksByWeek).map(p => p.game_id);

const results = await supabase
  .from('game_results')
  .select('*')
  .in('game_id', topPickGameIds);
```

### Step 3: Count Only Our Bet Side

```typescript
// For each result, check which side we bet on
if (recommended_bet === 'home_spread') {
  outcome = result.home_spread_result;
} else if (recommended_bet === 'away_spread') {
  outcome = result.away_spread_result;
}

if (outcome === 'win') record.wins++;
```

---

## Visual Differentiation

### Bet of the Week (Blue)
- **Border**: Blue (border-blue-600)
- **Label**: Blue text (text-blue-400)
- **Win Rate**: Blue text (text-blue-400)
- **Purpose**: Track elite picks only

### Overall Record (Gray)
- **Border**: Gray (border-gray-700)
- **Label**: Gray text (text-gray-400)
- **Win Rate**: Green text (text-green-400)
- **Purpose**: Track all recommended bets

---

## Example Scenarios

### After Week 9
- **Bet of the Week**: 1-0-0 (Rams -14 won)
- **Overall**: 3-2-0 (Rams, Colts, Patriots won | Titans, Seahawks lost)

### After Week 10 (Assuming Seahawks wins)
- **Bet of the Week**: 2-0-0 (Rams & Seahawks both won)
- **Overall**: 7-3-0 (3 from Week 9 + 4 from Week 10)

### After Week 10 (Assuming Seahawks loses)  
- **Bet of the Week**: 1-1-0 (Rams won, Seahawks lost)
- **Overall**: 6-4-0 (depends on other Week 10 picks)

---

## Status: ✅ Complete

Headers are now displayed at the top of the page:

✅ **"Bet of the Week"** - Tracks only #1 pick from each week (currently 1-0-0)  
✅ **"Overall Record"** - Tracks all recommended bets (currently 4-4-0)  
✅ **Blue vs Gray styling** - Clear visual differentiation  
✅ **Win rate percentages** - Auto-calculated and displayed  
✅ **Auto-refresh** - Updates when viewing Results tab

**Last Updated**: November 8, 2025  
**Current Bet of the Week**: Seattle Seahawks -6.5 (Week 10, pending)

