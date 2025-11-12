# 📊 Recent Form Scoring System

## Overview
The recent form score (0-100) now uses a sophisticated multi-factor approach instead of simple win counting.

## 🎯 Base Scores (from W/L Record)

More nuanced than the old 0-100 linear scale:

| Record | Base Score | Reasoning |
|--------|------------|-----------|
| 3-0 | 80% | Perfect, but leave room for quality adjustment |
| 2-1 | 55% | Positive momentum, slightly above average |
| 1-2 | 35% | Struggling, below average but not hopeless |
| 0-3 | 20% | Bad streak, but even losing teams have value |

**Why not 0-100?**
- Even 0-3 teams can show improvement (20 baseline)
- Even 3-0 teams might have hollow wins (80 ceiling)
- Leaves room for quality adjustments to push scores higher/lower

---

## ⏱️ Recency Weighting

Most recent games matter more than older games.

**Format:** `"W-W-L"` where last = most recent

### Weights Applied:
```typescript
Game 1 (oldest):       25% weight
Game 2 (middle):       35% weight  
Game 3 (most recent):  40% weight
```

### Examples:

**W-W-L (2-1 record, cooling off)**
```
Base score: 55
Recency score: (100 × 0.25) + (100 × 0.35) + (0 × 0.40) = 60
Blended: (55 × 0.60) + (60 × 0.40) = 33 + 24 = 57
```

**L-W-W (2-1 record, heating up)**
```
Base score: 55
Recency score: (0 × 0.25) + (100 × 0.35) + (100 × 0.40) = 75
Blended: (55 × 0.60) + (75 × 0.40) = 33 + 30 = 63
```

**Result:** W-W-L = 57, L-W-W = 63 (6 point difference for same record!)

---

## 🔢 Blending Formula

```typescript
finalScore = (baseScore × 0.60) + (recencyWeightedScore × 0.40)
```

- **60%** from base W/L record (overall trend)
- **40%** from recency-weighted performance (momentum)

This ensures total wins still matter most, but recent performance has significant impact.

---

## 📈 Scoring Examples

### Example 1: Hot Streak
```
Record: W-W-W (3-0)
Base: 80
Recency: (100×0.25) + (100×0.35) + (100×0.40) = 100
Final: (80×0.60) + (100×0.40) = 48 + 40 = 88
```
**Result:** 88/100 - Elite recent form

### Example 2: Heating Up
```
Record: L-L-W (1-2, won last game)
Base: 35
Recency: (0×0.25) + (0×0.35) + (100×0.40) = 40
Final: (35×0.60) + (40×0.40) = 21 + 16 = 37
```
**Result:** 37/100 - Weak record but showing recent life

### Example 3: Cooling Off
```
Record: W-W-L (2-1, lost last game)
Base: 55
Recency: (100×0.25) + (100×0.35) + (0×0.40) = 60
Final: (55×0.60) + (60×0.40) = 33 + 24 = 57
```
**Result:** 57/100 - Decent record but losing momentum

### Example 4: Building Momentum
```
Record: L-W-W (2-1, won last 2 games)
Base: 55
Recency: (0×0.25) + (100×0.35) + (100×0.40) = 75
Final: (55×0.60) + (75×0.40) = 33 + 30 = 63
```
**Result:** 63/100 - Good form, building momentum

---

## 🚀 Future Enhancements (TODO)

### Margin Adjustment (+/- 10 points)
Will analyze victory/loss margins once game score data is available:

- **Blowout wins** (>14 pts): +5 to +10 points
- **Close losses** (<7 pts): +3 to +5 points
- **Blowout losses** (>21 pts): -5 to -10 points

**Example:**
- W-W-W with all blowouts: 88 + 10 = **98/100** (dominant)
- W-W-W with all nail-biters: 88 + 0 = **88/100** (lucky)

### Opponent Quality (+/- 10 points)
Will factor in opponent strength once integrated:

- **Wins vs top teams** (SRS > +5): +5 to +10 points
- **Losses to bad teams** (SRS < -5): -5 to -10 points

**Example:**
- 2-1 with wins over playoff teams: 63 + 10 = **73/100** (quality wins)
- 2-1 with wins over bottom feeders: 63 - 5 = **58/100** (hollow wins)

---

## 📊 Impact on Predictions

Recent form has **15% weight** in overall team strength calculation.

### Spread Impact Examples:

**Example 1: Hot vs Cold**
- **Team A:** W-W-W (88 recent form)  
- **Team B:** L-L-L (20 recent form)

```
Form difference: 88 - 20 = 68 points
Impact on team strength: 68 × 0.15 = 10.2 points
Impact on spread: ~1.5-2.0 points
```

**Example 2: Momentum Matters (Same 2-1 Record)**
- **Team A:** L-W-W (63 recent form - heating up)
- **Team B:** W-W-L (57 recent form - cooling off)

```
Form difference: 63 - 57 = 6 points
Impact on team strength: 6 × 0.15 = 0.9 points
Impact on spread: ~0.5-1.0 points
```

Even with identical records, momentum can shift the spread by **0.5-1 point**!

---

## 🔧 Implementation

Location: `src/lib/predictGames.ts`  
Function: `calculateRecentFormScore()`

```typescript
// Old system (simple win counting)
W-W-W = 100, L-L-L = 0

// New system (nuanced + recency)
W-W-W = 88, L-W-W = 63, W-W-L = 57, L-L-L = 20
```

---

## 💡 Key Insights

1. **Same record ≠ Same score** - Recency matters
2. **No perfect 100s** - Leaves room for margin/quality adjustments
3. **No zero floors** - Even 0-3 teams get baseline value
4. **Momentum detection** - Recent wins weighted 40% vs oldest at 25%
5. **Balanced approach** - 60% overall record, 40% recency

This creates a more realistic assessment of team form heading into their next game!

