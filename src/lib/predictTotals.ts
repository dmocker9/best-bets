import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

export interface TeamStats {
  team_name: string;
  wins: number;
  losses: number;
  ties: number;
  win_percentage: number;
  points_for: number;
  points_against: number;
  point_differential: number;
  margin_of_victory: number;
  strength_of_schedule: number;
  srs: number;
  offensive_srs: number;
  defensive_srs: number;
  points_per_game: number;
  points_allowed_per_game: number;
  week: number;
  season: number;
}

export interface TotalsOdds {
  id: number;
  game_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmaker: string;
  over_line: number;
  over_price: number;
  under_line: number;
  under_price: number;
  week: number;
}

export interface TotalsPrediction {
  game_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  
  // Model prediction
  predicted_total: number;
  confidence_score: number; // 0-100
  
  // Current odds
  vegas_total: number;
  over_price: number;
  under_price: number;
  
  // Value analysis
  value_score: number; // How much model disagrees with Vegas
  recommended_bet: 'OVER' | 'UNDER' | null;
  reasoning: string;
  
  // Breakdown for transparency
  breakdown: {
    base_total: number;
    offensive_matchup_adjustment: number;
    defensive_matchup_adjustment: number;
    pace_adjustment: number;
    competitiveness_adjustment: number;
    srs_adjustment: number;
  };
}

/**
 * Prediction weights - tuned for Over/Under accuracy
 * These can be adjusted based on backtesting
 */
const TOTALS_WEIGHTS = {
  base_scoring: 0.30,          // Team PPG averages
  offensive_matchup: 0.20,     // Offense vs Defense matchup
  defensive_matchup: 0.20,     // Defense quality
  pace_differential: 0.15,     // Point differential indicator
  competitiveness: 0.10,       // Win% matchup impact
  srs_adjustment: 0.05,        // Fine-tuning with SRS
};

/**
 * Get team stats from database
 */
async function getTeamStats(teamName: string, week?: number, season?: number): Promise<TeamStats | null> {
  const supabase = getSupabaseClient();
  
  try {
    let query = supabase
      .from('auto_nfl_team_stats')
      .select('*')
      .eq('team_name', teamName);
    
    if (week) query = query.eq('week', week);
    if (season) query = query.eq('season', season);
    
    query = query.order('week', { ascending: false }).limit(1);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching team stats:', error);
      return null;
    }
    
    return data && data.length > 0 ? data[0] as TeamStats : null;
  } catch (error) {
    console.error('Error in getTeamStats:', error);
    return null;
  }
}

/**
 * Calculate base expected total from team scoring averages
 * This is the foundation of our prediction
 */
function calculateBaseTotalScore(
  homeStats: TeamStats,
  awayStats: TeamStats
): number {
  // Simple average of what each team scores and allows
  const homeExpectedScore = (homeStats.points_per_game + awayStats.points_allowed_per_game) / 2;
  const awayExpectedScore = (awayStats.points_per_game + homeStats.points_allowed_per_game) / 2;
  
  return homeExpectedScore + awayExpectedScore;
}

/**
 * Offensive matchup adjustment
 * Strong offense vs weak defense = more points
 * Strong offense vs strong defense = fewer points
 */
function calculateOffensiveMatchupAdjustment(
  homeStats: TeamStats,
  awayStats: TeamStats
): number {
  // Offensive SRS shows offensive strength relative to league average (0)
  // Defensive SRS shows defensive strength (higher = better defense)
  
  // Home team offensive advantage
  const homeOffensiveEdge = homeStats.offensive_srs - awayStats.defensive_srs;
  
  // Away team offensive advantage
  const awayOffensiveEdge = awayStats.offensive_srs - homeStats.defensive_srs;
  
  // Convert to point adjustment (SRS is roughly point spread)
  // Divide by 4 to moderate the impact on totals
  const adjustment = (homeOffensiveEdge + awayOffensiveEdge) / 4;
  
  return adjustment;
}

