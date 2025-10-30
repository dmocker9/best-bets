# NFL Predictions System Guide

## 🎯 Overview

Your NFL betting prediction system now uses a **database-backed workflow** for faster, more efficient predictions. Predictions are generated once and stored in the `predictions` table, then retrieved instantly when you need them.

## 📊 Database Schema

### Predictions Table

Stores all game predictions with betting recommendations:

```sql
predictions
├── id (uuid)
├── game_id (uuid) → references odds_bets(id)
├── predicted_winner (text)
├── predicted_spread (numeric)
├── confidence_score (numeric, 0-100)
├── home_team_strength (numeric)
├── away_team_strength (numeric)
├── recommended_bet (text: 'home_spread', 'away_spread', 'home_ml', 'away_ml', 'none')
├── value_score (numeric) - How much model disagrees with Vegas
├── reasoning (text)
├── week_number (integer)
├── season (integer)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

**Key Features:**
- Foreign key to `odds_bets` table (cascading delete)
- Unique constraint: one prediction per game per week/season
- Indexes on: game_id, week/season, confidence, recommended_bet, value_score
- Auto-updating timestamp trigger

## 🔄 Complete Workflow

### Step 1: Import Team Stats (Weekly)

```bash
# Run this when new stats are available
node import-csv-data.js
```

Or manually update the CSV data in the script with fresh data from Pro Football Reference.

### Step 2: Sync Odds (Daily/Hourly)

```bash
curl http://localhost:3000/api/sync-odds
```

This fetches the latest odds from The Odds API and stores them in `odds_bets` table.

### Step 3: Generate Predictions (Weekly/After Stats Update)

```bash
curl "http://localhost:3000/api/generate-predictions?week=9&season=2025"
```

This:
- Analyzes all upcoming games
- Calculates team strengths using NFL stats
- Predicts winners and spreads
- Identifies value bets
- Saves everything to `predictions` table

Expected output:
```
🎯 GENERATING PREDICTIONS - Week 9, 2025 Season
📊 Analyzing 15 upcoming games...

🏈 Miami Dolphins @ Buffalo Bills
   ✅ Saved prediction (78% confidence)
   💰 RECOMMENDED: Buffalo Bills -7.5

📈 PREDICTION RESULTS:
   Total Games: 15
   ✅ Saved: 15
   ❌ Failed: 0
```

### Step 4: Get Best Bets (Instant, Anytime)

```bash
# Get top 5 best bets
curl http://localhost:3000/api/best-bets

# Get top 10 best bets
curl "http://localhost:3000/api/best-bets?limit=10"

# Get best bets for specific week
curl "http://localhost:3000/api/best-bets?week=9&season=2025"
```

This retrieves predictions from the database **instantly** (no recalculation needed).

## 📈 Prediction Algorithm

The system uses a weighted scoring model:

### Team Strength Calculation (0-100)

1. **Offensive Strength** (25%)
   - Points per game (60%)
   - Yards per play (40%)

2. **Defensive Strength** (25%)
   - Points allowed per game (60%)
   - Yards per play allowed (40%)

3. **Turnover Margin** (15%)
   - Normalized turnover differential

4. **Recent Form** (15%)
   - Last 3 games performance (W-L-W)

5. **Home Field Advantage** (10%)
   - Home win percentage

6. **Injury Impact** (10%)
   - Key player injuries by position

### Value Calculation

```
Value Score = |Predicted Margin - Vegas Implied Margin| × Confidence
```

### Recommendation Criteria

A bet is recommended if:
- Model disagrees with Vegas by **≥3 points**
- Confidence is **≥60%**
- For moneyline: Confidence **≥80%** and predicted margin **≥5 points**

## 🎨 UI Component

The `BestBetsDisplay` component is already integrated into your main page (`page.tsx`).

**Features:**
- Shows top 5 recommended bets
- Displays confidence scores
- Shows value analysis
- Provides detailed reasoning

## 📊 Example API Response

```json
{
  "success": true,
  "message": "Found 5 recommended bets",
  "predictions": [
    {
      "game_id": "uuid",
      "home_team": "Buffalo Bills",
      "away_team": "Miami Dolphins",
      "predicted_winner": "Buffalo Bills",
      "confidence_score": 78.5,
      "predicted_margin": 10.2,
      "home_team_strength": 72.3,
      "away_team_strength": 54.1,
      "current_spread": "-7.5",
      "recommended_bet": "home_spread",
      "value_score": 15.4,
      "reasoning": "Model predicts Buffalo Bills wins by 10.2 points, Vegas line is -7.5. Strong 79% confidence.",
      "week_number": 9,
      "season": 2025
    }
  ],
  "recommendations": 5,
  "generated_at": "2025-10-29T12:00:00Z"
}
```

## 🔧 Updating Predictions

To regenerate predictions (e.g., after odds change):

```bash
# Regenerate for current week
curl "http://localhost:3000/api/generate-predictions?week=9&season=2025"
```

The database will automatically update existing predictions (upsert based on game_id + week + season).

## 💡 Tips

1. **Generate predictions AFTER** importing fresh team stats
2. **Regenerate predictions** when odds change significantly
3. **Check predictions table** directly in Supabase for detailed analysis
4. **Monitor value_score** - higher values indicate stronger disagreement with Vegas
5. **Track performance** - add actual game results later to measure accuracy

## 🚀 Quick Start

Full setup from scratch:

```bash
# 1. Import team stats
node import-csv-data.js

# 2. Sync odds
curl http://localhost:3000/api/sync-odds

# 3. Generate predictions
curl "http://localhost:3000/api/generate-predictions?week=9&season=2025"

# 4. View best bets
curl http://localhost:3000/api/best-bets
```

Or just visit your app and click the "Get Best Bets" button in the UI!

## 📝 Database Queries

Useful SQL queries for analysis:

```sql
-- Get all high-confidence predictions
SELECT * FROM predictions 
WHERE confidence_score >= 80 
ORDER BY value_score DESC;

-- Get predictions by team
SELECT * FROM predictions p
JOIN odds_bets o ON p.game_id = o.id
WHERE o.home_team = 'Buffalo Bills' 
   OR o.away_team = 'Buffalo Bills';

-- Get summary by week
SELECT 
  week_number,
  COUNT(*) as total_predictions,
  COUNT(*) FILTER (WHERE recommended_bet != 'none') as recommended_bets,
  AVG(confidence_score) as avg_confidence
FROM predictions
GROUP BY week_number
ORDER BY week_number;
```

---

**Next Steps:**
1. Import your CSV data with the actual team stats
2. Generate predictions for the current week
3. Check out the Best Bets in your UI!

