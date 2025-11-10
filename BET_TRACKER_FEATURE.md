# Bet Tracker Feature - Record Headers

## Summary

Added bet performance tracking headers to display wins/losses for the current week and overall season.

---

## UI Updates

### Header Layout (New)

```
🎯 Best Bets NFL Week [Dropdown: 10]

[Bet of the Week: 0-0]  [Overall Record: 3-3 (50%)]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Two Record Trackers

**1. Bet of the Week** (Blue highlight)
- Shows W-L-P record for the currently selected week
- Example: Week 9 shows "3-3" (3 wins, 3 losses)
- Example: Week 10 shows "0-0" (games haven't been played yet)
- Updates when you change the week dropdown

**2. Overall Record** (Gray)
- Shows cumulative W-L-P record across all weeks
- Running total for the entire season
- Example: "3-3 (50%)" - 3 wins, 3 losses, 50% win rate

---

## Color Coding

### Confidence Score Colors

**🟢 GREEN (70%+ confidence)**
- Strong bets with high confidence
- Displayed in green in the UI
- Circle ring shows green fill

**🟡 YELLOW (50-69% confidence)**
- Value bets with moderate confidence
- Displayed in yellow in the UI
- Circle ring shows yellow fill

**🔴 RED (<50% confidence)**
- Low confidence - not recommended
- Would display in orange/red
- Not shown in current picks (all above 50%)

---

## Sample Week 9 Results (Demo Data)

### Our Picks & Results

| Pick | Result | Outcome |
|------|--------|---------|
| Los Angeles Rams -14 | ✅ WIN | Rams covered the spread |
| Indianapolis Colts -3 | ✅ WIN | Colts covered |
| New England Patriots spread | ✅ WIN | Patriots covered |
| Tennessee Titans spread | ❌ LOSS | Titans didn't cover |
| Seattle Seahawks spread | ❌ LOSS | Seahawks didn't cover |

**Week 9 Record**: 3-2 (60%)  
**Overall Record**: 3-2 (60%)

---

## How Records Are Calculated

### From game_results Table

Each game has spread result columns:
- `home_spread_result` - 'win', 'loss', or 'push'
- `away_spread_result` - 'win', 'loss', or 'push'
- `home_moneyline_result` - 'win' or 'loss'
- `away_moneyline_result` - 'win' or 'loss'

### API Calculation

```typescript
// For each game result
if (home_spread_result === 'win') wins++;
if (home_spread_result === 'loss') losses++;
if (home_spread_result === 'push') pushes++;

// Same for away_spread_result, home_moneyline_result, away_moneyline_result
```

### Week Filter

- **Week Record**: Only counts results for selected week
- **Overall Record**: Counts all results across all weeks

---

## API Endpoints

### Calculate Week Record
```bash
GET /api/game-results?week=9&season=2025&calculateRecord=true
```

**Response:**
```json
{
  "success": true,
  "record": {
    "wins": 3,
    "losses": 3,
    "pushes": 0
  },
  "total": 14
}
```

### Calculate Overall Record
```bash
GET /api/game-results?calculateRecord=true
```

**Response:**
```json
{
  "success": true,
  "record": {
    "wins": 3,
    "losses": 3,
    "pushes": 0
  },
  "total": 14
}
```

---

## Current Week 10 Status

**Bet of the Week (Week 10)**: 0-0 (Games haven't been played yet)  
**Overall Record**: 3-3 (50%) (From Week 9 sample data)

---

## Features

✅ **Real-time updates** - Changes when you switch weeks in dropdown  
✅ **Win percentage** - Shows % in parentheses  
✅ **Push tracking** - Displays as third number (e.g., 3-2-1)  
✅ **Color differentiation** - Blue for weekly, gray for overall  
✅ **Auto-refresh** - Fetches on component mount and week change

---

## Visual Design

### Bet of the Week Badge
```
┌─────────────────────────────┐
│ BET OF THE WEEK    3-3 (50%)│  ← Blue background
└─────────────────────────────┘
```

### Overall Record Badge
```
┌─────────────────────────────┐
│ OVERALL RECORD     3-3 (50%)│  ← Gray background
└─────────────────────────────┘
```

---

## Status: ✅ Complete

Record trackers are live in the UI header showing:
- Weekly performance for selected week
- Overall season performance
- Both update automatically when changing weeks

**Last Updated**: November 8, 2025  
**Feature**: Bet performance tracking

