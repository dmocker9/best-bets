# 🎲 NFL Over/Under Totals Prediction Model

## Overview

An advanced NFL game totals prediction system that analyzes offensive/defensive matchups, SRS ratings, point differentials, and team competitiveness to predict whether games will go OVER or UNDER the Vegas total.

---

## Key Features

✅ **Data-Driven**: Uses real team statistics from `auto_nfl_team_stats`  
✅ **Advanced Metrics**: Incorporates SRS (Simple Rating System) adjustments  
✅ **Matchup Analysis**: Evaluates offensive vs defensive strengths  
✅ **Pace Detection**: Identifies high-scoring vs low-scoring game environments  
✅ **Competitiveness Factor**: Adjusts for competitive games vs mismatches  
✅ **Transparent**: Shows detailed breakdown of all prediction factors  

---

## Model Methodology

### Prediction Factors (Weighted System)

| Factor | Weight | Description |
|--------|--------|-------------|
| **Base Scoring** | 30% | Team PPG averages (foundation) |
| **Offensive Matchup** | 20% | Offense vs Defense SRS matchup |
| **Defensive Matchup** | 20% | Combined defensive quality |
| **Pace Differential** | 15% | Point differential indicator |
| **Competitiveness** | 10% | Win percentage matchup impact |
| **SRS Adjustment** | 5% | Fine-tuning with overall SRS |

### 1. Base Total Calculation

The foundation uses simple scoring averages:

```typescript
Home Expected Score = (Home PPG + Away PA/G) / 2
Away Expected Score = (Away PPG + Home PA/G) / 2
Base Total = Home Expected + Away Expected
```

**Example:**
- Colts: 32.2 PPG, 20.1 PA/G
- Falcons: 25.8 PPG, 22.3 PA/G

```
Home Score = (32.2 + 22.3) / 2 = 27.25
Away Score = (25.8 + 20.1) / 2 = 22.95
Base Total = 50.2 points
```

### 2. Offensive Matchup Adjustment

Evaluates offensive strength vs defensive strength using SRS:

```typescript
Home Offensive Edge = Home OSRS - Away DSRS
Away Offensive Edge = Away OSRS - Home DSRS
Adjustment = (Home Edge + Away Edge) / 4
```

**Interpretation:**
- **Strong offense vs weak defense** → Positive adjustment (more points)
- **Strong offense vs strong defense** → Negative adjustment (fewer points)

**Example:**
- Colts: OSRS = 9.4, DSRS = 0.8
- Falcons: OSRS = 3.2, DSRS = -2.1

```
Home Edge = 9.4 - (-2.1) = 11.5
Away Edge = 3.2 - 0.8 = 2.4
Adjustment = (11.5 + 2.4) / 4 = +3.5 points
```

### 3. Defensive Matchup Adjustment

Two strong defenses reduce scoring:

```typescript
Avg Defensive Strength = (Home DSRS + Away DSRS) / 2
Adjustment = -Avg Defensive Strength * 0.5
```

**Example:**
- Rams DSRS: 8.2, Seahawks DSRS: 4.2
- Avg = (8.2 + 4.2) / 2 = 6.2
- Adjustment = -6.2 * 0.5 = **-3.1 points** (strong defenses limit scoring)

### 4. Pace/Point Differential Adjustment

Teams with large point differentials tend to be in high-scoring games:

```typescript
Team Margin = Point Differential / Games Played
Avg Absolute Margin = (|Home Margin| + |Away Margin|) / 2
Adjustment = (Avg Absolute Margin / 5) * 1.0
```

**Reasoning:**
- Teams with +100 differential are explosive offenses
- Games involving these teams tend to have more scoring
- Each 5 points of margin adds ~1 point to total

**Example:**
- Colts: +109 differential / 9 games = +12.1 margin
- Falcons: +38 differential / 9 games = +4.2 margin
- Avg = (12.1 + 4.2) / 2 = 8.15
- Adjustment = (8.15 / 5) * 1.0 = **+1.6 points**

### 5. Competitiveness Adjustment

**Key Insight:** Evenly matched teams play conservatively (UNDER), mismatches allow favorites to run up score (OVER)

