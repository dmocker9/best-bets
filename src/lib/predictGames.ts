import { createClient } from '@supabase/supabase-js';
import { NFLTeamStats, getTeamStats } from './fetchNFLStats';

// Initialize Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

export interface GameOdds {
  id: string;
  home_team: string;
  away_team: string;
  home_spread: string;
  away_spread: string;
  home_price: string;
  away_price: string;
  commence_time: string;
}

export interface GamePrediction {
  game_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  
  // Model prediction
  predicted_winner: string;
  confidence_score: number; // 0-100
  predicted_margin: number; // Points
  
  // Current odds
  current_spread: number;
  home_moneyline: string;
  away_moneyline: string;
  
  // Value analysis
  value_score: number; // How much model disagrees with Vegas
  recommended_bet: string | null;
  bet_type: 'spread' | 'moneyline' | null;
  reasoning: string;
}

/**
 * Weighted scoring system for game prediction
 * Weights can be adjusted based on historical accuracy
 */
const PREDICTION_WEIGHTS = {
  offensive_strength: 0.25,
  defensive_strength: 0.25,
  turnover_margin: 0.15,
  recent_form: 0.15,
  home_field_advantage: 0.10,
  injury_impact: 0.10,
};

/**
 * Calculate offensive strength score (0-100)
 */
function calculateOffensiveScore(stats: NFLTeamStats): number {
  const ppgScore = Math.min(100, (stats.points_per_game / 35) * 100);
  
  // Use offensive rating if yards per play not available
  const ypp = stats.yards_per_play_offense ?? (5.5 + (stats.offensive_rating / 10));
  const yppScore = Math.min(100, ((ypp - 4.0) / 3.0) * 100);
  
  return (ppgScore * 0.6) + (yppScore * 0.4);
}

/**
 * Calculate defensive strength score (0-100) - lower points allowed is better
 */
function calculateDefensiveScore(stats: NFLTeamStats): number {
  // Invert so lower points allowed = higher score
  const paScore = Math.max(0, Math.min(100, ((30 - stats.points_allowed_per_game) / 15) * 100));
  
  // Use defensive rating if yards per play defense not available
  const ypd = stats.yards_per_play_defense ?? (5.5 - (stats.defensive_rating / 10));
  const ypdScore = Math.max(0, Math.min(100, ((6.5 - ypd) / 2.5) * 100));
  
  return (paScore * 0.6) + (ypdScore * 0.4);
}

/**
 * Calculate turnover margin score (0-100)
 */