/**
 * Defensive matchup adjustment
 * Two strong defenses = lower scoring
 * Two weak defenses = higher scoring
 */
function calculateDefensiveMatchupAdjustment(
  homeStats: TeamStats,
  awayStats: TeamStats
): number {
  // Average defensive quality (higher defensive_srs = better defense)
  const avgDefensiveStrength = (homeStats.defensive_srs + awayStats.defensive_srs) / 2;
  
  // Strong defenses reduce scoring
  // Scale: Each point of defensive SRS reduces total by ~0.5 points
  const adjustment = -avgDefensiveStrength * 0.5;
  
  return adjustment;
}

/**
 * Pace/Point Differential adjustment
 * Teams with high point differentials tend to be in high-scoring games
 * This captures both quality and pace
 */
function calculatePaceAdjustment(
  homeStats: TeamStats,
  awayStats: TeamStats
): number {
  // Normalize point differential to per-game basis (it's season total)
  const homeGames = homeStats.wins + homeStats.losses + homeStats.ties;
  const awayGames = awayStats.wins + awayStats.losses + awayStats.ties;
  
  const homeMargin = homeGames > 0 ? homeStats.point_differential / homeGames : 0;
  const awayMargin = awayGames > 0 ? awayStats.point_differential / awayGames : 0;
  
  // High positive or negative margins indicate offensive teams
  // Teams with |margin| > 8 tend to be in higher scoring games
  const avgAbsoluteMargin = (Math.abs(homeMargin) + Math.abs(awayMargin)) / 2;
  
  // Scale: Each 5 points of margin adds ~1 point to total
  const adjustment = (avgAbsoluteMargin / 5) * 1.0;
  
  return adjustment;
}

/**
 * Competitiveness adjustment
 * Evenly matched teams (similar win%) → conservative, lower scoring
 * Mismatches → favorites run up score, higher scoring
 */
function calculateCompetitivenessAdjustment(
  homeStats: TeamStats,
  awayStats: TeamStats
): number {
  const winPctDifference = Math.abs(homeStats.win_percentage - awayStats.win_percentage);
  
  // Close games (< 0.200 difference) tend to go under
  if (winPctDifference < 0.200) {
    // Both teams play conservatively
    return -2.5;
  }
  
  // Moderate mismatches (0.200-0.400)
  if (winPctDifference < 0.400) {
    return -1.0;
  }
  
  // Big mismatches (> 0.400) → favorites run up score
  // Example: 7-2 team (.778) vs 2-7 team (.222) = 0.556 difference
  return (winPctDifference - 0.400) * 10; // Scale up the mismatch effect
}

/**
 * SRS fine-tuning adjustment
 * Use overall SRS to make final adjustments
 */
function calculateSRSAdjustment(
  homeStats: TeamStats,
  awayStats: TeamStats
): number {
  // High combined SRS (both good teams) = quality, efficient scoring
  // Low combined SRS (both bad teams) = sloppy, lower scoring
  
  const combinedSRS = homeStats.srs + awayStats.srs;
  
  // Scale: Total SRS above 10 adds points, below -10 subtracts
  // Moderate impact: divide by 5
  const adjustment = combinedSRS / 5;
  
  return adjustment;
}

/**
 * Calculate confidence score based on model certainty
 */
