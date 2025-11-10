# 🎲 NFL Totals Model - Quick Reference Card

## 🚀 Quick Commands

```bash
# 1. Generate predictions for current week
curl http://localhost:3000/api/generate-totals-predictions?week=10

# 2. Get best betting opportunities
curl http://localhost:3000/api/best-totals-bets?limit=5

# 3. Check predictions in database
psql -c "SELECT home_team, away_team, recommended_bet, value_score FROM totals_predictions WHERE week_number=10 ORDER BY value_score DESC;"
```

---

## 🧠 Model Formula (Simple)

```
Predicted Total = Base Total + Adjustments

Base Total = Average of (Team PPG + Opponent PA/G)

Adjustments:
  + Strong offense vs weak defense → MORE points
  + Strong defenses on both sides → FEWER points  
  + High point differentials → MORE points
  + Evenly matched teams → FEWER points
  + Elite teams (high SRS) → MORE points
```

---

## ✅ When to Bet OVER

1. ✅ Strong offenses vs weak defenses
2. ✅ Both teams have high point differentials (+100)
3. ✅ Mismatch in records (blowout potential)
4. ✅ Both teams below-average defensively
5. ✅ Model predicted > Vegas by 3+ points
6. ✅ Confidence > 65%

**Example:** Bears (53.3) vs Vegas (46.5) → **OVER 46.5** ✅

---

## ✅ When to Bet UNDER

1. ✅ Elite defenses on both sides (DSRS > 5)
2. ✅ Evenly matched records (conservative game)
3. ✅ Division rivalry (defensive battle)
4. ✅ Both teams low point differentials
5. ✅ Model predicted < Vegas by 3+ points
6. ✅ Confidence > 65%

**Example:** 49ers vs Rams (41.4) vs Vegas (49.5) → **UNDER 49.5** ✅

---

## 🎯 Thresholds

| Metric | Threshold | Meaning |
|--------|-----------|---------|
| **Min Edge** | 3.0 points | Need meaningful value |
| **Min Confidence** | 60% | Data quality floor |
| **Max Difference** | 10 points | Flag model error |
| **Ideal Confidence** | 70%+ | Strong recommendation |
| **Elite Edge** | 5+ points | Premium value |

---

## 📊 Interpreting Results

### Value Score (Edge)
```
8+ points = 🔥 ELITE VALUE
5-7 points = 💎 STRONG VALUE
3-4 points = ✅ GOOD VALUE
< 3 points = ❌ PASS
```

### Confidence Score
```
90-100% = 🟢 HIGH (bet with confidence)
70-89% = 🔵 GOOD (solid bet)
60-69% = 🟡 MODERATE (be cautious)
< 60% = 🔴 LOW (pass)
```

### Combined Score
```
Elite Value + High Confidence = 💰 MAX BET
Strong Value + Good Confidence = 💵 STANDARD BET
Good Value + Moderate Confidence = 💸 SMALL BET
Anything Else = 🚫 PASS
```

---

## 🎨 Breakdown Indicators

### What Each Adjustment Means

| Adjustment | Positive (+) | Negative (-) |
|------------|--------------|--------------|
| **Offensive Matchup** | Good offense vs bad D | Bad offense vs good D |
| **Defensive Matchup** | Weak defenses | Strong defenses |
| **Pace** | Explosive teams | Grinding teams |
| **Competitiveness** | Mismatch (blowout) | Evenly matched |
| **SRS** | Elite teams | Below-average teams |

---

## 🔍 Pre-Bet Checklist

Before betting, check:

- [ ] **Model Edge:** 3+ points? ✅
- [ ] **Confidence:** 65%+ ? ✅
- [ ] **Weather:** Check forecast (wind > 15mph = UNDER bias)
- [ ] **Injuries:** Key players out? (QB, WR1, RB1)
- [ ] **Line Movement:** Has it moved significantly?
- [ ] **Public Action:** Where is public betting?
- [ ] **Breakdown:** Does reasoning make sense?

---

## 📈 Week 10 Top Picks