```typescript
Win% Difference = |Home Win% - Away Win%|

If difference < 0.200:  Adjustment = -2.5  (conservative game)
If difference < 0.400:  Adjustment = -1.0  (moderate)
If difference > 0.400:  Adjustment = (diff - 0.400) * 10  (blowout potential)
```

**Examples:**
- Vikings (.625) vs Ravens (.625) → Difference: 0.000 → **-2.5 points** (defensive battle)
- Chiefs (.556) vs Raiders (.222) → Difference: 0.334 → **-1.0 points** (moderate)
- Rams (.750) vs Panthers (.250) → Difference: 0.500 → **+1.0 points** (potential blowout)

### 6. SRS Fine-Tuning

Overall team quality affects game flow:

```typescript
Combined SRS = Home SRS + Away SRS
Adjustment = Combined SRS / 5
```

**Reasoning:**
- Two elite teams (high SRS) → efficient, quality scoring
- Two poor teams (low SRS) → sloppy, lower scoring

**Example:**
- Rams SRS: 11.8, Seahawks SRS: 11.2
- Combined = 23.0
- Adjustment = 23.0 / 5 = **+4.6 points**

---

## Confidence Calculation

Model confidence (0-100%) based on three factors:

### 1. Data Quality (40% weight)
- Complete SRS data = 100%
- Missing data = 60%

### 2. Sample Size (30% weight)
- 8+ games played = 100%
- Fewer games = lower confidence
- Formula: `(games_played / 8) * 100`

### 3. Team Consistency (30% weight)
- Teams with moderate margins are predictable
- Extreme blowouts or nail-biters reduce confidence
- Formula: `100 - min(100, |margin_of_victory| * 3)`

**Example:**
```
Colts: 9 games, SRS complete, 12.1 margin
- Data Quality: 100%
- Sample Size: (9/8) * 100 = 100% (capped)
- Consistency: 100 - (12.1 * 3) = 63.7%
- Overall: (100 * 0.4) + (100 * 0.3) + (63.7 * 0.3) = 89.1%
```

---

## Recommendation Logic

### Thresholds

| Threshold | Value | Reasoning |
|-----------|-------|-----------|
| **Min Value** | 3.0 points | Need meaningful edge |
| **Min Confidence** | 60% | Data quality requirement |
| **Max Difference** | 10 points | Flag potential model errors |

### Decision Tree

```
IF value_score >= 3.0 AND confidence >= 60% AND value_score <= 10:
    IF predicted_total > vegas_total:
        RECOMMEND: OVER
    ELSE:
        RECOMMEND: UNDER
ELSE IF value_score > 10:
    PASS (model likely wrong)
ELSE:
    PASS (insufficient edge)
```

---

## Real-World Example

### Game: Colts vs Falcons (Week 10, 2025)

**Vegas Total: 48.5**

#### Step 1: Base Total
```
Colts: 32.2 PPG, 20.1 PA/G
Falcons: 25.8 PPG, 22.3 PA/G

Home Score = (32.2 + 22.3) / 2 = 27.25
Away Score = (25.8 + 20.1) / 2 = 22.95
Base Total = 50.2
```

#### Step 2: Offensive Matchup
```
Colts OSRS: 9.4, Falcons DSRS: -2.1
Falcons OSRS: 3.2, Colts DSRS: 0.8

Home Edge = 9.4 - (-2.1) = 11.5
Away Edge = 3.2 - 0.8 = 2.4
Adjustment = (11.5 + 2.4) / 4 = +3.5
```

#### Step 3: Defensive Matchup
```
Avg Defense = (0.8 + (-2.1)) / 2 = -0.65
Adjustment = -(-0.65) * 0.5 = +0.3 (weak defenses)
```

#### Step 4: Pace
```
Colts: +109 / 9 = +12.1 margin
Falcons: +38 / 9 = +4.2 margin
Avg = 8.15
Adjustment = (8.15 / 5) = +1.6
```

#### Step 5: Competitiveness
```
Colts: .778 win%, Falcons: .625 win%
Difference = 0.153
Adjustment = -2.5 (competitive game → conservative)
```