function calculateConfidence(
  homeStats: TeamStats,
  awayStats: TeamStats,
  predictedTotal: number,
  vegasTotal: number
): number {
  // Factor 1: Data quality (40%) - complete stats = higher confidence
  const homeDataQuality = homeStats.srs !== null && homeStats.offensive_srs !== null ? 100 : 60;
  const awayDataQuality = awayStats.srs !== null && awayStats.offensive_srs !== null ? 100 : 60;
  const dataQualityScore = (homeDataQuality + awayDataQuality) / 2;
  
  // Factor 2: Sample size (30%) - more games = more reliable stats
  const homeGames = homeStats.wins + homeStats.losses + homeStats.ties;
  const awayGames = awayStats.wins + awayStats.losses + awayStats.ties;
  const avgGames = (homeGames + awayGames) / 2;
  const sampleSizeScore = Math.min(100, (avgGames / 8) * 100); // 8+ games = full confidence
  
  // Factor 3: Consistency (30%) - lower variance = more predictable
  // Teams with moderate margins are more predictable
  const homeConsistency = 100 - Math.min(100, Math.abs(homeStats.margin_of_victory) * 3);
  const awayConsistency = 100 - Math.min(100, Math.abs(awayStats.margin_of_victory) * 3);
  const consistencyScore = (homeConsistency + awayConsistency) / 2;
  
  // Weighted combination
  const baseConfidence = 
    (dataQualityScore * 0.40) +
    (sampleSizeScore * 0.30) +
    (consistencyScore * 0.30);
  
  return Math.max(0, Math.min(100, baseConfidence));
}

/**
 * Predict game total
 */
