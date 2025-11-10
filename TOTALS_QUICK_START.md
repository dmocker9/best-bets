# 🚀 Quick Start: NFL Over/Under Predictions

## Prerequisites

✅ Supabase project configured  
✅ `auto_nfl_team_stats` table populated  
✅ `totals_odds` table populated  
✅ Environment variables set  

---

## Step 1: Generate Predictions

Run predictions for the current week:

```bash
# For Week 10, 2025 season
curl http://localhost:3000/api/generate-totals-predictions?week=10&season=2025
```

**Expected Output:**
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

---

## Step 2: View Best Bets

Fetch top Over/Under recommendations:

```bash
# Get top 5 bets
curl http://localhost:3000/api/best-totals-bets?limit=5&week=10
```

**Sample Response:**
```json
{
  "success": true,
  "message": "Found 3 recommended Over/Under bets",
  "predictions": [
    {
      "home_team": "Indianapolis Colts",
      "away_team": "Atlanta Falcons",
      "predicted_total": 53.2,
      "vegas_total": 48.5,
      "value_score": 4.7,
      "recommended_bet": "OVER",
      "confidence_score": 72.5,
      "reasoning": "HIGH CONFIDENCE (73%): Model predicts 53.2 points..."
    }
  ]
}
```

---

## Step 3: Use the UI Component

Add to your Next.js page:

```tsx
import { TotalsBetsDisplay } from '@/components/TotalsBetsDisplay';

export default function TotalsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">NFL Over/Under Predictions</h1>
      <TotalsBetsDisplay />
    </div>
  );
}
```

---

## Understanding the Predictions

### Value Score
- **Higher = Better**: Absolute difference between model and Vegas
- **3+ points**: Meets minimum threshold for recommendation
- **Example**: Model 53.2, Vegas 48.5 → Value = 4.7 points

### Confidence Score
- **75-100%**: High confidence (complete data, consistent teams)
- **65-74%**: Good confidence (solid data quality)
- **55-64%**: Moderate confidence (some uncertainty)
- **< 55%**: Low confidence (early season, high variance)

### Recommended Bet
- **OVER**: Model predicts more points than Vegas total
- **UNDER**: Model predicts fewer points than Vegas total
- **null**: No recommendation (insufficient edge or confidence)

---

## Model Factors

The model considers 6 key factors:

1. **Base Scoring (30%)**: Team PPG averages
2. **Offensive Matchup (20%)**: Offense vs Defense SRS
3. **Defensive Matchup (20%)**: Combined defensive strength
4. **Pace Differential (15%)**: Point differential patterns
5. **Competitiveness (10%)**: Win% matchup impact
6. **SRS Adjustment (5%)**: Overall team quality

---

## Breakdown Example

```json
{
  "breakdown": {
    "base_total": 50.2,
    "offensive_matchup_adjustment": 3.5,
    "defensive_matchup_adjustment": 0.3,
    "pace_adjustment": 1.6,
    "competitiveness_adjustment": -2.5,
    "srs_adjustment": 3.2
  }
}
```

**Reading the breakdown:**
- **Positive values** (+) → More points expected
- **Negative values** (-) → Fewer points expected
- **Base total**: Foundation from team averages
- **Adjustments**: How each factor modifies the base

---

## Common Scenarios

### High-Scoring Game Indicators
✅ Strong offenses vs weak defenses (+offensive matchup)  
✅ Both teams have high point differentials (+pace)  
✅ Mismatch in win% (blowout potential) (+competitiveness)  
✅ Both elite teams (+SRS)  

**Example:**
```
Colts (32 PPG, +109 diff) vs Falcons (26 PPG, +38 diff)
→ OVER recommendation likely
```

### Low-Scoring Game Indicators
✅ Strong defenses on both sides (-defensive matchup)  
✅ Evenly matched teams (-competitiveness)  
✅ Both teams below league average (-SRS)  
✅ Low point differentials (-pace)  

**Example:**
```
Ravens (19 PA/G, DSRS: 9.8) vs Patriots (18 PA/G, DSRS: 8.5)
→ UNDER recommendation likely
```

---

## Testing the Model

### 1. Check Database

```sql
-- Verify predictions were saved
SELECT 
  home_team,
  away_team,
  predicted_total,
  vegas_total,
  recommended_bet,
  confidence_score,
  value_score
FROM totals_predictions
WHERE week_number = 10
ORDER BY value_score DESC;
```

### 2. Test API Endpoints

```bash
# Test generation
curl -X POST http://localhost:3000/api/generate-totals-predictions?week=10

# Test fetching
curl http://localhost:3000/api/best-totals-bets?limit=10
```

### 3. Verify Data Sources