| Game | Rec | Model | Vegas | Edge | Conf |
|------|-----|-------|-------|------|------|
| 49ers-Rams | **U 49.5** | 41.4 | 49.5 | 8.1 | 95% |
| Bears-Giants | **O 46.5** | 53.3 | 46.5 | 6.8 | 97% |
| Jets-Browns | **O 37.5** | 43.0 | 37.5 | 5.5 | 94% |
| Panthers-Saints | **O 38.5** | 41.6 | 38.5 | 3.1 | 93% |

---

## 💡 Pro Tips

### 🎯 Bet Selection
1. **Prioritize:** Confidence > Edge
2. **Focus:** 70%+ confidence bets
3. **Avoid:** Early season (< 6 games)
4. **Watch:** Weather reports day-of-game

### 📊 Bankroll Management
1. **Max Bet:** 90%+ confidence, 5+ edge
2. **Standard Bet:** 70-89% confidence, 3-5 edge
3. **Small Bet:** 60-69% confidence, 3+ edge
4. **No Bet:** < 60% confidence or < 3 edge

### 🔄 Tracking
1. **Record all bets:** Date, game, pick, result
2. **Calculate ROI:** Profit / Total Wagered
3. **Track by confidence tier:** 90%+, 70-89%, etc.
4. **Adjust strategy:** Based on results

---

## ⚠️ Red Flags

Pass on these situations:

🚫 **Model > 10 points off Vegas** (likely missing info)  
🚫 **High wind forecast** (> 20 mph)  
🚫 **Starting QB out** (huge impact on totals)  
🚫 **Early season** (< 6 games played)  
🚫 **Multiple key injuries** (unpredictable)  
🚫 **Strange line movement** (sharp money knows something)  

---

## 🎮 Using the UI

### Generate Predictions
1. Click "🎯 Generate Predictions"
2. Wait ~2 seconds
3. Review recommendations

### View Details
1. Click "📊 View Detailed Breakdown"
2. See factor-by-factor adjustments
3. Understand model reasoning

### Refresh Data
1. Click "🔄 Refresh"
2. Get latest predictions
3. Check for new opportunities

---

## 📱 API Quick Reference

### Generate
```bash
GET /api/generate-totals-predictions?week=10
Response: { success, total, saved, failed }
```

### Fetch Best
```bash
GET /api/best-totals-bets?limit=5&week=10
Response: { success, predictions[] }
```

### Prediction Object
```json
{
  "predicted_total": 41.4,
  "vegas_total": 49.5,
  "value_score": 8.07,
  "recommended_bet": "UNDER",
  "confidence_score": 95.05,
  "reasoning": "...",
  "breakdown": { ... }
}
```

---

## 🧮 Mental Math Shortcuts

### Quick Edge Calculation
```
Edge = |Model - Vegas|

Model 53, Vegas 47 → Edge = 6 → OVER
Model 42, Vegas 49 → Edge = 7 → UNDER
```

### Quick Confidence Assessment
```
90%+ = Trust it (full bet)
70-90% = Solid (standard bet)
60-70% = Shaky (small bet)
< 60% = Skip (no bet)
```

### Quick Value Assessment
```
8+ edge = Elite (max bet)
5-7 edge = Strong (full bet)
3-4 edge = Good (standard bet)
< 3 edge = Pass (no value)
```

---

## 📚 Further Reading

- **Full Methodology:** `TOTALS_PREDICTION_MODEL.md`
- **Getting Started:** `TOTALS_QUICK_START.md`
- **Results Summary:** `TOTALS_MODEL_SUMMARY.md`

---

## 🎯 Key Takeaways

1. **Look for 3+ point edges** with 65%+ confidence
2. **Strong defenses create UNDERs** (-defensive matchup)
3. **Explosive offenses create OVERs** (+offensive matchup)
4. **Evenly matched = UNDER** (conservative play)
5. **Mismatches = OVER** (blowout potential)
6. **Check weather always** (model doesn't know)
7. **Track your results** (validate model)
8. **Bet responsibly** (never chase losses)

---

**Remember:** This is a tool to inform decisions, not guarantee wins. Always consider external factors and bet responsibly! 🎲

---

**Version:** 1.0.0  
**Last Updated:** November 9, 2025

