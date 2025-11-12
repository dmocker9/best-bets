# 🎯 Spread Prediction Model - Current Parameters

## Core Model Settings

### SRS Dampening
```typescript
SRS_DAMPENING = 0.70  // More conservative (was 0.85)
```
**What it does:** Converts SRS differential to predicted spread  
**Why 0.70:** Prevents extreme spreads, better aligns with Vegas lines  
**Impact:** 18.5 SRS gap → 12.95 point spread (instead of 15.72)

### Home Field Advantage
```typescript
HOME_FIELD_ADVANTAGE = 1.5 points  // Reduced from 2.5
```
**What it does:** Automatic boost for home team  
**Why 1.5:** More conservative than traditional 2.5-3.0 estimates  
**Impact:** Home teams get smaller automatic advantage

### Division Game Dampening
```typescript
DIVISION_GAME_DAMPENING = 0.90  // 10% reduction
```
**What it does:** Reduces predicted spreads for divisional rivals  
**Why 0.90:** Division games are historically closer than stats suggest  
**Impact:** 13 point spread → 11.7 points for division games

---

## Injury Impact Parameters

### Position Weights
```typescript
const POSITION_WEIGHTS = {
  // Tier 1: Critical
  "QB": 1.0,
  "LT": 0.6,  "RT": 0.6,
  "EDGE": 0.6, "DE": 0.6,
  "CB": 0.6,
  
  // Tier 2: High Impact
  "WR": 0.4,  "RB": 0.4,
  "LB": 0.4,  "S": 0.4,
  
  // Tier 3: Medium Impact
  "TE": 0.3,  "DL": 0.3,
  
  // Tier 4: Lower Impact
  "OL": 0.25, "G": 0.2,  "C": 0.3,
  "K": 0.05,  "P": 0.05
}
```

### Injury Scaling
```typescript
OFFENSIVE_SCALE = 12   // Points of impact needed for 100% penalty
DEFENSIVE_SCALE = 10   // Points of impact needed for 100% penalty
```

**Formula:**
```typescript
impact = position_weight × (snap_percentage / 100)
penalty = (total_impact / scale) × 100
adjusted_score = base_score × (100 - penalty) / 100
```

**Example (QB out at 98% snaps):**
```
impact = 1.0 × 0.98 = 0.98
penalty = (0.98 / 12) × 100 = 8.2%
→ Offense reduced by 8.2%
```

---

## Prediction Weights

### Team Score Calculation
```typescript
PREDICTION_WEIGHTS = {
  offensive_strength: 0.25,   // 25%
  defensive_strength: 0.25,   // 25%
  turnover_margin: 0.15,      // 15%
  recent_form: 0.15,          // 15%
  home_field_advantage: 0.10, // 10%
  injury_impact: 0.10,        // 10%
}
```

### Component Formulas

**Offensive Score (0-100):**
```typescript
ppgScore = (points_per_game / 35) × 100        // 70% weight
srsScore = ((offensive_srs + 10) / 20) × 100   // 30% weight
offensiveScore = (ppgScore × 0.7) + (srsScore × 0.3)
```

**Defensive Score (0-100):**
```typescript
paScore = ((30 - points_allowed_per_game) / 15) × 100  // 60% weight
ypdScore = ((6.5 - yards_per_play) / 2.5) × 100        // 40% weight (if available)
defensiveScore = (paScore × 0.6) + (ypdScore × 0.4)
// OR paScore alone if YPP not available
```

**Turnover Score (0-100):**
```typescript
if (turnover_differential exists) {
  return ((turnover_diff + 15) / 30) × 100
} else {
  return 50  // Neutral
}
```

**Recent Form Score (0-100):**
```typescript
// Enhanced scoring with recency weighting
// Base scores: 3W=80, 2W=55, 1W=35, 0W=20
// Recency weights: Oldest (25%), Middle (35%), Most recent (40%)
// Format: "W-W-L" where last = most recent

baseScore = { 3W: 80, 2W: 55, 1W: 35, 0W: 20 }
recencyScore = (game1 × 0.25) + (game2 × 0.35) + (game3 × 0.40)
recentFormScore = (baseScore × 0.60) + (recencyScore × 0.40)

// Examples:
// W-W-W = 88 (hot streak)
// L-W-W = 63 (building momentum, won last 2)
// W-W-L = 57 (cooling off, lost last game)
// L-L-L = 20 (cold streak)
```

