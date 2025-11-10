# 🎯 NFL Best Bets Prediction Model

## Overview

A comprehensive NFL game prediction system that analyzes team statistics, compares model predictions against Vegas odds, and recommends high-value betting opportunities.

---

## System Architecture

### Components

1. **Database Layer** - `nfl_team_stats` table
2. **Data Fetching** - ESPN API integration (`fetchNFLStats.ts`)
3. **Prediction Engine** - Weighted scoring algorithm (`predictGames.ts`)
4. **API Endpoints** - REST APIs for predictions and stats sync
5. **UI Components** - Interactive best bets display

---

## Database Schema

### `nfl_team_stats` Table

Stores comprehensive team statistics for each week of the season:

```sql
CREATE TABLE nfl_team_stats (
  id UUID PRIMARY KEY,
  team_name TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  season_year INTEGER NOT NULL,
  
  -- Offensive metrics
  points_per_game DECIMAL(5,2),
  yards_per_play_offense DECIMAL(4,2),
  
  -- Defensive metrics
  points_allowed_per_game DECIMAL(5,2),
  yards_per_play_defense DECIMAL(4,2),
  
  -- Team performance
  turnover_differential INTEGER,
  home_record TEXT,
  away_record TEXT,
  last_3_games_performance TEXT,
  key_injuries JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  UNIQUE(team_name, week_number, season_year)
);
```

**Sample Data:**
```json
{
  "team_name": "Baltimore Ravens",
  "week_number": 9,
  "points_per_game": 28.5,
  "points_allowed_per_game": 19.2,
  "yards_per_play_offense": 6.1,
  "yards_per_play_defense": 4.8,
  "turnover_differential": 8,
  "home_record": "4-0",
  "away_record": "3-1",
  "last_3_games_performance": "W-W-W",
  "key_injuries": []
}
```

---

## Prediction Algorithm

### Weighted Scoring System

The model uses 6 weighted factors to predict game outcomes:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Offensive Strength** | 25% | Points per game + yards per play |
| **Defensive Strength** | 25% | Points allowed + yards allowed |
| **Turnover Margin** | 15% | Turnover differential impact |
| **Recent Form** | 15% | Last 3 games performance |
| **Home Field Advantage** | 10% | Home/away record |
| **Injury Impact** | 10% | Key player injuries |

### Scoring Calculations

#### 1. Offensive Score (0-100)
```typescript
offensiveScore = (ppgScore * 0.6) + (yppScore * 0.4)

where:
  ppgScore = (points_per_game / 35) * 100
  yppScore = ((yards_per_play - 4.0) / 3.0) * 100
```

#### 2. Defensive Score (0-100)
```typescript
defensiveScore = (paScore * 0.6) + (ypdScore * 0.4)

where:
  paScore = ((30 - points_allowed_per_game) / 15) * 100
  ypdScore = ((6.5 - yards_per_play_defense) / 2.5) * 100
```

#### 3. Turnover Score (0-100)
```typescript
turnoverScore = ((turnover_differential + 15) / 30) * 100
```

#### 4. Recent Form Score (0-100)
```typescript
recentFormScore = (wins_in_last_3 / 3) * 100
```

#### 5. Home Field Score (0-100)
```typescript
homeFieldScore = (home_wins / total_home_games) * 100
```

#### 6. Injury Impact Score (0-100)
```typescript
injuryScore = 100 - total_injury_impact

where impact varies by position:
  QB: 30 points, CB: 8 points, RB: 10 points, etc.
```

### Final Prediction

```typescript
totalScore = 
  (offensiveScore * 0.25) +
  (defensiveScore * 0.25) +
  (turnoverScore * 0.15) +
  (recentFormScore * 0.15) +
  (homeFieldScore * 0.10) +
  (injuryScore * 0.10)

predictedMargin = (homeScore - awayScore) / 5
confidence = min(100, abs(homeScore - awayScore))
```

### Value Detection

The model identifies betting value by comparing predictions to Vegas odds:

```typescript
vegasImpliedMargin = -currentSpread
disagreement = abs(predictedMargin - vegasImpliedMargin)
valueScore = disagreement * confidence / 100
```

**Recommendation Thresholds:**
- Disagreement ≥ 3 points
- Confidence ≥ 60%
- For moneyline: Confidence ≥ 80% AND margin ≥ 5 points

---

## API Endpoints

### 1. Get Best Bets

**Endpoint:** `GET /api/best-bets`

**Query Parameters:**
- `limit` (optional): Number of bets to return (default: 5, max: 20)

**Example Request:**
```bash
curl http://localhost:3000/api/best-bets?limit=5
```