export async function predictTotal(
  game: TotalsOdds,
  week?: number,
  season?: number
): Promise<TotalsPrediction | null> {
  try {
    // Get team stats
    const homeStats = await getTeamStats(game.home_team, week, season);
    const awayStats = await getTeamStats(game.away_team, week, season);
    
    if (!homeStats || !awayStats) {
      console.log(`Missing stats for ${game.home_team} vs ${game.away_team}`);
      return null;
    }
    
    // Calculate base total
    const baseTotal = calculateBaseTotalScore(homeStats, awayStats);
    
    // Calculate all adjustments
    const offensiveMatchup = calculateOffensiveMatchupAdjustment(homeStats, awayStats);
    const defensiveMatchup = calculateDefensiveMatchupAdjustment(homeStats, awayStats);
    const paceAdjustment = calculatePaceAdjustment(homeStats, awayStats);
    const competitivenessAdjust = calculateCompetitivenessAdjustment(homeStats, awayStats);
    const srsAdjustment = calculateSRSAdjustment(homeStats, awayStats);
    
    // Weighted final prediction
    const predictedTotal = 
      (baseTotal * TOTALS_WEIGHTS.base_scoring) +
      ((baseTotal + offensiveMatchup) * TOTALS_WEIGHTS.offensive_matchup) +
      ((baseTotal + defensiveMatchup) * TOTALS_WEIGHTS.defensive_matchup) +
      ((baseTotal + paceAdjustment) * TOTALS_WEIGHTS.pace_differential) +
      ((baseTotal + competitivenessAdjust) * TOTALS_WEIGHTS.competitiveness) +
      ((baseTotal + srsAdjustment) * TOTALS_WEIGHTS.srs_adjustment);
    
    // Calculate confidence
    const confidence = calculateConfidence(
      homeStats,
      awayStats,
      predictedTotal,
      game.over_line
    );
    
    // Calculate value: how much model disagrees with Vegas
    const vegasTotal = game.over_line;
    const difference = predictedTotal - vegasTotal;
    const valueScore = Math.abs(difference);
    
    // Determine recommendation
    let recommendedBet: 'OVER' | 'UNDER' | null = null;
    let reasoning = '';
    
    // Confidence tiers
    let confidenceTier = '';
    if (confidence >= 75) {
      confidenceTier = 'HIGH CONFIDENCE';
    } else if (confidence >= 65) {
      confidenceTier = 'GOOD CONFIDENCE';
    } else if (confidence >= 55) {
      confidenceTier = 'MODERATE CONFIDENCE';
    } else {
      confidenceTier = 'LOW CONFIDENCE';
    }
    
    // Recommendation thresholds
    const MIN_VALUE = 3.0;        // Need at least 3 point edge
    const MIN_CONFIDENCE = 60;    // Need at least 60% confidence
    const MAX_REASONABLE_DIFF = 10; // Flag if model way off from Vegas
    
    if (valueScore >= MIN_VALUE && confidence >= MIN_CONFIDENCE && valueScore <= MAX_REASONABLE_DIFF) {
      if (difference > 0) {
        // Model predicts higher than Vegas
        recommendedBet = 'OVER';
        reasoning = `${confidenceTier} (${confidence.toFixed(0)}%): Model predicts ${predictedTotal.toFixed(1)} points, ` +
                   `Vegas line: ${vegasTotal}. Expect ${difference.toFixed(1)} more points. `;
        
        // Add specific reasoning
        if (offensiveMatchup > 2) reasoning += `Strong offensive matchups favor scoring. `;
        if (paceAdjustment > 2) reasoning += `High point differentials indicate explosive teams. `;
        if (competitivenessAdjust > 1) reasoning += `Mismatch could lead to blowout scoring. `;
        
      } else {
        // Model predicts lower than Vegas
        recommendedBet = 'UNDER';
        reasoning = `${confidenceTier} (${confidence.toFixed(0)}%): Model predicts ${predictedTotal.toFixed(1)} points, ` +
                   `Vegas line: ${vegasTotal}. Expect ${Math.abs(difference).toFixed(1)} fewer points. `;
        
        // Add specific reasoning
        if (defensiveMatchup < -2) reasoning += `Strong defenses limit scoring. `;
        if (competitivenessAdjust < -2) reasoning += `Evenly matched teams play conservatively. `;
        if (srsAdjustment < -1) reasoning += `Both teams below league average quality. `;
      }
    } else if (valueScore > MAX_REASONABLE_DIFF) {
      reasoning = `PASS (${confidence.toFixed(0)}%): Model total (${predictedTotal.toFixed(1)}) differs significantly ` +
                 `from Vegas (${vegasTotal}). Large gaps often indicate model uncertainty.`;
    } else {
      reasoning = `${confidenceTier} (${confidence.toFixed(0)}%): Edge insufficient (${valueScore.toFixed(1)} points) ` +
                 `or confidence below threshold. Model: ${predictedTotal.toFixed(1)}, Vegas: ${vegasTotal}.`;
    }
    
    return {
      game_id: game.game_id,
      home_team: game.home_team,
      away_team: game.away_team,
      commence_time: game.commence_time,
      predicted_total: predictedTotal,
      confidence_score: confidence,
      vegas_total: vegasTotal,
      over_price: game.over_price,
      under_price: game.under_price,
      value_score: valueScore,
      recommended_bet: recommendedBet,
      reasoning: reasoning,
      breakdown: {
        base_total: baseTotal,
        offensive_matchup_adjustment: offensiveMatchup,
        defensive_matchup_adjustment: defensiveMatchup,
        pace_adjustment: paceAdjustment,
        competitiveness_adjustment: competitivenessAdjust,
        srs_adjustment: srsAdjustment,
      },
    };
  } catch (error) {
    console.error(`Error predicting total for ${game.home_team} vs ${game.away_team}:`, error);
    return null;
  }
}

/**
 * Save totals prediction to database
 */
