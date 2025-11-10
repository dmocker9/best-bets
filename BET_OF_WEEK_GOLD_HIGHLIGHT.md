# Bet of the Week - Gold Highlighting

## Summary

Added gold outline and badge to "Bet of the Week" picks in both the Spreads tab and Results tab for visual consistency.

---

## Visual Design

### In Spreads Tab (Already Existed)

```
┌─────────────────────────────────────────────────┐
│ ⭐ Best Bet of the Week! ⭐                     │  ← Gold banner
├─────────────────────────────────────────────────┤
│ #1 Seattle Seahawks @ Arizona Cardinals        │
│                                                  │
│ Recommended: Seattle Seahawks -6.5              │
│ Confidence: 83%                                  │
└─────────────────────────────────────────────────┘
  Gold border (border-yellow-500)
```

### In Results Tab (NEW)

```
┌─────────────────────────────────────────────────┐
│ ⭐ Best Bet of the Week! ⭐                     │  ← Gold banner
├─────────────────────────────────────────────────┤
│ Los Angeles Rams @ New Orleans Saints           │
│                                                  │
│ Final Score: Rams 34, Saints 10                 │
│ Our Pick: Rams -14   ✓ WIN                     │
└─────────────────────────────────────────────────┘
  Gold border (border-yellow-500)
```

---

## Implementation

### New API Endpoint

**GET /api/top-picks**
- Returns game_ids of the #1 pick from each week
- Used to identify which games should have the gold highlight

**Example Request:**
```bash
GET /api/top-picks?season=2025
```

**Example Response:**
```json
{
  "success": true,
  "topPickGameIds": [
    "9359aa51-2dda-48b3-b87a-a519c2a2b061",  // Week 9: Rams -14
    "cd2afac6-4473-4751-849d-dbe5dc006145"   // Week 10: Seahawks -6.5
  ],
  "total": 2
}
```

### GameResultsDisplay Component Updates

1. **Fetches top pick IDs** on component mount
2. **Compares each result** to see if it's a top pick
3. **Applies gold styling** if match found:
   - Gold border (`border-yellow-500`)
   - Gold shadow (`shadow-yellow-500/20`)
   - Gold banner at top ("⭐ Best Bet of the Week! ⭐")
   - Yellow text for game title

---

## Current Top Picks

### Week 9
- **Game**: Los Angeles Rams vs New Orleans Saints
- **Pick**: Rams -14.0
- **Confidence**: 86%
- **Result**: ✅ **WIN** (Rams won 34-10, covered by 10 points)
- **Badge**: ⭐ Best Bet of the Week!

### Week 10
- **Game**: Seattle Seahawks vs Arizona Cardinals
- **Pick**: Seahawks -6.5
- **Confidence**: 83%
- **Result**: Pending (game not played yet)
- **Badge**: ⭐ Best Bet of the Week! (in Spreads tab)

---

## Bet of the Week Record

**Current**: 1-0-0 (100%)
- Week 9: Rams -14 ✅ WIN
- Week 10: Seahawks -6.5 (pending)

This is tracked in the header:
```
┌─────────────────────────┐  ┌──────────────────────────┐
│ BET OF THE WEEK         │  │ OVERALL RECORD           │
│ 1-0-0                   │  │ 3-2-0                    │
│ Win Rate: 100.0%        │  │ Win Rate: 60.0%          │
└─────────────────────────┘  └──────────────────────────┘
```

---

## How It Works

### Identification Logic

For each week, the #1 pick is determined by:
1. Filter to `recommended_bet != 'none'`
2. Group by `week_number`
3. Take the highest `confidence_score` from each week

### Visual Application

**Spreads Tab:**
- First card (index === 0) gets gold styling
- This is automatically the highest confidence pick

**Results Tab:**
- Fetches top pick game_ids from `/api/top-picks`
- Compares each result's game_id
- If match found → apply gold styling

---

## Example: Week 9 Results Tab

When viewing Week 9 results, you'll see:

1. **Rams vs Saints** (⭐ GOLD BORDER) - Bet of the Week
2. Colts vs Steelers (regular border)
3. Titans vs Chargers (regular border)
4. Commanders vs Seahawks (regular border)
5. Patriots vs Falcons (regular border)

Only the Rams game has the gold highlighting because it was the #1 pick (86% confidence).

---

## Status: ✅ Complete

Gold highlighting is now consistent across:
- ✅ Spreads tab (#1 pick)
- ✅ Results tab (top pick from each week)
- ✅ Same visual design (gold border, gold banner, gold badge)
- ✅ Correct record tracking (1-0-0 for Bet of Week, 3-2-0 for Overall)

**Last Updated**: November 8, 2025  
**Feature**: Bet of the Week visual highlighting