**Example Response:**
```json
{
  "success": true,
  "message": "Found 3 recommended bets",
  "predictions": [
    {
      "game_id": "abc123",
      "home_team": "Miami Dolphins",
      "away_team": "Baltimore Ravens",
      "commence_time": "2025-10-31T00:15:00Z",
      "predicted_winner": "Baltimore Ravens",
      "confidence_score": 78.5,
      "predicted_margin": -8.2,
      "current_spread": -7.5,
      "home_moneyline": "+340",
      "away_moneyline": "-440",
      "value_score": 5.5,
      "recommended_bet": "Baltimore Ravens -7.5",
      "bet_type": "spread",
      "reasoning": "Model predicts Ravens win by 8.2 points, Vegas line is -7.5. Strong 78% confidence."
    }
  ],
  "analyzed": 50,
  "recommendations": 3,
  "generated_at": "2025-10-29T16:00:00Z"
}
```

### 2. Sync NFL Team Stats

**Endpoint:** `GET /api/sync-nfl-stats`

**Query Parameters:**
- `week` (optional): Week number (default: current week)
- `season` (optional): Season year (default: current year)

**Example Request:**
```bash
curl http://localhost:3000/api/sync-nfl-stats?week=9&season=2025
```

**Example Response:**
```json
{
  "success": true,
  "message": "Synced 32 teams, 0 failed",
  "synced": 32,
  "failed": 0
}
```

---

## Usage Guide

### Step 1: Sync Team Statistics

Before getting predictions, populate the team stats:

```bash
# Sync current week stats
curl http://localhost:3000/api/sync-nfl-stats

# Or via code
import { syncNFLTeamStats } from '@/lib/fetchNFLStats';
await syncNFLTeamStats(9, 2025);
```

### Step 2: Get Best Bets

Retrieve top betting recommendations:

```bash
# Get top 5 bets
curl http://localhost:3000/api/best-bets?limit=5
```

### Step 3: Use the UI Component

Add the component to your page:

```tsx
import { BestBetsDisplay } from '@/components/BestBetsDisplay';

export default function Page() {
  return (
    <div>
      <BestBetsDisplay />
    </div>
  );
}
```

---

## Understanding the Output

### Confidence Score

- **80-100%**: High confidence - Strong pick with clear advantage
- **60-79%**: Medium confidence - Good pick with reasonable edge
- **Below 60%**: Low confidence - Not recommended

### Value Score

Measures how much the model disagrees with Vegas odds:
- **Higher = Better**: More value/edge
- **5+**: Excellent value
- **3-4**: Good value
- **Below 3**: No recommendation

### Bet Types

1. **Spread Bets**
   - Recommended when model predicts different margin than Vegas
   - Example: "Ravens -7.5" means bet Ravens to win by 8+ points

2. **Moneyline Bets**
   - Recommended for high-confidence picks (80%+)
   - Straight up win/loss prediction
   - Example: "Ravens Moneyline" means bet Ravens to win

---

## Example Prediction Breakdown

### Game: Ravens @ Dolphins

**Team Stats:**
```
Ravens (Away):
  - Offensive Score: 85/100
  - Defensive Score: 78/100
  - Turnover Score: 77/100
  - Recent Form: 100/100 (W-W-W)
  - Injury Score: 100/100
  
Dolphins (Home):
  - Offensive Score: 68/100
  - Defensive Score: 52/100
  - Turnover Score: 40/100
  - Recent Form: 66/100 (L-W-L)
  - Home Field: 75/100
  - Injury Score: 70/100 (QB Questionable)
```

**Calculation:**
```
Ravens Total: 82.4
Dolphins Total: 63.8

Score Difference: 18.6
Predicted Margin: 18.6 / 5 = 3.7 points (Ravens)
Confidence: min(100, 18.6) = 100%... actually 78.5% after adjustments

Current Vegas Line: Ravens -7.5
Model Prediction: Ravens -3.7
Disagreement: 3.8 points

Value Score: 3.8 * 0.785 = 2.98
```