#### Step 6: SRS
```
Colts SRS: 10.2, Falcons SRS: 5.8
Combined = 16.0
Adjustment = 16.0 / 5 = +3.2
```

#### Final Prediction
```
Predicted Total = 
  (50.2 * 0.30) +     // Base: 15.06
  (53.7 * 0.20) +     // Offensive: 10.74
  (50.5 * 0.20) +     // Defensive: 10.10
  (51.8 * 0.15) +     // Pace: 7.77
  (47.7 * 0.10) +     // Competitive: 4.77
  (53.4 * 0.05)       // SRS: 2.67
  = 51.1 points

Vegas: 48.5
Difference: +2.6
Value Score: 2.6
Confidence: 72%

RECOMMENDATION: PASS (value < 3.0 threshold)
```

If the difference was 3.2 points instead:
**RECOMMENDATION: OVER 48.5** ✅

---

## API Usage

### 1. Generate Predictions

```bash
# Generate predictions for Week 10
curl http://localhost:3000/api/generate-totals-predictions?week=10&season=2025
```

**Response:**
```json
{
  "success": true,
  "message": "Generated totals predictions for 14 games. Saved 14, failed 0.",
  "total": 14,
  "saved": 14,
  "failed": 0,
  "week": 10,
  "season": 2025
}
```

### 2. Get Best Bets

```bash
# Get top 5 Over/Under recommendations
curl http://localhost:3000/api/best-totals-bets?limit=5&week=10
```

**Response:**
```json
{
  "success": true,
  "message": "Found 3 recommended Over/Under bets",
  "predictions": [
    {
      "id": "abc123",
      "home_team": "Indianapolis Colts",
      "away_team": "Atlanta Falcons",
      "commence_time": "2025-11-09T14:30:00Z",
      "predicted_total": 53.2,
      "vegas_total": 48.5,
      "value_score": 4.7,
      "recommended_bet": "OVER",
      "confidence_score": 72.5,
      "reasoning": "HIGH CONFIDENCE (73%): Model predicts 53.2 points, Vegas line: 48.5. Expect 4.7 more points. Strong offensive matchups favor scoring.",
      "breakdown": {
        "base_total": 50.2,
        "offensive_matchup_adjustment": 3.5,
        "defensive_matchup_adjustment": 0.3,
        "pace_adjustment": 1.6,
        "competitiveness_adjustment": -2.5,
        "srs_adjustment": 3.2
      }
    }
  ]
}
```

---

## Using the UI Component

Add to your page:

```tsx
import { TotalsBetsDisplay } from '@/components/TotalsBetsDisplay';

export default function Page() {
  return (
    <div className="container mx-auto p-6">
      <TotalsBetsDisplay />
    </div>
  );
}
```

**Features:**
- ✅ Auto-refresh predictions
- ✅ Generate new predictions with one click
- ✅ View detailed breakdowns
- ✅ Color-coded confidence levels
- ✅ Clear OVER/UNDER recommendations

---

## Model Validation & Tuning

### Backtesting (Recommended)

To validate the model:

1. **Collect historical data** (past 3-5 seasons)
2. **Run predictions retroactively**
3. **Compare to actual results**
4. **Calculate accuracy metrics:**
   - Overall accuracy (% correct)
   - ROI (return on investment)
   - Units won/lost
   - Accuracy by confidence tier

### Weight Tuning

Current weights are based on NFL totals betting theory. Adjust in `predictTotals.ts`:

```typescript
const TOTALS_WEIGHTS = {
  base_scoring: 0.30,          // Foundational
  offensive_matchup: 0.20,     // Very important
  defensive_matchup: 0.20,     // Very important
  pace_differential: 0.15,     // Moderately important
  competitiveness: 0.10,       // Important insight
  srs_adjustment: 0.05,        // Fine-tuning
};
```

**Tuning Tips:**
- Increase `offensive_matchup` if model undervalues explosive offenses
- Increase `defensive_matchup` if model misses defensive battles
- Increase `competitiveness` if missing tight game patterns

---

## Limitations & Disclaimers

### Current Limitations