export async function saveTotalsPrediction(
  prediction: TotalsPrediction,
  weekNumber: number,
  season: number
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  try {
    const { error } = await supabase
      .from('totals_predictions')
      .upsert({
        game_id: prediction.game_id,
        home_team: prediction.home_team,
        away_team: prediction.away_team,
        commence_time: prediction.commence_time,
        predicted_total: prediction.predicted_total,
        confidence_score: prediction.confidence_score,
        vegas_total: prediction.vegas_total,
        over_price: prediction.over_price,
        under_price: prediction.under_price,
        value_score: prediction.value_score,
        recommended_bet: prediction.recommended_bet,
        reasoning: prediction.reasoning,
        breakdown: prediction.breakdown,
        week_number: weekNumber,
        season: season,
      }, {
        onConflict: 'game_id,week_number,season',
        ignoreDuplicates: false,
      });
    
    if (error) {
      console.error('Error saving totals prediction:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveTotalsPrediction:', error);
    return false;
  }
}

/**
 * Generate and save predictions for all upcoming games
 */
export async function generateAndSaveTotalsPredictions(
  weekNumber: number,
  season: number = new Date().getFullYear()
): Promise<{ total: number; saved: number; failed: number }> {
  const supabase = getSupabaseClient();
  const result = { total: 0, saved: 0, failed: 0 };
  
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🎯 GENERATING OVER/UNDER PREDICTIONS - Week ${weekNumber}, ${season} Season`);
    console.log(`${'='.repeat(70)}\n`);
    
    // Fetch upcoming games for the specified week
    // Group by game_id and take the first bookmaker (they're usually similar)
    const { data: games, error } = await supabase
      .from('totals_odds')
      .select('*')
      .eq('week', weekNumber)
      .gte('commence_time', new Date().toISOString())
      .order('commence_time', { ascending: true });
    
    if (error) {
      console.error('Error fetching games:', error);
      return result;
    }
    
    if (!games || games.length === 0) {
      console.log('No upcoming games found in totals_odds table');
      return result;
    }
    
    // Group by game_id to avoid duplicates (multiple bookmakers)
    const uniqueGames = games.reduce((acc, game) => {
      if (!acc[game.game_id]) {
        acc[game.game_id] = game;
      }
      return acc;
    }, {} as Record<string, TotalsOdds>);
    
    const gamesList: TotalsOdds[] = Object.values(uniqueGames);
    result.total = gamesList.length;
    console.log(`📊 Analyzing ${gamesList.length} upcoming games...\n`);
    
    // Predict and save all games
    for (const game of gamesList) {
      try {
        console.log(`🏈 ${game.away_team} @ ${game.home_team}`);
        console.log(`   Vegas Total: ${game.over_line}`);
        
        const prediction = await predictTotal(game as TotalsOdds, weekNumber, season);
        
        if (prediction) {
          const saved = await saveTotalsPrediction(prediction, weekNumber, season);
          
          if (saved) {
            result.saved++;
            console.log(`   ✅ Prediction: ${prediction.predicted_total.toFixed(1)} points (${prediction.confidence_score.toFixed(0)}% confidence)`);
            if (prediction.recommended_bet) {
              console.log(`   💰 RECOMMENDED: ${prediction.recommended_bet} ${prediction.vegas_total}`);
              console.log(`   📝 ${prediction.reasoning.substring(0, 100)}...`);
            }
          } else {
            result.failed++;
            console.log(`   ❌ Failed to save prediction`);
          }
        } else {
          result.failed++;
          console.log(`   ⚠️  Could not generate prediction (missing stats)`);
        }
        console.log('');
      } catch (error) {
        result.failed++;
        console.error(`   ❌ Error processing game:`, error);
      }
    }
    
    console.log(`${'='.repeat(70)}`);
    console.log(`📈 PREDICTION RESULTS:`);
    console.log(`   Total Games: ${result.total}`);
    console.log(`   ✅ Saved: ${result.saved}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    console.log(`${'='.repeat(70)}\n`);
    
    return result;
  } catch (error) {
    console.error('Error generating totals predictions:', error);
    return result;
  }
}

/**
 * Get best totals bets from stored predictions
 */
export async function getBestTotalsBets(
  limit: number = 5,
  weekNumber?: number,
  season?: number
): Promise<any[]> {
  const supabase = getSupabaseClient();
  
  try {
    let query = supabase
      .from('totals_predictions')
      .select('*')
      .not('recommended_bet', 'is', null)
      .order('value_score', { ascending: false })
      .limit(limit);
    
    if (weekNumber) query = query.eq('week_number', weekNumber);
    if (season) query = query.eq('season', season);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching best totals bets:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getBestTotalsBets:', error);
    return [];
  }
}