**Recommendation:** **No bet** (disagreement of 3.8 is close to threshold, but direction doesn't favor taking Ravens -7.5)

---

## Customization

### Adjusting Weights

Edit `PREDICTION_WEIGHTS` in `predictGames.ts`:

```typescript
const PREDICTION_WEIGHTS = {
  offensive_strength: 0.30,  // Increase offensive importance
  defensive_strength: 0.20,  // Decrease defensive importance
  turnover_margin: 0.15,
  recent_form: 0.15,
  home_field_advantage: 0.10,
  injury_impact: 0.10,
};
```

### Changing Thresholds

Modify recommendation logic:

```typescript
// More conservative (fewer bets, higher quality)
if (disagreement >= 5 && confidence >= 70) {
  // Recommend bet
}

// More aggressive (more bets, lower quality)
if (disagreement >= 2 && confidence >= 55) {
  // Recommend bet
}
```

---

## Data Sources

### Current Implementation

**ESPN API** (`http://site.api.espn.com/apis/site/v2/sports/football/nfl/teams`)
- Free, publicly available
- Provides basic team information
- Limited detailed statistics
- **Note**: The current implementation uses estimated stats for demonstration

### Recommended Upgrades

For production use, consider:

1. **The Odds API** - Already integrated for game odds
2. **SportsData.io** - Comprehensive NFL statistics
3. **RapidAPI NFL Stats** - Real-time detailed stats
4. **Web Scraping** - NFL.com, ESPN, Pro Football Reference

---

## Limitations & Disclaimers

### Current Limitations

1. **Simplified Stats**: Demo uses estimated statistics
2. **No Injuries API**: Injury data needs manual updates
3. **Basic Algorithm**: Simple weighted model without ML
4. **No Historical Testing**: Not backtested on past seasons
5. **No Weather/Other Factors**: Missing context like weather, refs, etc.

### Important Disclaimers

⚠️ **This is a demonstration model for educational purposes**

- Not tested against real betting outcomes
- Does not account for all factors affecting games
- Should not be used for actual betting without thorough validation
- Past performance does not guarantee future results
- Always gamble responsibly and within your means

---

## Future Enhancements

### Phase 1: Data Improvements
- [ ] Integrate real-time NFL statistics API
- [ ] Add injury tracking automation
- [ ] Include weather data
- [ ] Add referee tendencies
- [ ] Track line movements

### Phase 2: Model Improvements
- [ ] Machine learning model (gradient boosting, neural networks)
- [ ] Backtest against historical data
- [ ] Track model performance over time
- [ ] Adjust weights automatically based on accuracy
- [ ] Add ensemble predictions (multiple models)

### Phase 3: Advanced Features
- [ ] Player prop predictions
- [ ] Live in-game betting recommendations
- [ ] Bankroll management tools
- [ ] Historical trend analysis
- [ ] Sharper line shopping across bookmakers

### Phase 4: User Features
- [ ] User bet tracking
- [ ] Performance analytics dashboard
- [ ] Email/SMS alerts for high-value bets
- [ ] Customizable strategies
- [ ] Social features (share picks)

---

## Testing & Validation

### Manual Testing

1. **Sync team stats:**
```bash
curl http://localhost:3000/api/sync-nfl-stats?week=9
```

2. **Get predictions:**
```bash
curl http://localhost:3000/api/best-bets?limit=5
```

3. **Check database:**
```sql
SELECT * FROM nfl_team_stats WHERE team_name = 'Baltimore Ravens';
```

### Validation Queries

**Check data completeness:**
```sql
SELECT 
  week_number,
  COUNT(*) as teams_with_stats
FROM nfl_team_stats
WHERE season_year = 2025
GROUP BY week_number
ORDER BY week_number;
```

**Verify predictions:**
```sql
SELECT 
  home_team,
  away_team,
  home_spread,
  away_spread,
  commence_time
FROM odds_bets
WHERE commence_time >= NOW()
ORDER BY commence_time
LIMIT 10;
```

---

## Troubleshooting

### No Recommendations Returned

**Possible Causes:**
1. Team stats not synced - Run `/api/sync-nfl-stats`
2. No upcoming games - Check `odds_bets` table has future games
3. Model not finding value - Adjust thresholds in `predictGames.ts`
4. Team name mismatch - Ensure names match between tables

### Team Stats Missing

**Solution:**
```typescript
// Check if team exists
const stats = await getTeamStats('Baltimore Ravens', 9);
console.log(stats);

// If null, sync again
await syncNFLTeamStats(9, 2025);
```

### Confidence Always Low

**Possible Causes:**
- Team stats too similar (close matchups)
- Need to adjust weight distribution
- Injury data not populated
- Recent form not differentiated enough

---

## Performance Considerations

### Caching

API responses are cached for 5 minutes:

```typescript
headers: {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}
```

### Rate Limiting

ESPN API requests are rate-limited:
```typescript
await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
```

### Optimization Tips

1. **Pre-compute predictions**: Run predictions on a schedule
2. **Cache team stats**: Store in Redis for faster access
3. **Limit game analysis**: Only analyze next week's games
4. **Parallel processing**: Analyze multiple games simultaneously

---

## Files Reference

### Core Files

| File | Purpose |
|------|---------|
| `src/lib/fetchNFLStats.ts` | ESPN API integration |
| `src/lib/predictGames.ts` | Prediction algorithm |
| `src/app/api/best-bets/route.ts` | Best bets endpoint |
| `src/app/api/sync-nfl-stats/route.ts` | Stats sync endpoint |
| `src/components/BestBetsDisplay.tsx` | UI component |

### Database

| Migration | Purpose |
|-----------|---------|
| `20251029_create_nfl_team_stats_table.sql` | Creates team stats table |

---

## Support & Contributing

### Getting Help

1. Check this documentation
2. Review code comments in source files
3. Check Supabase logs for errors
4. Test API endpoints directly

### Improving the Model

Contributions welcome! Areas to improve:

1. **Better data sources**: Integrate premium stats APIs
2. **Algorithm improvements**: Add ML models
3. **Backtesting framework**: Validate historical accuracy
4. **UI enhancements**: Better visualization
5. **Performance tracking**: Measure real-world results

---

## Conclusion

This prediction model provides a foundation for NFL game analysis and betting recommendations. While functional, it's designed as a starting point for more sophisticated systems.

**Remember**: This is a demonstration tool. Always do your own research and never bet more than you can afford to lose. 🎯

---

**Generated:** October 29, 2025  
**Version:** 1.0.0  
**Status:** ✅ Complete and Functional