1. **No weather data** - Rain, wind, snow significantly impact totals
2. **No injury updates** - Key player injuries not factored
3. **No game script** - Doesn't predict specific game flow
4. **No line movement tracking** - Doesn't see where sharp money is going
5. **No stadium factors** - Dome vs outdoor, altitude, etc.
6. **No referee tendencies** - Some refs call more penalties

### Important Disclaimers

⚠️ **This is a statistical model for educational/research purposes**

- Not backtested on historical data
- Should not be used for actual betting without thorough validation
- Weather and injuries can dramatically change game totals
- Past performance does not guarantee future results
- Always gamble responsibly

---

## Future Enhancements

### Phase 1: Data Improvements
- [ ] Integrate weather API (wind speed, precipitation)
- [ ] Add injury tracking automation
- [ ] Include stadium/dome factor
- [ ] Track referee tendencies
- [ ] Monitor line movement

### Phase 2: Model Improvements
- [ ] Machine learning model (XGBoost, Random Forest)
- [ ] Backtest against 3-5 seasons of historical data
- [ ] Track model performance weekly
- [ ] Auto-adjust weights based on accuracy
- [ ] Ensemble predictions (combine multiple models)

### Phase 3: Advanced Features
- [ ] First half totals predictions
- [ ] Team totals (individual team over/under)
- [ ] Live in-game total updates
- [ ] Alternate totals value finder
- [ ] Steam move detection

---

## Database Schema

### `totals_predictions` Table

```sql
CREATE TABLE totals_predictions (
    id UUID PRIMARY KEY,
    game_id TEXT NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    commence_time TIMESTAMPTZ NOT NULL,
    
    predicted_total DECIMAL(5,1) NOT NULL,
    confidence_score DECIMAL(5,2) CHECK (0-100),
    
    vegas_total DECIMAL(5,1) NOT NULL,
    over_price INTEGER,
    under_price INTEGER,
    
    value_score DECIMAL(5,2),
    recommended_bet TEXT CHECK ('OVER', 'UNDER'),
    reasoning TEXT,
    breakdown JSONB,
    
    week_number INTEGER NOT NULL,
    season INTEGER NOT NULL,
    
    UNIQUE(game_id, week_number, season)
);
```

---

## Troubleshooting

### No predictions generated

**Check:**
1. `auto_nfl_team_stats` has data for current week
2. `totals_odds` has games for current week
3. Team names match exactly between tables

**Solution:**
```bash
# Sync team stats first
curl http://localhost:3000/api/sync-nfl-stats?week=10

# Then generate predictions
curl http://localhost:3000/api/generate-totals-predictions?week=10
```

### Low confidence scores

**Possible causes:**
- Early in season (< 8 games)
- Incomplete SRS data
- Teams with high variance (inconsistent margins)

**Solution:**
- Wait for more games (confidence improves)
- Manually review high-variance teams
- Adjust confidence thresholds

### Model way off from Vegas

**When predicted > Vegas by 10+ points:**
- Model likely missing key information
- Check for injuries, weather, other factors
- PASS on these games

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/predictTotals.ts` | Core totals prediction algorithm |
| `src/app/api/generate-totals-predictions/route.ts` | Generate predictions endpoint |
| `src/app/api/best-totals-bets/route.ts` | Fetch best bets endpoint |
| `src/components/TotalsBetsDisplay.tsx` | React UI component |
| `supabase/migrations/20251109_create_totals_predictions_table.sql` | Database schema |

---

## Conclusion

This Over/Under prediction model uses advanced statistical analysis to identify value in NFL game totals. The weighted system considers offensive/defensive matchups, pace, competitiveness, and SRS adjustments to predict whether games will exceed or fall short of Vegas totals.

**Key Strengths:**
✅ Data-driven approach using real statistics  
✅ Transparent breakdown of all factors  
✅ Confidence scoring for bet selection  
✅ Considers multiple dimensions (offense, defense, pace, etc.)  

**Remember:** Always do your own research, consider external factors (weather, injuries), and bet responsibly! 🎲

---

**Generated:** November 9, 2025  
**Version:** 1.0.0  
**Status:** ✅ Complete and Ready for Testing