**Home Field Score (0-100):**
```typescript
// If home record available: use win %
// Otherwise: 57 + (overall_win_pct - 50) × 0.5
```

---

## Confidence Calculation

```typescript
confidence = 
  (strengthConfidence × 0.50) +   // Team quality gap
  (consistencyScore × 0.30) +     // Predictability
  (recordQualityScore × 0.20)     // Win% vs SOS
```

### Strength Gap
```typescript
strengthGap = |homeTeamScore - awayTeamScore|
strengthConfidence = min(100, (strengthGap / 20) × 100)
```

### Consistency
```typescript
// Teams with moderate margins are more predictable
consistency = 100 - min(100, |margin_of_victory| × 2)
```

### Record Quality
```typescript
recordQuality = win_percentage × 100 × (1 + strength_of_schedule/10)
```

---

## Bet Recommendation Thresholds

### Value Range
```typescript
REALISTIC_EDGE_MIN = 2.5 points
REALISTIC_EDGE_MAX = 7.5 points
CONFIDENCE_THRESHOLD = 65%
```

### Recommendation Logic
```typescript
if (edge >= 2.5 && edge <= 7.5 && confidence >= 65%) {
  // Recommend spread bet on side with value
  RECOMMENDED
} else if (edge > 7.5) {
  // Too large - likely model error
  PASS - "Large gaps indicate model error"
} else {
  // Insufficient edge or confidence
  PASS - "Edge insufficient or confidence below threshold"
}
```

### Moneyline Threshold
```typescript
if (confidence >= 85% && 
    abs(current_spread) <= 2.0 && 
    abs(predicted_margin) >= 5) {
  // Close spread but model very confident
  Recommend MONEYLINE instead of spread
}
```

---

## Data Requirements

### Required for Predictions:
- ✅ `auto_nfl_team_stats` - Team season statistics
- ✅ `odds_bets` - Current betting lines
- ✅ `injuries` - Player injury status
- ✅ `snap_counts` - Player usage percentages

### Optional (Enhances Predictions):
- ✅ `team_defense_stats` - Real defensive YPP data
- ✅ `team_recent_games` - Recent form patterns

### Not Used (Returns Neutral):
- Turnover differential (if not in database)
- Home/away splits (if not in database)

---

## Example Calculation: Texans -7.5

### Input Data:
```
Texans: +9.50 SRS, 21.0 PPG, 15.13 PA, Elite defense
Titans: -9.00 SRS, 14.44 PPG, 28.56 PA, Terrible
C.J. Stroud (QB): OUT, 77.6% snaps
```

### Calculation:
```
1. SRS Gap: 18.5 × 0.70 = 12.95
2. Home: +1.5 = 14.45
3. Division: ×0.90 = 13.0
4. Injury: Already in team scores (-6.16 from offensive)
5. Final: Texans -13.0

Vegas: -7.5
Edge: 5.5 points
Confidence: 81%
→ STRONG BET on Texans -7.5
```

---

## 🎚️ Tuning Guide

### To Make Spreads MORE Conservative:
```typescript
SRS_DAMPENING = 0.60  // Even more dampening
HOME_FIELD_ADVANTAGE = 1.0  // Smaller HFA
```

### To Make Injuries MORE Impactful:
```typescript
OFFENSIVE_SCALE = 8   // QB loss = 12% penalty instead of 8%
DEFENSIVE_SCALE = 7   // Defensive injuries matter more
```

### To Be More Selective with Bets:
```typescript
REALISTIC_EDGE_MIN = 3.5  // Need bigger edge
CONFIDENCE_THRESHOLD = 70%  // Need higher confidence
```

---

## 📚 Related Documentation

- `INJURY_INTEGRATION_GUIDE.md` - Injury system details
- `DATA_SOURCES_SUMMARY.md` - What data is used
- `MODEL_UPDATES_SUMMARY.md` - Recent changes

---

**Current Settings:** Conservative dampening (0.70), reduced HFA (1.5), real data only, injury-integrated ✅

