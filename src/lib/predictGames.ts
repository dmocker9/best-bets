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
 * ONLY uses real data - NO ESTIMATIONS
 */
function calculateOffensiveScore(stats: NFLTeamStats): number {
  // Use ONLY Points Per Game (real data from database)
  const ppgScore = Math.min(100, (stats.points_per_game / 35) * 100);
  
  // Use offensive SRS as secondary metric (real data)
  // SRS ranges typically -10 to +10, normalize to 0-100
  const srsScore = Math.max(0, Math.min(100, ((stats.offensive_rating + 10) / 20) * 100));
  
  // Weight: PPG 70%, SRS 30% (both are real data)
  return (ppgScore * 0.7) + (srsScore * 0.3);
}

/**
 * Calculate defensive strength score (0-100) - lower points allowed is better
 * Uses real yards per play data from team_defense_stats when available
 */
async function calculateDefensiveScore(stats: NFLTeamStats, teamName: string): Promise<number> {
  // Points Allowed score (real data)
  const paScore = Math.max(0, Math.min(100, ((30 - stats.points_allowed_per_game) / 15) * 100));
  
  // Try to get real defensive yards per play from team_defense_stats
  let ypdScore = 0;
  let hasRealYPP = false;
  
  const supabase = getSupabaseClient();
  const { data: defenseStats } = await supabase
    .from('team_defense_stats')
    .select('yards_per_play')
    .eq('team_name', teamName)
    .order('week', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (defenseStats && defenseStats.yards_per_play != null) {
    // Use REAL yards per play data
    const ypd = defenseStats.yards_per_play;
    ypdScore = Math.max(0, Math.min(100, ((6.5 - ypd) / 2.5) * 100));
    hasRealYPP = true;
  } else {
    // No yards per play data available - use only PA score
    // Don't estimate, just weight PA at 100%
    return paScore;
  }
  
  // If we have real YPP, use both metrics
  return (paScore * 0.6) + (ypdScore * 0.4);
}

/**
 * Calculate turnover margin score (0-100)
 * ONLY if we have real data - otherwise return neutral 50
 */
function calculateTurnoverScore(stats: NFLTeamStats): number {
  // Only use if we have REAL turnover data (not null/undefined)
  if (stats.turnover_differential == null) {
    // No real data - return neutral score (no advantage/disadvantage)
    return 50;
  }
  
  const turnoverDiff = stats.turnover_differential;
  
  // Normalize turnover differential (-15 to +15 range)
  const normalized = ((turnoverDiff + 15) / 30) * 100;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Calculate recent form score based on last 3 games (0-100)
 * Enhanced with recency weighting, margin analysis, and opponent quality
 */
function calculateRecentFormScore(performance: string | undefined, stats: NFLTeamStats): number {
  if (!performance) {
    // Estimate from win percentage
    return stats.win_percentage * 100;
  }
  
  const games = performance.split('-');
  
  // Count total wins
  let wins = 0;
  games.forEach(result => {
    if (result === 'W') wins++;
  });
  
  // Base score from W/L record (more nuanced than 0-100)
  let baseScore = 50; // Default neutral
  if (wins === 3) {
    baseScore = 80; // Perfect record, but leave room for quality adjustment
  } else if (wins === 2) {
    baseScore = 55; // Positive but not dominant
  } else if (wins === 1) {
    baseScore = 35; // Struggling but not hopeless
  } else if (wins === 0) {
    baseScore = 20; // Bad, but even 0-3 teams have some value
  }
  
  // Apply recency weighting (most recent game matters more)
  // Format: "W-W-L" where last is most recent
  // Weights: Oldest (25%), Middle (35%), Most recent (40%)
  const recencyWeights = [0.25, 0.35, 0.40];
  let recencyAdjustedScore = 0;
  
  games.forEach((result, index) => {
    if (index < recencyWeights.length) {
      const gameValue = result === 'W' ? 100 : 0;
      recencyAdjustedScore += gameValue * recencyWeights[index];
    }
  });
  
  // Blend base score (60%) with recency-weighted score (40%)
  // This ensures base win count matters, but recent games have extra weight
  const blendedScore = (baseScore * 0.60) + (recencyAdjustedScore * 0.40);
  
  // TODO: Add margin adjustment (+/- 10 points)
  // - Fetch actual game scores from database
  // - Blowout wins (>14 pts): +5-10 points
  // - Close losses (<7 pts): +3-5 points
  // - Blowout losses (>21 pts): -5-10 points
  
  // TODO: Add opponent quality adjustment (+/- 10 points)
  // - Fetch opponent records/SRS from database
  // - Wins vs top teams (SRS > +5): +5-10 points
  // - Losses to bad teams (SRS < -5): -5-10 points
  
  return Math.max(0, Math.min(100, blendedScore));
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
 * Position weights for injury impact calculation
 */
const POSITION_WEIGHTS: Record<string, number> = {
  'QB': 1.0,
  'LT': 0.6,
  'RT': 0.6,
  'EDGE': 0.6,
  'DE': 0.6,
  'CB': 0.6,
  'WR': 0.4,
  'RB': 0.4,
  'LB': 0.4,
  'S': 0.4,
  'TE': 0.3,
  'DL': 0.3,
  'OL': 0.25,
  // Fallback for other positions
  'T': 0.5,   // Tackle (not specified as LT/RT)
  'G': 0.2,   // Guard
  'C': 0.3,   // Center
  'FB': 0.15, // Fullback
  'DB': 0.4,  // Defensive Back
  'OLB': 0.4, // Outside Linebacker
  'ILB': 0.4, // Inside Linebacker
  'MLB': 0.4, // Middle Linebacker
  'DT': 0.3,  // Defensive Tackle
  'NT': 0.25, // Nose Tackle
  'FS': 0.4,  // Free Safety
  'SS': 0.4,  // Strong Safety
  'K': 0.05,  // Kicker
  'P': 0.05,  // Punter
  'LS': 0.05, // Long Snapper
};

// Offensive vs Defensive position classification
const OFFENSIVE_POSITIONS = new Set([
  'QB', 'RB', 'WR', 'TE', 'OL', 'LT', 'RT', 'G', 'C', 'T', 'FB'
]);

const DEFENSIVE_POSITIONS = new Set([
  'DE', 'DL', 'DT', 'NT', 'EDGE', 'LB', 'OLB', 'ILB', 'MLB', 
  'CB', 'S', 'FS', 'SS', 'DB'
]);

/**
 * Calculate injury impact using snap counts and position weights
 * Returns separate offensive and defensive impact scores (0-100)
 */
async function calculateInjuryImpact(teamAbbr: string): Promise<{ 
  offensiveScore: number; 
  defensiveScore: number;
  details: string[];
}> {
  const supabase = getSupabaseClient();
  
  try {
    // Get injured players who are OUT (game_status = 'Out')
    const { data: injuries, error: injuryError } = await supabase
      .from('injuries')
      .select('player_name, position, team_abbr, game_status')
      .eq('team_abbr', teamAbbr)
      .eq('season', 2025)
      .eq('game_status', 'Out'); // Only players with game_status = 'Out'
    
    if (injuryError || !injuries || injuries.length === 0) {
      return { 
        offensiveScore: 100, 
        defensiveScore: 100,
        details: []
      };
    }
    
    // Get snap counts for the injured players
    const { data: snapCounts, error: snapError } = await supabase
      .from('snap_counts')
      .select('player_name, position, offensive_snap_pct, defensive_snap_pct, team_abbr')
      .eq('team_abbr', teamAbbr)
      .eq('season', 2025)
      .order('week_number', { ascending: false })
      .limit(100); // Get recent snap counts
    
    if (snapError || !snapCounts) {
      // If no snap count data, use legacy simplified calculation
      return calculateLegacyInjuryImpact(injuries);
    }
    
    // Create a map of snap counts by player name
    const snapMap = new Map<string, typeof snapCounts[0]>();
    snapCounts.forEach(snap => {
      // Store the most recent snap count for each player
      if (!snapMap.has(snap.player_name)) {
        snapMap.set(snap.player_name, snap);
      }
    });
    
    let offensiveImpact = 0;
    let defensiveImpact = 0;
    const details: string[] = [];
    
    // Calculate impact for each injured player
    for (const injury of injuries) {
      const snapData = snapMap.get(injury.player_name);
      
      if (!snapData) {
        // Player not found in snap counts - skip or use minimal impact
        continue;
      }
      
      const position = (injury.position || '').toUpperCase();
      const positionWeight = POSITION_WEIGHTS[position] || 0.2; // Default weight
      
      // Determine if offensive or defensive player
      const isOffensive = OFFENSIVE_POSITIONS.has(position);
      const isDefensive = DEFENSIVE_POSITIONS.has(position);
      
      if (isOffensive) {
        // Use offensive snap percentage
        const snapPct = snapData.offensive_snap_pct || 0;
        const impact = positionWeight * (snapPct / 100);
        offensiveImpact += impact;
        
        details.push(
          `${injury.player_name} (${position}): ${snapPct.toFixed(1)}% snaps × ${positionWeight} weight = ${impact.toFixed(3)} OFF impact`
        );
      }
      
      if (isDefensive) {
        // Use defensive snap percentage
        const snapPct = snapData.defensive_snap_pct || 0;
        const impact = positionWeight * (snapPct / 100);
        defensiveImpact += impact;
        
        details.push(
          `${injury.player_name} (${position}): ${snapPct.toFixed(1)}% snaps × ${positionWeight} weight = ${impact.toFixed(3)} DEF impact`
        );
      }
    }
    
    // Scale constants
    const OFFENSIVE_SCALE = 12;
    const DEFENSIVE_SCALE = 10;
    
    // Calculate percentage impact (scaled to 0-100)
    // Higher raw impact = lower score
    const offensivePenalty = Math.min(100, (offensiveImpact / OFFENSIVE_SCALE) * 100);
    const defensivePenalty = Math.min(100, (defensiveImpact / DEFENSIVE_SCALE) * 100);
    
    const offensiveScore = Math.max(0, 100 - offensivePenalty);
    const defensiveScore = Math.max(0, 100 - defensivePenalty);
    
    details.push(`\nTotal Offensive Impact: ${offensiveImpact.toFixed(3)} → Penalty: ${offensivePenalty.toFixed(1)}% → Score: ${offensiveScore.toFixed(1)}`);
    details.push(`Total Defensive Impact: ${defensiveImpact.toFixed(3)} → Penalty: ${defensivePenalty.toFixed(1)}% → Score: ${defensiveScore.toFixed(1)}`);
    
    return {
      offensiveScore,
      defensiveScore,
      details
    };
    
  } catch (error) {
    console.error('Error calculating injury impact:', error);
    return { 
      offensiveScore: 100, 
      defensiveScore: 100,
      details: ['Error fetching injury data']
    };
  }
}

/**
 * Legacy injury calculation (fallback when snap counts not available)
 */
function calculateLegacyInjuryImpact(injuries: any[]): {
  offensiveScore: number;
  defensiveScore: number;
  details: string[];
} {
  let offensiveImpact = 0;
  let defensiveImpact = 0;
  const details: string[] = ['Using legacy calculation (no snap count data)'];
  
  injuries.forEach((injury: any) => {
    const position = (injury.position || '').toUpperCase();
    const weight = POSITION_WEIGHTS[position] || 0.2;
    
    // Assume injured starter plays ~60% of snaps
    const estimatedSnapPct = 60;
    const impact = weight * (estimatedSnapPct / 100);
    
    if (OFFENSIVE_POSITIONS.has(position)) {
      offensiveImpact += impact;
      details.push(`${injury.player_name} (${position}): Est. impact ${impact.toFixed(3)} OFF`);
    }
    
    if (DEFENSIVE_POSITIONS.has(position)) {
      defensiveImpact += impact;
      details.push(`${injury.player_name} (${position}): Est. impact ${impact.toFixed(3)} DEF`);
    }
  });
  
  const OFFENSIVE_SCALE = 12;
  const DEFENSIVE_SCALE = 10;
  
  const offensivePenalty = Math.min(100, (offensiveImpact / OFFENSIVE_SCALE) * 100);
  const defensivePenalty = Math.min(100, (defensiveImpact / DEFENSIVE_SCALE) * 100);
  
  return {
    offensiveScore: Math.max(0, 100 - offensivePenalty),
    defensiveScore: Math.max(0, 100 - defensivePenalty),
    details
  };
}

/**
 * Calculate comprehensive team score with injury impact
 */
async function calculateTeamScore(
  stats: NFLTeamStats,
  isHome: boolean,
  teamAbbr: string,
  teamFullName: string
): Promise<{ 
  score: number; 
  breakdown: Record<string, number>;
  injuryDetails?: string[];
}> {
  // Calculate base scores (offensive is sync, defensive is async)
  const baseOffensiveScore = calculateOffensiveScore(stats);
  const baseDefensiveScore = await calculateDefensiveScore(stats, teamFullName);
  const turnoverScore = calculateTurnoverScore(stats);
  const recentFormScore = calculateRecentFormScore(stats.last_3_games_performance, stats);
  const homeFieldScore = isHome ? calculateHomeFieldScore(stats.home_record, stats) : 50;
  
  // Get injury impact (async call to database)
  const injuryImpact = await calculateInjuryImpact(teamAbbr);
  
  // Apply injury penalties to offensive and defensive scores
  // Injury scores are 0-100 where 100 = no impact, 0 = severe impact
  // We multiply the base scores by the injury factor
  const offensiveScore = baseOffensiveScore * (injuryImpact.offensiveScore / 100);
  const defensiveScore = baseDefensiveScore * (injuryImpact.defensiveScore / 100);
  
  // Combined injury score for overall team impact (average of OFF and DEF)
  const combinedInjuryScore = (injuryImpact.offensiveScore + injuryImpact.defensiveScore) / 2;
  
  const totalScore = 
    (offensiveScore * PREDICTION_WEIGHTS.offensive_strength) +
    (defensiveScore * PREDICTION_WEIGHTS.defensive_strength) +
    (turnoverScore * PREDICTION_WEIGHTS.turnover_margin) +
    (recentFormScore * PREDICTION_WEIGHTS.recent_form) +
    (homeFieldScore * PREDICTION_WEIGHTS.home_field_advantage) +
    (combinedInjuryScore * PREDICTION_WEIGHTS.injury_impact);
  
  return {
    score: totalScore,
    breakdown: {
      offensive: offensiveScore,
      defensive: defensiveScore,
      turnover: turnoverScore,
      recentForm: recentFormScore,
      homeField: homeFieldScore,
      injury: combinedInjuryScore,
    },
    injuryDetails: injuryImpact.details,
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
  // 1. Edge Magnitude (50% weight) - How much we disagree with Vegas
  // Larger edges = more conviction in our model's view
  const edgeMagnitude = Math.abs(predictedMargin - (-vegasSpread));
  const edgeScore = Math.min(100, (edgeMagnitude / 6) * 100); // 6 points = 100%
  
  // 2. Matchup Clarity (30% weight) - Smart handling of strength gaps
  // LARGE gap + betting favorite = HIGH confidence (dominant team will cover)
  // SMALL gap = HIGH confidence (predictable close game)
  // LARGE gap + betting underdog = LOWER confidence (variance in blowout margin)
  const strengthGap = Math.abs(homeStrength - awayStrength);
  const strongerTeam = homeStrength > awayStrength ? 'home' : 'away';
  const modelFavorsHome = predictedMargin > 0;
  const modelFavorsAway = predictedMargin < 0;
  
  let matchupClarityScore = 0;
  if (strengthGap < 10) {
    // Close matchup: highly predictable margin (60-100% certainty)
    matchupClarityScore = 100 - (strengthGap * 4); // 0 gap = 100%, 10 gap = 60%
  } else {
    // Mismatch: check if we're backing the favorite or underdog
    const backingFavorite = 
      (strongerTeam === 'home' && modelFavorsHome) || 
      (strongerTeam === 'away' && modelFavorsAway);
    
    if (backingFavorite) {
      // Betting favorite in mismatch = high confidence (they should dominate)
      matchupClarityScore = Math.min(100, 70 + (strengthGap / 3)); // 10 gap = 73%, 20 gap = 77%, 30 gap = 80%
    } else {
      // Betting underdog in mismatch = lower confidence (could get blown out)
      matchupClarityScore = Math.max(20, 60 - (strengthGap / 2)); // 10 gap = 55%, 20 gap = 50%, 30 gap = 45%
    }
  }
  
  // 3. Team Consistency (20% weight)
  // Teams with moderate margins are more predictable
  const homeConsistency = calculateConsistency(homeStats);
  const awayConsistency = calculateConsistency(awayStats);
  const avgConsistency = (homeConsistency + awayConsistency) / 2;
  
  // Weighted average (Record Quality removed, Edge increased to 50%)
  const finalConfidence = 
    (edgeScore * 0.50) +
    (matchupClarityScore * 0.30) +
    (avgConsistency * 0.20);
  
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
 * Map team full names to abbreviations
 */
const TEAM_NAME_TO_ABBR: Record<string, string> = {
  'Arizona Cardinals': 'ARI',
  'Atlanta Falcons': 'ATL',
  'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF',
  'Carolina Panthers': 'CAR',
  'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN',
  'Detroit Lions': 'DET',
  'Green Bay Packers': 'GNB',
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KAN',
  'Las Vegas Raiders': 'LVR',
  'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR',
  'Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NWE',
  'New Orleans Saints': 'NOR',
  'New York Giants': 'NYG',
  'New York Jets': 'NYJ',
  'Philadelphia Eagles': 'PHI',
  'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SFO',
  'Seattle Seahawks': 'SEA',
  'Tampa Bay Buccaneers': 'TAM',
  'Tennessee Titans': 'TEN',
  'Washington Commanders': 'WAS',
};

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
    
    // Get team abbreviations for injury lookup
    const homeAbbr = TEAM_NAME_TO_ABBR[game.home_team] || game.home_team;
    const awayAbbr = TEAM_NAME_TO_ABBR[game.away_team] || game.away_team;
    
    // Calculate team scores for confidence calculation (now async with injury impact and real defensive data)
    const homeScore = await calculateTeamScore(homeStats, true, homeAbbr, game.home_team);
    const awayScore = await calculateTeamScore(awayStats, false, awayAbbr, game.away_team);
    
    // Use SRS differential for spread prediction with dampening
    // SRS represents team strength but needs to be calibrated for actual spreads
    const homeSRS = homeStats.offensive_rating + homeStats.defensive_rating;
    const awaySRS = awayStats.offensive_rating + awayStats.defensive_rating;
    const HOME_FIELD_ADVANTAGE = 1.5; // Adjusted NFL home field advantage
    
    // Apply conservative dampening factor: 0.70 prevents extreme spreads
    const SRS_DAMPENING = 0.70;
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
    const REALISTIC_EDGE_MIN = 1.5; // Lowered from 2.5 to be less conservative
    const REALISTIC_EDGE_MAX = 7.5;
    const isRealisticEdge = disagreement >= REALISTIC_EDGE_MIN && disagreement <= REALISTIC_EDGE_MAX;
    
    // Tiered confidence thresholds based on edge size
    // Larger edges require higher confidence, smaller edges can have lower confidence
    let requiredConfidence = 60; // Base threshold (was 65)
    if (disagreement >= 5.0) {
      requiredConfidence = 65; // Large edges need more confidence
    } else if (disagreement >= 3.5) {
      requiredConfidence = 62; // Medium edges
    }
    
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
    
    // Add injury impact to reasoning if significant
    let fullReasoning = reasoning;
    if (homeScore.injuryDetails && homeScore.injuryDetails.length > 0) {
      fullReasoning += `\n\n${game.home_team} Injuries:\n` + homeScore.injuryDetails.join('\n');
    }
    if (awayScore.injuryDetails && awayScore.injuryDetails.length > 0) {
      fullReasoning += `\n\n${game.away_team} Injuries:\n` + awayScore.injuryDetails.join('\n');
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
      reasoning: fullReasoning,
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
    
    const homeStats = await getTeamStats(prediction.home_team) || {} as NFLTeamStats;
    const awayStats = await getTeamStats(prediction.away_team) || {} as NFLTeamStats;
    const homeAbbr = TEAM_NAME_TO_ABBR[prediction.home_team] || prediction.home_team;
    const awayAbbr = TEAM_NAME_TO_ABBR[prediction.away_team] || prediction.away_team;
    
    const homeScore = await calculateTeamScore(homeStats, true, homeAbbr, prediction.home_team);
    const awayScore = await calculateTeamScore(awayStats, false, awayAbbr, prediction.away_team);
    
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