```sql
-- Check team stats are current
SELECT team_name, week, points_per_game, srs
FROM auto_nfl_team_stats
WHERE week = 10;

-- Check totals odds are loaded
SELECT home_team, away_team, over_line, week
FROM totals_odds
WHERE week = 10;
```

---

## Troubleshooting

### ❌ "Missing stats for [Team] vs [Team]"

**Problem**: Team not found in `auto_nfl_team_stats`

**Solution:**
```bash
# Sync team stats
curl http://localhost:3000/api/sync-nfl-stats?week=10
```

### ❌ "No upcoming games found"

**Problem**: No games in `totals_odds` for specified week

**Solution:**
```bash
# Sync totals odds first
curl http://localhost:3000/api/sync-totals-odds?week=10
```

### ❌ "Low confidence scores"

**Problem**: Early in season or incomplete data

**Solution:**
- Wait for more games (8+ is ideal)
- Check SRS values are populated
- Review team consistency

---

## Interpreting Results

### Strong Recommendations

**OVER 48.5 (72% confidence, 4.7 value)**
- ✅ Meaningful edge (4.7 points)
- ✅ High confidence (72%)
- ✅ Model significantly higher than Vegas
- **Action**: Consider betting OVER

### Weak Recommendations

**UNDER 46.5 (58% confidence, 2.1 value)**
- ⚠️ Low edge (2.1 points < 3.0 threshold)
- ⚠️ Moderate confidence (58%)
- **Action**: PASS or bet small if you have additional info

### No Recommendation

**Model: 47.3, Vegas: 46.5**
- ❌ Insufficient edge (0.8 points)
- ❌ Model and Vegas agree closely
- **Action**: PASS

---

## Best Practices

### ✅ DO:
1. **Generate fresh predictions** before each week
2. **Check confidence scores** (prefer 65%+)
3. **Look for 3+ point edges** (minimum threshold)
4. **Review breakdown details** for context
5. **Consider external factors** (weather, injuries)
6. **Track results** to validate model accuracy

### ❌ DON'T:
1. **Blindly follow all recommendations** (filter by confidence)
2. **Ignore large model deviations** (10+ points = likely error)
3. **Bet on early season games** (insufficient data)
4. **Forget about weather** (major factor not in model)
5. **Ignore injury news** (can drastically change totals)
6. **Bet more than you can afford** (gamble responsibly)

---

## Performance Tracking

Track your bets in a spreadsheet:

| Date | Game | Bet | Total | Result | Profit/Loss | Notes |
|------|------|-----|-------|--------|-------------|-------|
| 11/9 | IND vs ATL | OVER 48.5 | 52 | WIN | +$100 | Model was right |
| 11/9 | MIA vs BUF | UNDER 50.5 | 54 | LOSS | -$110 | High wind factor |

**Key Metrics:**
- **Win Rate**: Wins / Total Bets
- **ROI**: (Profit / Total Wagered) * 100
- **Units**: Net units won/lost
- **By Confidence Tier**: Track 75%+, 65-74%, etc.

---

## Next Steps

1. ✅ **Generate predictions** for current week
2. ✅ **Review recommendations** with 65%+ confidence
3. ✅ **Check external factors** (weather, injuries, line movement)
4. ✅ **Place selective bets** on highest value scores
5. ✅ **Track results** to validate model accuracy
6. ✅ **Adjust strategy** based on performance

---

## Advanced Usage

### Filtering by Confidence

```bash
# Get only high confidence bets
curl http://localhost:3000/api/best-totals-bets?limit=20 | \
  jq '.predictions[] | select(.confidence_score >= 70)'
```

### Filtering by Value

```bash
# Get only 4+ point edges
curl http://localhost:3000/api/best-totals-bets?limit=20 | \
  jq '.predictions[] | select(.value_score >= 4.0)'
```

### Custom Week Ranges

```typescript
// Get predictions for multiple weeks
const weeks = [10, 11, 12];
const allPredictions = await Promise.all(
  weeks.map(week => 
    fetch(`/api/best-totals-bets?week=${week}&limit=5`)
      .then(r => r.json())
  )
);
```

---

## Support

**Documentation:**
- See `TOTALS_PREDICTION_MODEL.md` for detailed methodology
- See `TOTALS_ODDS_SETUP.md` for odds sync setup

**Questions?**
- Check model breakdown in UI for transparency
- Review confidence factors if predictions seem off
- Validate data in `auto_nfl_team_stats` and `totals_odds` tables

---

**Remember**: This is a statistical tool to inform decisions, not a guarantee. Always bet responsibly! 🎲

---

**Created:** November 9, 2025  
**Version:** 1.0.0