function calculateTurnoverScore(stats: NFLTeamStats): number {
  // Estimate from wins/losses if not available
  const turnoverDiff = stats.turnover_differential ?? Math.round((stats.wins - stats.losses) / 2);
  
  // Normalize turnover differential (-15 to +15 range)
  const normalized = ((turnoverDiff + 15) / 30) * 100;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Calculate recent form score based on last 3 games (0-100)
 */
function calculateRecentFormScore(performance: string | undefined, stats: NFLTeamStats): number {
  if (!performance) {
    // Estimate from win percentage
    return stats.win_percentage * 100;
  }
  
  const games = performance.split('-');
  let wins = 0;
  
  games.forEach(result => {
    if (result === 'W') wins++;
  });
  
  return (wins / games.length) * 100;
}

/**
 * Calculate home field advantage (0-100)
 */
function calculateHomeFieldScore(homeRecord: string | undefined, stats: NFLTeamStats): number {
  if (!homeRecord) {
    // Estimate: home teams typically win ~57% of games, boost by team's overall win%
    return 57 + (stats.win_percentage * 100 - 50) * 0.5;
  }
  
  const [wins, losses] = homeRecord.split('-').map(Number);
  const total = wins + losses || 1;
  
  return (wins / total) * 100;
}

/**
 * Calculate injury impact (0-100) - more injuries = lower score
 */
function calculateInjuryScore(injuries: any[] | undefined): number {
  if (!injuries || injuries.length === 0) return 100;
  
  // Each key injury reduces score
  const impactByPosition: Record<string, number> = {
    'QB': 30,
    'RB': 10,
    'WR': 8,
    'TE': 5,
    'OL': 7,
    'DL': 7,
    'LB': 6,
    'CB': 8,
    'S': 5,
  };
  
  let totalImpact = 0;
  
  injuries.forEach((injury: any) => {
    const position = injury.position || 'OTHER';
    const impact = impactByPosition[position] || 5;
    
    // Multiply by severity
    if (injury.status === 'Out') {
      totalImpact += impact;
    } else if (injury.status === 'Questionable') {
      totalImpact += impact * 0.5;
    } else if (injury.status === 'Doubtful') {
      totalImpact += impact * 0.75;
    }
  });
  
  return Math.max(0, 100 - totalImpact);
}

/**
 * Calculate comprehensive team score
 */
function calculateTeamScore(
  stats: NFLTeamStats,
  isHome: boolean
): { score: number; breakdown: Record<string, number> } {
  const offensiveScore = calculateOffensiveScore(stats);
  const defensiveScore = calculateDefensiveScore(stats);
  const turnoverScore = calculateTurnoverScore(stats);
  const recentFormScore = calculateRecentFormScore(stats.last_3_games_performance, stats);
  const homeFieldScore = isHome ? calculateHomeFieldScore(stats.home_record, stats) : 50;
  const injuryScore = calculateInjuryScore(stats.key_injuries);
  
  const totalScore = 
    (offensiveScore * PREDICTION_WEIGHTS.offensive_strength) +
    (defensiveScore * PREDICTION_WEIGHTS.defensive_strength) +
    (turnoverScore * PREDICTION_WEIGHTS.turnover_margin) +
    (recentFormScore * PREDICTION_WEIGHTS.recent_form) +
    (homeFieldScore * PREDICTION_WEIGHTS.home_field_advantage) +
    (injuryScore * PREDICTION_WEIGHTS.injury_impact);
  
  return {
    score: totalScore,
    breakdown: {
      offensive: offensiveScore,
      defensive: defensiveScore,
      turnover: turnoverScore,
      recentForm: recentFormScore,
      homeField: homeFieldScore,
      injury: injuryScore,
    },
  };
}

/**
 * Calculate confidence score based on multiple factors
 * SIMPLIFIED: Removed SRS (double-counting) and Vegas Agreement (contradictory)
 */
function calculateConfidence(
  homeStats: NFLTeamStats,
  awayStats: NFLTeamStats,
  homeStrength: number,
  awayStrength: number,
  predictedMargin: number,
  vegasSpread: number
): number {
  // 1. Team Strength Gap (50% weight - increased from 40%)
  const strengthGap = Math.abs(homeStrength - awayStrength);
  const strengthConfidence = Math.min(100, (strengthGap / 20) * 100);
  
  // 2. Team Consistency (30% weight - increased from 20%)
  // Teams with moderate margins are more predictable
  const homeConsistency = calculateConsistency(homeStats);
  const awayConsistency = calculateConsistency(awayStats);
  const avgConsistency = (homeConsistency + awayConsistency) / 2;
  
  // 3. Record Quality (20% weight - NEW)
  // Win percentage adjusted for strength of schedule
  const homeRecordQuality = calculateRecordQuality(homeStats);
  const awayRecordQuality = calculateRecordQuality(awayStats);
  const avgRecordQuality = (homeRecordQuality + awayRecordQuality) / 2;
  
  // Weighted average (simplified from 4 factors to 3)
  const finalConfidence = 
    (strengthConfidence * 0.50) +
    (avgConsistency * 0.30) +
    (avgRecordQuality * 0.20);
  
  return Math.max(0, Math.min(100, finalConfidence));
}

/**
 * Calculate team consistency score (0-100)
 * Higher score = more consistent/predictable performance
 * Teams with extreme margins (blowouts or nail-biters) are less predictable
 */
function calculateConsistency(stats: NFLTeamStats): number {
  // Margin of Victory stability: moderate margins = more consistent
  // Extreme MoV (either direction) = less predictable
  const consistency = 100 - Math.min(100, Math.abs(stats.margin_of_victory) * 2);
  
  return Math.max(0, consistency);
}

/**
 * Calculate record quality score (0-100)
 * Win percentage adjusted for strength of schedule
 */
function calculateRecordQuality(stats: NFLTeamStats): number {
  // Win percentage adjusted for opponent quality
  // Teams that win against tough schedules are more reliable
  const recordQuality = stats.win_percentage * 100 * (1 + stats.strength_of_schedule / 10);
  
  return Math.max(0, Math.min(100, recordQuality));
}

/**
 * Check if two teams are division rivals
 * Division games are historically closer than pure stats suggest
 */
function areDivisionRivals(team1: string, team2: string): boolean {
  const divisions = {
    'AFC East': ['Buffalo Bills', 'Miami Dolphins', 'New England Patriots', 'New York Jets'],
    'AFC North': ['Baltimore Ravens', 'Cincinnati Bengals', 'Cleveland Browns', 'Pittsburgh Steelers'],
    'AFC South': ['Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars', 'Tennessee Titans'],
    'AFC West': ['Denver Broncos', 'Kansas City Chiefs', 'Las Vegas Raiders', 'Los Angeles Chargers'],
    'NFC East': ['Dallas Cowboys', 'New York Giants', 'Philadelphia Eagles', 'Washington Commanders'],
    'NFC North': ['Chicago Bears', 'Detroit Lions', 'Green Bay Packers', 'Minnesota Vikings'],
    'NFC South': ['Atlanta Falcons', 'Carolina Panthers', 'New Orleans Saints', 'Tampa Bay Buccaneers'],
    'NFC West': ['Arizona Cardinals', 'Los Angeles Rams', 'San Francisco 49ers', 'Seattle Seahawks'],
  };
  
  for (const teams of Object.values(divisions)) {
    if (teams.includes(team1) && teams.includes(team2)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Predict game outcome
 */
export async function predictGame(game: GameOdds): Promise<GamePrediction | null> {
  try {
    // Get team stats
    const homeStats = await getTeamStats(game.home_team);
    const awayStats = await getTeamStats(game.away_team);
    
    if (!homeStats || !awayStats) {
      console.log(`Missing stats for ${game.home_team} vs ${game.away_team}`);
      return null;
    }
    
    // Calculate team scores for confidence calculation
    const homeScore = calculateTeamScore(homeStats, true);
    const awayScore = calculateTeamScore(awayStats, false);
    
    // Use SRS differential for spread prediction with dampening
    // SRS represents team strength but needs to be calibrated for actual spreads
    const homeSRS = homeStats.offensive_rating + homeStats.defensive_rating;
    const awaySRS = awayStats.offensive_rating + awayStats.defensive_rating;
    const HOME_FIELD_ADVANTAGE = 2.5; // Standard NFL home field advantage
    
    // Apply dampening factor: 0.85 better aligns with actual spreads
    const SRS_DAMPENING = 0.85;
    const srsDifferential = (homeSRS - awaySRS) * SRS_DAMPENING;
    
    // Check if division game (games between divisional rivals are typically closer)
    const isDivisionGame = areDivisionRivals(game.home_team, game.away_team);
    const DIVISION_GAME_DAMPENING = 0.90; // 10% reduction for division games (reduced from 20%)
    
    // Predicted spread: Positive = home team favored
    let predictedMargin = srsDifferential + HOME_FIELD_ADVANTAGE;
    
    // Adjust for division games
    if (isDivisionGame) {
      predictedMargin = predictedMargin * DIVISION_GAME_DAMPENING;
    }
    
    const predictedWinner = predictedMargin > 0 ? game.home_team : game.away_team;
    
    // Parse current spread (defensive: handle null/undefined/empty)
    let currentSpread = 0;
    try {
      if (game.home_spread != null) {
        const raw = String(game.home_spread);
        const cleaned = raw.replace(/[^0-9+\-.]/g, '').replace('+', '');
        const parsed = parseFloat(cleaned);
        if (!Number.isNaN(parsed)) currentSpread = parsed;
      }
    } catch (_) {
      currentSpread = 0; // fallback to pick winner logic; value comparison still works
    }
    
    // Calculate sophisticated confidence score
    const confidence = calculateConfidence(
      homeStats,
      awayStats,
      homeScore.score,
      awayScore.score,
      predictedMargin,
      currentSpread
    );
    
    // Calculate value: how much model disagrees with Vegas
    const vegasImpliedMargin = -currentSpread; // Vegas thinks home wins by this much
    const disagreement = Math.abs(predictedMargin - vegasImpliedMargin);
    const valueScore = disagreement; // Raw edge in points
    
    // Determine recommended bet
    let recommendedBet: string | null = null;
    let betType: 'spread' | 'moneyline' | null = null;
    let reasoning = '';
    
    // Confidence tier descriptions
    let confidenceTier = '';
    if (confidence >= 75) {
      confidenceTier = 'STRONG BET';
    } else if (confidence >= 65) {
      confidenceTier = 'GOOD BET';
    } else if (confidence >= 50) {
      confidenceTier = 'VALUE BET';
    } else {
      confidenceTier = 'PASS';
    }
    
    // Determine if we agree with Vegas on the favorite
    const vegasFavorite = vegasImpliedMargin > 0 ? game.home_team : game.away_team;
    const modelFavorite = predictedMargin > 0 ? game.home_team : game.away_team;
    const agreesOnFavorite = vegasFavorite === modelFavorite;
    
    // Regression dampening: If model disagrees by >8 points, likely model error not value
    const REALISTIC_EDGE_MIN = 2.5;
    const REALISTIC_EDGE_MAX = 7.5;
    const isRealisticEdge = disagreement >= REALISTIC_EDGE_MIN && disagreement <= REALISTIC_EDGE_MAX;
    
    // UNIFORM confidence threshold - no penalty for underdogs
    // Model rarely picks different winners, so we focus on spread value
    const requiredConfidence = 65; // Same for all bets
    
    // Recommendation logic - finds value on both favorites AND underdogs
    if (isRealisticEdge && confidence >= requiredConfidence) {
      // Determine which team to bet on based on where the value is
      if (predictedMargin > 0 && vegasImpliedMargin > 0) {
        // Both predict home team wins
        if (predictedMargin > vegasImpliedMargin) {
          // Home team wins by MORE than Vegas → bet home spread
          recommendedBet = `${game.home_team} ${game.home_spread}`;
          betType = 'spread';
          reasoning = `${confidenceTier} (${confidence.toFixed(0)}%): Model predicts ${game.home_team} by ${predictedMargin.toFixed(1)}, ` +
                      `Vegas: ${vegasImpliedMargin.toFixed(1)}. ${disagreement.toFixed(1)}pt edge.`;
        } else {
          // Home team wins by LESS than Vegas → bet away spread (underdog value!)
          recommendedBet = `${game.away_team} ${game.away_spread}`;
          betType = 'spread';
          reasoning = `${confidenceTier} (${confidence.toFixed(0)}%): ${game.away_team} (underdog) loses by less. ` +
                      `Model: ${predictedMargin.toFixed(1)}, Vegas: ${vegasImpliedMargin.toFixed(1)}. ${disagreement.toFixed(1)}pt value.`;
        }
      } else if (predictedMargin < 0 && vegasImpliedMargin < 0) {
        // Both predict away team wins
        if (Math.abs(predictedMargin) > Math.abs(vegasImpliedMargin)) {
          // Away team wins by MORE than Vegas → bet away spread
          recommendedBet = `${game.away_team} ${game.away_spread}`;
          betType = 'spread';
          reasoning = `${confidenceTier} (${confidence.toFixed(0)}%): Model predicts ${game.away_team} by ${Math.abs(predictedMargin).toFixed(1)}, ` +
                      `Vegas: ${Math.abs(vegasImpliedMargin).toFixed(1)}. ${disagreement.toFixed(1)}pt edge.`;
        } else {
          // Away team wins by LESS than Vegas → bet home spread (underdog value!)
          recommendedBet = `${game.home_team} ${game.home_spread}`;
          betType = 'spread';
          reasoning = `${confidenceTier} (${confidence.toFixed(0)}%): ${game.home_team} (underdog) loses by less. ` +
                      `Model: ${Math.abs(predictedMargin).toFixed(1)}, Vegas: ${Math.abs(vegasImpliedMargin).toFixed(1)}. ${disagreement.toFixed(1)}pt value.`;
        }
      } else {
        // Model and Vegas disagree on winner - bet the team model thinks will win
        if (predictedMargin > 0) {
          recommendedBet = `${game.home_team} ${game.home_spread}`;
          reasoning = `${confidenceTier} (${confidence.toFixed(0)}%): Model picks ${game.home_team}, Vegas favors ${game.away_team}.`;
        } else {
          recommendedBet = `${game.away_team} ${game.away_spread}`;
          reasoning = `${confidenceTier} (${confidence.toFixed(0)}%): Model picks ${game.away_team}, Vegas favors ${game.home_team}.`;
        }
        betType = 'spread';
      }
      
      // Moneyline only for CLOSE games (spread within 2 points) with high confidence
      // Don't recommend ML for large favorites/underdogs - stick with the spread
      if (confidence >= 85 && Math.abs(currentSpread) <= 2.0 && Math.abs(predictedMargin) >= 5) {
        betType = 'moneyline';
        recommendedBet = predictedWinner + ' Moneyline';
        reasoning = `${confidenceTier} (${confidence.toFixed(0)}%): Close spread (${currentSpread}), high confidence. ` +
                    `Take ${predictedWinner} ML for cleaner win.`;
      }
    } else if (disagreement > REALISTIC_EDGE_MAX) {
      // Model disagrees too much - likely model error
      reasoning = `PASS (${confidence.toFixed(0)}%): Model spread (${predictedMargin.toFixed(1)}) differs ${disagreement.toFixed(1)}pts from Vegas. ` +
                  `Large gaps often indicate model error, not value.`;
    } else {
      reasoning = `${confidenceTier} (${confidence.toFixed(0)}%): Edge insufficient (${disagreement.toFixed(1)}pts) or confidence below threshold (${requiredConfidence}%).`;
    }
    
    return {
      game_id: game.id,
      home_team: game.home_team,
      away_team: game.away_team,
      commence_time: game.commence_time,
      predicted_winner: predictedWinner,
      confidence_score: confidence,
      predicted_margin: predictedMargin,
      current_spread: currentSpread,
      home_moneyline: game.home_price,
      away_moneyline: game.away_price,
      value_score: valueScore,
      recommended_bet: recommendedBet,
      bet_type: betType,
      reasoning: reasoning,
    };
  } catch (error) {
    console.error(`Error predicting game ${game.home_team} vs ${game.away_team}:`, error);
    return null;
  }
}

/**
 * Save prediction to database
 */
export async function savePrediction(
  prediction: GamePrediction,
  weekNumber: number,
  season: number
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  try {
    // Map recommended_bet to database format
    let dbRecommendedBet: string = 'none';
    
    if (prediction.recommended_bet) {
      if (prediction.recommended_bet.includes(prediction.home_team)) {
        dbRecommendedBet = prediction.bet_type === 'moneyline' ? 'home_ml' : 'home_spread';
      } else {
        dbRecommendedBet = prediction.bet_type === 'moneyline' ? 'away_ml' : 'away_spread';
      }
    }
    
    const homeScore = await calculateTeamScore(
      await getTeamStats(prediction.home_team) || {} as NFLTeamStats,
      true
    );
    const awayScore = await calculateTeamScore(
      await getTeamStats(prediction.away_team) || {} as NFLTeamStats,
      false
    );
    
    // Try primary table 'predictions'; if missing, fallback to 'spread_predictions'
    let { error } = await supabase
      .from('predictions')
      .upsert({
        game_id: prediction.game_id,
        predicted_winner: prediction.predicted_winner,
        predicted_spread: prediction.predicted_margin,
        confidence_score: prediction.confidence_score,
        home_team_strength: homeScore.score,
        away_team_strength: awayScore.score,
        recommended_bet: dbRecommendedBet,
        value_score: prediction.value_score,
        reasoning: prediction.reasoning || 'No significant value detected',
        week_number: weekNumber,
        season: season,
      }, {
        onConflict: 'game_id,week_number,season',
        ignoreDuplicates: false,
      });

    if (error && (error as any).code === 'PGRST205') {
      // Fallback table name
      const fallback = await supabase
        .from('spread_predictions')
        .upsert({
          game_id: prediction.game_id,
          predicted_winner: prediction.predicted_winner,
          predicted_spread: prediction.predicted_margin,
          confidence_score: prediction.confidence_score,
          home_team_strength: homeScore.score,
          away_team_strength: awayScore.score,
          recommended_bet: dbRecommendedBet,
          value_score: prediction.value_score,
          reasoning: prediction.reasoning || 'No significant value detected',
          week_number: weekNumber,
          season: season,
        }, {
          onConflict: 'game_id,week_number,season',
          ignoreDuplicates: false,
        });
      error = fallback.error as any;
    }

    if (error) {
      console.error('Error saving prediction:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in savePrediction:', error);
    return false;
  }
}

/**
 * Generate and save predictions for all upcoming games
 */
export async function generateAndSavePredictions(
  weekNumber: number,
  season: number = new Date().getFullYear()
): Promise<{ total: number; saved: number; failed: number }> {
  const supabase = getSupabaseClient();
  const result = { total: 0, saved: 0, failed: 0 };
  
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🎯 GENERATING PREDICTIONS - Week ${weekNumber}, ${season} Season`);
    console.log(`${'='.repeat(70)}\n`);
    
    // Fetch upcoming games for the specified week
    const { data: games, error } = await supabase
      .from('odds_bets')
      .select('id, home_team, away_team, home_spread, away_spread, home_price, away_price, commence_time, week')
      .eq('week', weekNumber)
      .gte('commence_time', new Date().toISOString())
      .order('commence_time', { ascending: true })
      .limit(50);
    
    if (error) {
      console.error('Error fetching games:', error);
      return result;
    }
    
    if (!games || games.length === 0) {
      console.log('No upcoming games found');
      return result;
    }
    
    result.total = games.length;
    console.log(`📊 Analyzing ${games.length} upcoming games...\n`);
    
    // Predict and save all games
    for (const game of games) {
      try {
        console.log(`🏈 ${game.away_team} @ ${game.home_team}`);
        
        const prediction = await predictGame(game as GameOdds);
        
        if (prediction) {
          const saved = await savePrediction(prediction, weekNumber, season);
          
          if (saved) {
            result.saved++;
            console.log(`   ✅ Saved prediction (${prediction.confidence_score.toFixed(0)}% confidence)`);
            if (prediction.recommended_bet) {
              console.log(`   💰 RECOMMENDED: ${prediction.recommended_bet}`);
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
    console.error('Error generating predictions:', error);
    return result;
  }
}

/**
 * Get best bets from stored predictions
 */
export async function getBestBetsFromDatabase(
  limit: number = 5,
  weekNumber?: number,
  season?: number
): Promise<any[]> {
  const supabase = getSupabaseClient();
  
  try {
    const buildQuery = (table: 'predictions' | 'spread_predictions') => {
      let q = supabase
        .from(table)
        .select(`
          *,
          odds_bets:game_id (
            home_team,
            away_team,
            home_spread,
            away_spread,
            home_price,
            away_price,
            commence_time
          )
        `)
        .neq('recommended_bet', 'none')
        .order('confidence_score', { ascending: false })
        .limit(limit);
      if (weekNumber) q = q.eq('week_number', weekNumber);
      if (season) q = q.eq('season', season);
      return q;
    };

    // Try primary table first
    let { data, error } = await buildQuery('predictions');
    if (error && (error as any).code === 'PGRST205') {
      // Fallback to spread_predictions
      const fallback = await buildQuery('spread_predictions');
      data = fallback.data as any[] | null;
      error = fallback.error as any;
    }
    
    if (error) {
      console.error('Error fetching best bets from database:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getBestBetsFromDatabase:', error);
    return [];
  }
}

/**
 * Get best bets from upcoming games (legacy function for backwards compatibility)
 * Now generates predictions on-the-fly
 */
export async function getBestBets(limit: number = 5): Promise<GamePrediction[]> {
  const supabase = getSupabaseClient();
  
  try {
    // Fetch upcoming games
    const { data: games, error } = await supabase
      .from('odds_bets')
      .select('id, home_team, away_team, home_spread, away_spread, home_price, away_price, commence_time')
      .gte('commence_time', new Date().toISOString())
      .order('commence_time', { ascending: true })
      .limit(50); // Get next 50 games
    
    if (error) {
      console.error('Error fetching games:', error);
      return [];
    }
    
    if (!games || games.length === 0) {
      console.log('No upcoming games found');
      return [];
    }
    
    console.log(`Analyzing ${games.length} upcoming games...`);
    
    // Predict all games
    const predictions: GamePrediction[] = [];
    
    for (const game of games) {
      const prediction = await predictGame(game as GameOdds);
      if (prediction && prediction.recommended_bet) {
        predictions.push(prediction);
      }
    }
    
    // Sort by value score (highest first)
    predictions.sort((a, b) => b.value_score - a.value_score);
    
    // Return top N
    return predictions.slice(0, limit);
  } catch (error) {
    console.error('Error getting best bets:', error);
    return [];
  }
}

