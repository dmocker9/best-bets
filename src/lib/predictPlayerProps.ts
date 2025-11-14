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

/**
 * PLAYER PROP PREDICTION MODEL
 * 
 * Predicts over/under for player props based on:
 * - Defensive Matchup Data (55%) - HIGHEST WEIGHT: Matchup is king
 * - Player Statistical Data (35%) - Performance baseline
 * - Game Environment Data (10%) - Game script and context
 */

// Weighted system for player prop predictions
const PROP_WEIGHTS = {
  player_stats: 0.35,        // Historical performance (season stats, consistency)
  defensive_matchup: 0.55,   // Opponent defensive strength vs position - MOST IMPORTANT
  game_environment: 0.10,    // Vegas totals, injuries, game script
};

// Position-specific prop market mappings
const QB_MARKETS = ['player_pass_yds', 'player_pass_tds', 'player_pass_attempts', 'player_pass_completions'];
const RB_MARKETS = ['player_rush_yds', 'player_rush_attempts', 'player_reception_yds', 'player_receptions', 'player_anytime_td'];
const WR_TE_MARKETS = ['player_reception_yds', 'player_receptions', 'player_anytime_td'];

export interface PlayerProp {
  id: number;
  event_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  player_name: string;
  prop_market: string;
  bookmaker_key: string;
  line: number | null;
  odds: number;
  bet_type: string;
}

export interface PlayerPropPrediction {
  prop_id: number;
  player_name: string;
  team: string;
  opponent: string;
  position: string;
  prop_market: string;
  prop_line: number;
  predicted_value: number;
  confidence_score: number;
  value_score: number; // Difference between predicted and line
  recommended_bet: 'OVER' | 'UNDER' | null;
  odds: number;
  reasoning: string;
  breakdown: {
    player_stats_score: number;
    defensive_matchup_score: number;
    game_environment_score: number;
    season_avg: number;
    matchup_adjustment: number;
    game_script_adjustment: number;
  };
}

// Team abbreviation mapping (consistent with predictGames.ts)
const TEAM_ABBR_MAP: Record<string, string> = {
  'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF', 'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE', 'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GNB',
  'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KAN', 'Las Vegas Raiders': 'LVR', 'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR', 'Miami Dolphins': 'MIA', 'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NWE', 'New Orleans Saints': 'NOR', 'New York Giants': 'NYG',
  'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SFO', 'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TAM',
  'Tennessee Titans': 'TEN', 'Washington Commanders': 'WAS',
};

/**
 * Get player's team from their stats (check all position tables)
 */
async function getPlayerTeam(playerName: string): Promise<{ team: string; position: string } | null> {
  const supabase = getSupabaseClient();
  
  // Try passing stats first (QBs)
  const { data: qbData } = await supabase
    .from('player_passing_stats')
    .select('team_abbr, position')
    .ilike('player_name', playerName)
    .eq('season', 2025)
    .limit(1)
    .maybeSingle();
  
  if (qbData) return { team: qbData.team_abbr, position: qbData.position || 'QB' };
  
  // Try rushing stats (RBs)
  const { data: rbData } = await supabase
    .from('player_rushing_stats')
    .select('team_abbr, position')
    .ilike('player_name', playerName)
    .eq('season', 2025)
    .limit(1)
    .maybeSingle();
  
  if (rbData) return { team: rbData.team_abbr, position: rbData.position || 'RB' };
  
  // Try receiving stats (WRs/TEs)
  const { data: wrData } = await supabase
    .from('player_receiving_stats')
    .select('team_abbr, position')
    .ilike('player_name', playerName)
    .eq('season', 2025)
    .limit(1)
    .maybeSingle();
  
  if (wrData) return { team: wrData.team_abbr, position: wrData.position || 'WR' };
  
  return null;
}

/**
 * Get the starting QB for a team in 2025
 */
async function getTeamQB(teamAbbr: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  
  const { data: qbData } = await supabase
    .from('player_passing_stats')
    .select('player_name, games_played, yards_per_game')
    .eq('team_abbr', teamAbbr)
    .eq('season', 2025)
    .gte('games_played', 3)
    .order('games_played', { ascending: false })
    .order('yards_per_game', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  return qbData?.player_name || null;
}

/**
 * Validate that any player names mentioned in reasoning text are actually on the team in 2025
 * Returns cleaned reasoning with invalid player references removed or corrected
 */
async function validateReasoningPlayerReferences(
  reasoning: string,
  playerTeam: string,
  season: number = 2025
): Promise<string> {
  const supabase = getSupabaseClient();
  let cleanedReasoning = reasoning;
  
  // Common QB names that might be incorrectly referenced
  const commonQBNames = [
    'Kirk Cousins', 'Tom Brady', 'Aaron Rodgers', 'Russell Wilson',
    'Dak Prescott', 'Josh Allen', 'Patrick Mahomes', 'Lamar Jackson',
    'Joe Burrow', 'Justin Herbert', 'Trevor Lawrence', 'Tua Tagovailoa'
  ];
  
  // Check for common QB names and validate against actual team QB
  for (const qbName of commonQBNames) {
    if (reasoning.includes(qbName)) {
      const actualQB = await getTeamQB(playerTeam);
      if (actualQB && actualQB !== qbName) {
        // Replace incorrect QB name with actual QB
        cleanedReasoning = cleanedReasoning.replace(
          new RegExp(qbName, 'gi'),
          actualQB
        );
        // Silent fix - no warning needed
      } else if (!actualQB) {
        // Remove reference if no QB found
        cleanedReasoning = cleanedReasoning.replace(
          new RegExp(`\\b${qbName}\\b[^.]*\\.?`, 'gi'),
          ''
        );
        // Silent fix - no warning needed
      }
    }
  }
  
  // Extract any other player names mentioned (basic pattern matching)
  // Look for patterns like "Player Name" or "Name's" or "Name loves"
  const playerNamePattern = /([A-Z][a-z]+ [A-Z][a-z]+(?: Jr\.?| Sr\.?| III)?)/g;
  const matches = reasoning.matchAll(playerNamePattern);
  
  for (const match of matches) {
    const mentionedName = match[1];
    // Skip if it's the prop player themselves
    if (reasoning.includes(`player_name`) && mentionedName === reasoning.match(/player_name: (.+)/)?.[1]) {
      continue;
    }
    
    // Check if this player is on the team
    const playerInfo = await getPlayerTeam(mentionedName);
    if (playerInfo && playerInfo.team === playerTeam) {
      // Player is valid, check if they're injured
      const { data: injury } = await supabase
        .from('injuries')
        .select('game_status')
        .ilike('player_name', mentionedName)
        .eq('team_abbr', playerTeam)
        .eq('season', season)
        .eq('game_status', 'Out')
        .limit(1)
        .maybeSingle();
      
      if (injury) {
        // Silent validation - player mentioned but out (reasoning may still be valid)
      }
    } else if (playerInfo && playerInfo.team !== playerTeam) {
      // Silent validation - player on different team (may be opponent reference)
    } else {
      // Silent validation - player not found (may be historical/opponent reference)
    }
  }
  
  return cleanedReasoning;
}

/**
 * Calculate Player Statistical Score (50% weight)
 * Based on season-to-date performance, consistency, and usage
 */
async function calculatePlayerStatsScore(
  playerName: string,
  propMarket: string,
  propLine: number,
  position: string,
  teamAbbr: string
): Promise<{ score: number; seasonAvg: number; consistency: number; details: string[] }> {
  const supabase = getSupabaseClient();
  const details: string[] = [];
  
  try {
    let seasonAvg = 0;
    let gamesPlayed = 0;
    let consistency = 50; // Default neutral
    
    // QB Props (Pass Yards, Pass TDs, Completions, Attempts)
    if (QB_MARKETS.includes(propMarket)) {
      const { data: stats } = await supabase
        .from('player_passing_stats')
        .select('*')
        .ilike('player_name', playerName)
        .eq('season', 2025)
        .maybeSingle();
      
      if (stats) {
        gamesPlayed = stats.games_played || 1;
        
        if (propMarket === 'player_pass_yds') {
          seasonAvg = stats.passing_yards / gamesPlayed;
          details.push(`Season Avg: ${seasonAvg.toFixed(1)} pass yds/game`);
        } else if (propMarket === 'player_pass_tds') {
          seasonAvg = stats.passing_tds / gamesPlayed;
          details.push(`Season Avg: ${seasonAvg.toFixed(2)} pass TDs/game`);
        } else if (propMarket === 'player_pass_completions') {
          seasonAvg = stats.completions / gamesPlayed;
          details.push(`Season Avg: ${seasonAvg.toFixed(1)} completions/game`);
        } else if (propMarket === 'player_pass_attempts') {
          seasonAvg = stats.attempts / gamesPlayed;
          details.push(`Season Avg: ${seasonAvg.toFixed(1)} attempts/game`);
        }
        
        // QB consistency based on success rate and passer rating
        const successRate = stats.success_rate || 50;
        const passerRating = stats.passer_rating || 90;
        consistency = Math.min(100, (successRate + (passerRating / 1.58)) / 2);
        details.push(`Consistency: ${consistency.toFixed(1)} (success rate: ${successRate.toFixed(1)}%)`);
      }
    }
    
    // RB Props (Rush Yards, Rush Attempts, Receptions, Receiving Yards)
    if (RB_MARKETS.includes(propMarket) && (position === 'RB' || position === 'FB')) {
      // Get rushing stats
      const { data: rushStats } = await supabase
        .from('player_rushing_stats')
        .select('*')
        .ilike('player_name', playerName)
        .eq('season', 2025)
        .maybeSingle();
      
      // Get receiving stats (many RBs catch passes)
      const { data: recStats } = await supabase
        .from('player_receiving_stats')
        .select('*')
        .ilike('player_name', playerName)
        .eq('season', 2025)
        .maybeSingle();
      
      if (rushStats) {
        gamesPlayed = rushStats.games_played || 1;
        
        if (propMarket === 'player_rush_yds') {
          seasonAvg = rushStats.rushing_yards / gamesPlayed;
          details.push(`Season Avg: ${seasonAvg.toFixed(1)} rush yds/game`);
        } else if (propMarket === 'player_rush_attempts') {
          seasonAvg = rushStats.rushing_attempts / gamesPlayed;
          details.push(`Season Avg: ${seasonAvg.toFixed(1)} rush att/game`);
        }
        
        // RB consistency based on yards per attempt and success rate
        const ypa = rushStats.yards_per_attempt || 4.0;
        const successRate = rushStats.success_rate || 40;
        consistency = Math.min(100, ((ypa / 6.0) * 50) + (successRate / 2));
        details.push(`Consistency: ${consistency.toFixed(1)} (YPA: ${ypa.toFixed(2)})`);
      }
      
      if (recStats && (propMarket === 'player_reception_yds' || propMarket === 'player_receptions')) {
        gamesPlayed = recStats.games_played || gamesPlayed || 1;
        
        if (propMarket === 'player_reception_yds') {
          seasonAvg = recStats.receiving_yards / gamesPlayed;
          details.push(`Season Avg: ${seasonAvg.toFixed(1)} rec yds/game`);
        } else if (propMarket === 'player_receptions') {
          seasonAvg = recStats.receptions / gamesPlayed;
          details.push(`Season Avg: ${seasonAvg.toFixed(1)} rec/game`);
        }
      }
    }
    
    // WR/TE Props (Receptions, Receiving Yards)
    if (WR_TE_MARKETS.includes(propMarket) && (position === 'WR' || position === 'TE')) {
      const { data: stats } = await supabase
        .from('player_receiving_stats')
        .select('*')
        .ilike('player_name', playerName)
        .eq('season', 2025)
        .maybeSingle();
      
      if (stats) {
        gamesPlayed = stats.games_played || 1;
        
        if (propMarket === 'player_reception_yds') {
          seasonAvg = stats.receiving_yards / gamesPlayed;
          details.push(`Season Avg: ${seasonAvg.toFixed(1)} rec yds/game`);
          
          // Target share (critical for WR/TE)
          const targetShare = (stats.targets / gamesPlayed).toFixed(1);
          details.push(`Target Share: ${targetShare} tgts/game`);
        } else if (propMarket === 'player_receptions') {
          seasonAvg = stats.receptions / gamesPlayed;
          details.push(`Season Avg: ${seasonAvg.toFixed(1)} rec/game`);
        }
        
        // WR/TE consistency based on catch percentage and yards per target
        const catchPct = stats.catch_percentage || 60;
        const ypt = stats.yards_per_target || 7.0;
        consistency = Math.min(100, (catchPct + ((ypt / 10.0) * 40)));
        details.push(`Consistency: ${consistency.toFixed(1)} (catch%: ${catchPct.toFixed(1)}%)`);
      }
    }
    
    // TD props (all positions)
    if (propMarket === 'player_anytime_td') {
      // Get total TDs from total_player_stats
      const { data: totalStats } = await supabase
        .from('total_player_stats')
        .select('*')
        .ilike('player_name', playerName)
        .eq('season', 2025)
        .maybeSingle();
      
      if (totalStats) {
        gamesPlayed = totalStats.games_played || 1;
        seasonAvg = totalStats.total_tds / gamesPlayed;
        details.push(`Season Avg: ${seasonAvg.toFixed(2)} TDs/game`);
        
        // TD consistency (higher TD rate = more reliable scorer)
        consistency = Math.min(100, (seasonAvg / 1.0) * 100);
        details.push(`TD Consistency: ${consistency.toFixed(1)}`);
      }
    }
    
    // Calculate score based on how player's average compares to the line
    let performanceScore = 50; // Neutral baseline
    
    if (seasonAvg > 0) {
      const diffFromLine = seasonAvg - propLine;
      const percentAboveLine = (diffFromLine / propLine) * 100;
      
      // Score scales from 0-100 based on how far above/below line
      // +20% above line = 80 score, -20% below line = 20 score
      performanceScore = 50 + (percentAboveLine * 1.5);
      performanceScore = Math.max(0, Math.min(100, performanceScore));
      
      details.push(`Performance vs Line: ${diffFromLine >= 0 ? '+' : ''}${diffFromLine.toFixed(1)} (${percentAboveLine >= 0 ? '+' : ''}${percentAboveLine.toFixed(1)}%)`);
    }
    
    // Sample size confidence (more games = more reliable)
    const sampleSizeConfidence = Math.min(100, (gamesPlayed / 8) * 100);
    details.push(`Sample Size: ${gamesPlayed} games (${sampleSizeConfidence.toFixed(0)}% confidence)`);
    
    // Final player stats score: weighted average of performance and consistency
    const finalScore = (performanceScore * 0.60) + (consistency * 0.30) + (sampleSizeConfidence * 0.10);
    
    return {
      score: finalScore,
      seasonAvg: seasonAvg,
      consistency: consistency,
      details: details
    };
  } catch (error) {
    console.error('Error calculating player stats score:', error);
    return {
      score: 50, // Neutral
      seasonAvg: propLine, // Use line as fallback
      consistency: 50,
      details: ['Error fetching player stats']
    };
  }
}

/**
 * Detect if a player is elite based on efficiency metrics
 */
async function isElitePlayer(
  playerName: string,
  position: string,
  propMarket: string,
  teamAbbr: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  try {
    if (position === 'WR' || position === 'TE') {
      const { data: stats } = await supabase
        .from('player_receiving_stats')
        .select('yards_per_target, catch_percentage, targets, games_played')
        .ilike('player_name', playerName)
        .eq('team_abbr', teamAbbr)
        .eq('season', 2025)
        .maybeSingle();
      
      if (stats && stats.games_played > 0) {
        const ypt = stats.yards_per_target || 0;
        const catchPct = stats.catch_percentage || 0;
        const targetsPerGame = (stats.targets || 0) / stats.games_played;
        
        // Elite criteria: High YPT (>9.5), high catch rate (>70%), and significant targets (>5/game)
        return ypt > 9.5 && catchPct > 70 && targetsPerGame > 5;
      }
    } else if (position === 'RB') {
      const { data: rushStats } = await supabase
        .from('player_rushing_stats')
        .select('yards_per_attempt, success_rate, rushing_attempts, games_played')
        .ilike('player_name', playerName)
        .eq('team_abbr', teamAbbr)
        .eq('season', 2025)
        .maybeSingle();
      
      if (rushStats && rushStats.games_played > 0) {
        const ypa = rushStats.yards_per_attempt || 0;
        const successRate = rushStats.success_rate || 0;
        const attPerGame = (rushStats.rushing_attempts || 0) / rushStats.games_played;
        
        // Elite criteria: High YPA (>4.8), high success rate (>50%), significant volume (>15 att/game)
        return ypa > 4.8 && successRate > 50 && attPerGame > 15;
      }
    } else if (position === 'QB') {
      const { data: stats } = await supabase
        .from('player_passing_stats')
        .select('passer_rating, success_rate, attempts, games_played')
        .ilike('player_name', playerName)
        .eq('team_abbr', teamAbbr)
        .eq('season', 2025)
        .maybeSingle();
      
      if (stats && stats.games_played > 0) {
        const rating = stats.passer_rating || 0;
        const successRate = stats.success_rate || 0;
        
        // Elite criteria: High passer rating (>95), high success rate (>55%)
        return rating > 95 && successRate > 55;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Calculate Defensive Matchup Score (55% weight)
 * Based on opponent's defense vs that position
 * Elite players use 0.15 sensitivity, others use 0.40
 */
async function calculateDefensiveMatchupScore(
  position: string,
  propMarket: string,
  opponentTeam: string,
  propLine: number,
  playerName?: string,
  playerTeam?: string
): Promise<{ score: number; adjustment: number; details: string[] }> {
  const supabase = getSupabaseClient();
  const details: string[] = [];
  
  try {
    // Check if player is elite (affects matchup sensitivity)
    const isElite = playerName && playerTeam 
      ? await isElitePlayer(playerName, position, propMarket, playerTeam)
      : false;
    
    // Elite players: 0.15 sensitivity (matchups matter less)
    // Regular players: 0.40 sensitivity (matchups matter more)
    const matchupSensitivity = isElite ? 0.15 : 0.40;
    
    // Get opponent's full name from abbreviation
    const opponentFullName = Object.keys(TEAM_ABBR_MAP).find(
      key => TEAM_ABBR_MAP[key] === opponentTeam
    ) || opponentTeam;
    
    let defenseRating = 50; // Neutral baseline
    let adjustment = 0;
    
    // QB matchups - use defense_vs_qb table
    if (QB_MARKETS.includes(propMarket)) {
      const { data: defStats } = await supabase
        .from('defense_vs_qb')
        .select('*')
        .or(`team_name.eq.${opponentFullName},team_abbr.eq.${opponentTeam}`)
        .eq('season', 2025)
        .maybeSingle();
      
      if (defStats) {
        const gamesPlayed = defStats.games_played || 1;
        
        if (propMarket === 'player_pass_yds') {
          const passYdsAllowedPerGame = defStats.pass_yds / gamesPlayed;
          // League avg ~220 yds/game, compare to that
          const vsLeagueAvg = passYdsAllowedPerGame - 220;
          adjustment = vsLeagueAvg * matchupSensitivity; // Elite: 0.15, Regular: 0.40
          
          // Score: Strong defense (low yards) = low score = favor UNDER
          defenseRating = Math.max(0, Math.min(100, 100 - ((passYdsAllowedPerGame - 180) / 100 * 100)));
          
          details.push(`Opp allows ${passYdsAllowedPerGame.toFixed(1)} pass yds/game (league avg: 220)`);
          details.push(`Matchup adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(1)} yards`);
        } else if (propMarket === 'player_pass_tds') {
          const passTDsAllowedPerGame = defStats.pass_td / gamesPlayed;
          const vsLeagueAvg = passTDsAllowedPerGame - 1.6; // League avg ~1.6 TDs/game
          adjustment = vsLeagueAvg * matchupSensitivity;
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((passTDsAllowedPerGame - 0.8) / 2.0 * 100)));
          
          details.push(`Opp allows ${passTDsAllowedPerGame.toFixed(2)} pass TDs/game (league avg: 1.6)`);
          details.push(`Matchup adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(2)} TDs`);
        } else if (propMarket === 'player_pass_completions') {
          const completionsAllowedPerGame = defStats.pass_cmp / gamesPlayed;
          const vsLeagueAvg = completionsAllowedPerGame - 22; // League avg ~22 completions/game
          adjustment = vsLeagueAvg * (matchupSensitivity * 0.15); // Scaled for completions
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((completionsAllowedPerGame - 18) / 12 * 100)));
          
          details.push(`Opp allows ${completionsAllowedPerGame.toFixed(1)} completions/game (league avg: 22)`);
          details.push(`Matchup adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(1)} completions`);
        } else if (propMarket === 'player_pass_attempts') {
          const attemptsAllowedPerGame = defStats.pass_att / gamesPlayed;
          const vsLeagueAvg = attemptsAllowedPerGame - 35; // League avg ~35 attempts/game
          adjustment = vsLeagueAvg * (matchupSensitivity * 0.125); // Scaled for attempts
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((attemptsAllowedPerGame - 28) / 18 * 100)));
          
          details.push(`Opp allows ${attemptsAllowedPerGame.toFixed(1)} pass attempts/game (league avg: 35)`);
          details.push(`Matchup adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(1)} attempts`);
        }
        
        // Sacks allowed affect QB props negatively
        const sacksPerGame = defStats.sacks / gamesPlayed;
        if (sacksPerGame > 2.5) {
          adjustment -= (sacksPerGame - 2.5) * 2; // Aggressive pass rush hurts QB
          details.push(`High sack rate: ${sacksPerGame.toFixed(1)} sacks/game (reduces production)`);
        }
      }
    }
    
    // RB matchups - use defense_vs_rb table
    if (RB_MARKETS.includes(propMarket) && (position === 'RB' || position === 'FB')) {
      const { data: defStats } = await supabase
        .from('defense_vs_rb')
        .select('*')
        .or(`team_name.eq.${opponentFullName},team_abbr.eq.${opponentTeam}`)
        .eq('season', 2025)
        .maybeSingle();
      
      if (defStats) {
        const gamesPlayed = defStats.games_played || 1;
        
        if (propMarket === 'player_rush_yds') {
          const rushYdsAllowedPerGame = defStats.rush_yds / gamesPlayed;
          const vsLeagueAvg = rushYdsAllowedPerGame - 115; // League avg ~115 rush yds/game
          adjustment = vsLeagueAvg * matchupSensitivity;
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((rushYdsAllowedPerGame - 80) / 80 * 100)));
          
          details.push(`Opp allows ${rushYdsAllowedPerGame.toFixed(1)} rush yds to RBs/game (league avg: 115)`);
          details.push(`Matchup adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(1)} yards`);
        } else if (propMarket === 'player_rush_attempts') {
          // Estimate rush attempts from rush yards (yards per attempt ~4.0)
          const rushYdsAllowedPerGame = defStats.rush_yds / gamesPlayed;
          const estimatedRushAttAllowed = rushYdsAllowedPerGame / 4.0;
          const vsLeagueAvg = estimatedRushAttAllowed - 28; // League avg ~28 rush att to RBs/game
          adjustment = vsLeagueAvg * (matchupSensitivity * 0.2); // Scaled for attempts
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((estimatedRushAttAllowed - 20) / 20 * 100)));
          
          details.push(`Opp allows ~${estimatedRushAttAllowed.toFixed(1)} rush attempts to RBs/game (est. from yards)`);
          details.push(`Matchup adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(1)} attempts`);
        } else if (propMarket === 'player_reception_yds') {
          const recYdsAllowedPerGame = defStats.rec_yds / gamesPlayed;
          const vsLeagueAvg = recYdsAllowedPerGame - 40; // League avg ~40 rec yds to RBs
          adjustment = vsLeagueAvg * matchupSensitivity;
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((recYdsAllowedPerGame - 20) / 60 * 100)));
          
          details.push(`Opp allows ${recYdsAllowedPerGame.toFixed(1)} rec yds to RBs/game`);
        } else if (propMarket === 'player_anytime_td') {
          const totalTDsAllowed = (defStats.rush_td + defStats.rec_td) / gamesPlayed;
          adjustment = (totalTDsAllowed - 1.0) * 0.08; // League avg ~1 TD to RBs
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((totalTDsAllowed - 0.5) / 1.5 * 100)));
          
          details.push(`Opp allows ${totalTDsAllowed.toFixed(2)} TDs to RBs/game`);
        }
      }
    }
    
    // WR matchups - use defense_vs_wr table
    if (WR_TE_MARKETS.includes(propMarket) && position === 'WR') {
      const { data: defStats } = await supabase
        .from('defense_vs_wr')
        .select('*')
        .or(`team_name.eq.${opponentFullName},team_abbr.eq.${opponentTeam}`)
        .eq('season', 2025)
        .maybeSingle();
      
      if (defStats) {
        const gamesPlayed = defStats.games_played || 1;
        
        if (propMarket === 'player_reception_yds') {
          const recYdsAllowedPerGame = defStats.rec_yds / gamesPlayed;
          const vsLeagueAvg = recYdsAllowedPerGame - 190; // League avg ~190 rec yds to WRs
          adjustment = vsLeagueAvg * matchupSensitivity;
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((recYdsAllowedPerGame - 150) / 100 * 100)));
          
          details.push(`Opp allows ${recYdsAllowedPerGame.toFixed(1)} rec yds to WRs/game (league avg: 190)`);
          details.push(`Matchup adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(1)} yards`);
        } else if (propMarket === 'player_receptions') {
          const receptionsAllowed = defStats.receptions / gamesPlayed;
          const vsLeagueAvg = receptionsAllowed - 17; // League avg ~17 rec to WRs
          adjustment = vsLeagueAvg * (matchupSensitivity * 0.2); // Scaled for receptions
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((receptionsAllowed - 12) / 12 * 100)));
          
          details.push(`Opp allows ${receptionsAllowed.toFixed(1)} rec to WRs/game`);
        } else if (propMarket === 'player_anytime_td') {
          const tdsAllowed = defStats.rec_td / gamesPlayed;
          adjustment = (tdsAllowed - 1.2) * 0.10;
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((tdsAllowed - 0.6) / 1.5 * 100)));
          
          details.push(`Opp allows ${tdsAllowed.toFixed(2)} TDs to WRs/game`);
        }
      }
    }
    
    // TE matchups - use defense_vs_te table
    if (WR_TE_MARKETS.includes(propMarket) && position === 'TE') {
      const { data: defStats } = await supabase
        .from('defense_vs_te')
        .select('*')
        .or(`team_name.eq.${opponentFullName},team_abbr.eq.${opponentTeam}`)
        .eq('season', 2025)
        .maybeSingle();
      
      if (defStats) {
        const gamesPlayed = defStats.games_played || 1;
        
        if (propMarket === 'player_reception_yds') {
          const recYdsAllowedPerGame = defStats.rec_yds / gamesPlayed;
          const leagueAvg = 55; // League avg ~55 rec yds to TEs
          const vsLeagueAvg = recYdsAllowedPerGame - leagueAvg;
          adjustment = vsLeagueAvg * matchupSensitivity;
          
          // Score centered around league average: 55 yds = 50 score
          // Range: 35 yds (elite) = 20 score, 75 yds (weak) = 80 score
          // Formula: 50 + (vsLeagueAvg / 20 * 50)
          // This gives: 55 yds = 50 score, 35 yds = 20 score, 75 yds = 80 score
          defenseRating = Math.max(0, Math.min(100, 50 + (vsLeagueAvg / 20 * 50)));
          
          details.push(`Opp allows ${recYdsAllowedPerGame.toFixed(1)} rec yds to TEs/game (league avg: ${leagueAvg})`);
          details.push(`Matchup adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(1)} yards`);
        } else if (propMarket === 'player_receptions') {
          const receptionsAllowed = defStats.receptions / gamesPlayed;
          const vsLeagueAvg = receptionsAllowed - 5.5; // League avg ~5.5 rec to TEs
          adjustment = vsLeagueAvg * (matchupSensitivity * 0.25); // Scaled for receptions
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((receptionsAllowed - 3.5) / 5 * 100)));
          
          details.push(`Opp allows ${receptionsAllowed.toFixed(1)} rec to TEs/game`);
        } else if (propMarket === 'player_anytime_td') {
          const tdsAllowed = defStats.rec_td / gamesPlayed;
          adjustment = (tdsAllowed - 0.5) * 0.12;
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((tdsAllowed - 0.2) / 1.0 * 100)));
          
          details.push(`Opp allows ${tdsAllowed.toFixed(2)} TDs to TEs/game`);
        }
      }
    }
    
    // Invert defense rating: Strong defense (low rating) should favor UNDER
    // So we flip it for scoring purposes
    const finalScore = 100 - defenseRating;
    
    return {
      score: finalScore,
      adjustment: adjustment,
      details: details
    };
  } catch (error) {
    console.error('Error calculating defensive matchup score:', error);
    return {
      score: 50, // Neutral
      adjustment: 0,
      details: ['Error fetching defensive stats']
    };
  }
}

/**
 * Check for teammate injuries that would boost this player's production
 * Returns boost amount and details
 */
async function checkTeammateInjuries(
  playerName: string,
  playerTeam: string,
  position: string,
  weekNumber: number,
  propMarket: string,
  season: number = 2025
): Promise<{ boost: number; details: string[] }> {
  const supabase = getSupabaseClient();
  const details: string[] = [];
  let boost = 0;
  
  try {
    // ALWAYS check snap counts to identify RB1/WR1 - this is critical for injury analysis
    // Use last 4 weeks to get better average (more data points)
    const { data: snapCounts } = await supabase
      .from('snap_counts')
      .select('player_name, position, offensive_snap_pct, week_number')
      .eq('team_abbr', playerTeam)
      .eq('season', season)
      .in('position', position === 'RB' ? ['RB'] : position === 'WR' ? ['WR'] : [])
      .gte('week_number', Math.max(1, weekNumber - 4)) // Last 4 weeks for better average
      .lte('week_number', weekNumber - 1) // Don't include current week
      .order('week_number', { ascending: false })
      .order('offensive_snap_pct', { ascending: false });
    
    // If no snap counts, still check injuries table directly as fallback
    if (!snapCounts || snapCounts.length === 0) {
      // Fallback: Check injuries table directly for any injured teammates at same position
      const { data: directInjuries } = await supabase
        .from('injuries')
        .select('player_name, game_status')
        .eq('team_abbr', playerTeam)
        .eq('position', position)
        .eq('season', season)
        .or('week_number.eq.' + weekNumber + ',week_number.is.null')
        .in('game_status', ['Out', 'Doubtful'])
        .neq('player_name', playerName) // Don't check self
        .limit(3);
      
      if (directInjuries && directInjuries.length > 0) {
        // Apply conservative boost when we can't determine starter status
        const fallbackBoost = position === 'RB' 
          ? (propMarket === 'player_rush_yds' ? 30.0 : propMarket === 'player_rush_attempts' ? 6.0 : 3.0)
          : (propMarket === 'player_reception_yds' ? 15.0 : propMarket === 'player_receptions' ? 2.0 : 1.5);
        
        directInjuries.forEach(injury => {
          details.push(`Key injury: ${injury.player_name} (${position}) ${injury.game_status} - increased opportunity`);
        });
        return { boost: fallbackBoost * directInjuries.length, details };
      }
      
      return { boost: 0, details: [] };
    }
    
    // Find RB1 or WR1 (highest snap count) - use average of recent weeks for accuracy
    const recentSnaps = snapCounts.filter(s => s.offensive_snap_pct > 0 && parseFloat(s.offensive_snap_pct.toString()) > 5);
    // Filter out players with <5% snap share (likely inactive/backup)
    
    if (recentSnaps.length === 0) {
      // Fallback to direct injury check if no valid snap data
      const { data: directInjuries } = await supabase
        .from('injuries')
        .select('player_name, game_status')
        .eq('team_abbr', playerTeam)
        .eq('position', position)
        .eq('season', season)
        .or('week_number.eq.' + weekNumber + ',week_number.is.null')
        .in('game_status', ['Out', 'Doubtful'])
        .neq('player_name', playerName)
        .limit(3);
      
      if (directInjuries && directInjuries.length > 0) {
        const fallbackBoost = position === 'RB' 
          ? (propMarket === 'player_rush_yds' ? 30.0 : propMarket === 'player_rush_attempts' ? 6.0 : 3.0)
          : (propMarket === 'player_reception_yds' ? 15.0 : propMarket === 'player_receptions' ? 2.0 : 1.5);
        
        directInjuries.forEach(injury => {
          details.push(`Key injury: ${injury.player_name} (${position}) ${injury.game_status} - increased opportunity`);
        });
        return { boost: fallbackBoost * directInjuries.length, details };
      }
      
      return { boost: 0, details: [] };
    }
    
    // Group by player and get average snap count (weighted by recency)
    const playerSnaps = new Map<string, { snaps: number[], weeks: number[] }>();
    recentSnaps.forEach(snap => {
      if (!playerSnaps.has(snap.player_name)) {
        playerSnaps.set(snap.player_name, { snaps: [], weeks: [] });
      }
      const snapPct = parseFloat(snap.offensive_snap_pct.toString());
      const week = snap.week_number || 0;
      playerSnaps.get(snap.player_name)!.snaps.push(snapPct);
      playerSnaps.get(snap.player_name)!.weeks.push(week);
    });
    
    // Get weighted average snap count per player (more recent weeks weighted higher)
    const avgSnaps = Array.from(playerSnaps.entries()).map(([name, data]) => {
      const snaps = data.snaps;
      const weeks = data.weeks;
      // Weight recent weeks more heavily
      const weights = weeks.map(w => Math.max(0.5, 1.0 - (weekNumber - w - 1) * 0.1));
      const weightedSum = snaps.reduce((sum, snap, i) => sum + snap * weights[i], 0);
      const weightSum = weights.reduce((sum, w) => sum + w, 0);
      return {
        name,
        avg: weightedSum / weightSum,
        totalSnaps: snaps.reduce((a, b) => a + b, 0)
      };
    }).sort((a, b) => b.avg - a.avg);
    
    if (avgSnaps.length === 0) {
      return { boost: 0, details: [] };
    }
    
    const topPlayer = avgSnaps[0];
    const isPlayerRB1WR1 = topPlayer.name === playerName;
    
    if (isPlayerRB1WR1) {
      // Player is already the RB1/WR1, check if RB2/WR2/WR3 is out
      if (position === 'RB' && avgSnaps.length > 1) {
        const rb2 = avgSnaps[1];
        const { data: injury } = await supabase
          .from('injuries')
          .select('game_status')
          .ilike('player_name', rb2.name)
          .eq('team_abbr', playerTeam)
          .eq('position', 'RB')
          .eq('season', season)
          .or('week_number.eq.' + weekNumber + ',week_number.is.null')
          .in('game_status', ['Out', 'Doubtful'])
          .limit(1)
          .maybeSingle();
        
        if (injury) {
          // RB1 gets moderate boost when RB2 is out (less work to share)
          if (propMarket === 'player_rush_yds') {
            boost += 8.0; // RB1 gets ~8 more yards when RB2 is out
          } else if (propMarket === 'player_rush_attempts') {
            boost += 2.0; // RB1 gets ~2 more attempts when RB2 is out
          } else {
            boost += 1.5; // General boost for other RB props
          }
          details.push(`Key injury: ${rb2.name} (RB2) ${injury.game_status} - increased workload`);
        }
      } else if (position === 'WR' && avgSnaps.length > 1) {
        // Check if WR2 or WR3 is out
        for (let i = 1; i < Math.min(3, avgSnaps.length); i++) {
          const wrTeammate = avgSnaps[i];
          const { data: injury } = await supabase
            .from('injuries')
            .select('game_status')
            .ilike('player_name', wrTeammate.name)
            .eq('team_abbr', playerTeam)
            .eq('position', 'WR')
            .eq('season', season)
            .or('week_number.eq.' + weekNumber + ',week_number.is.null')
            .in('game_status', ['Out', 'Doubtful'])
            .limit(1)
            .maybeSingle();
          
          if (injury) {
            // WR1 gets moderate boost when WR2/WR3 is out
            if (propMarket === 'player_reception_yds') {
              boost += 8.0; // WR1 gets ~8 more yards per injured WR2/WR3
            } else if (propMarket === 'player_receptions') {
              boost += 1.0; // WR1 gets ~1 more reception per injured WR2/WR3
            } else {
              boost += 1.0; // General boost for other WR props
            }
            details.push(`Key injury: ${wrTeammate.name} (WR${i + 1}) ${injury.game_status} - increased targets`);
          }
        }
      }
    } else {
      // Player is RB2/WR2/WR3, check if RB1/WR1 is out
      const { data: injury } = await supabase
        .from('injuries')
        .select('game_status')
        .ilike('player_name', topPlayer.name)
        .eq('team_abbr', playerTeam)
        .eq('position', position)
        .eq('season', season)
        .or('week_number.eq.' + weekNumber + ',week_number.is.null')
        .in('game_status', ['Out', 'Doubtful'])
        .limit(1)
        .maybeSingle();
      
      if (injury) {
        if (position === 'RB') {
          // RB2 gets boost when RB1 is out - calculate based on RB1's actual production
          // Historical: RB2 inherits 50-65% of RB1's attempts, 60-75% of RB1's yards
          // Get RB1's season stats
          const { data: rb1RushStats } = await supabase
            .from('player_rushing_stats')
            .select('rushing_attempts, rushing_yards, games_played')
            .ilike('player_name', topPlayer.name)
            .eq('team_abbr', playerTeam)
            .eq('season', season)
            .maybeSingle();
          
          const { data: rb1RecStats } = await supabase
            .from('player_receiving_stats')
            .select('targets, receiving_yards, receptions, games_played')
            .ilike('player_name', topPlayer.name)
            .eq('team_abbr', playerTeam)
            .eq('season', season)
            .maybeSingle();
          
          // Get RB2's current season stats (to calculate boost over baseline)
          const { data: rb2RushStats } = await supabase
            .from('player_rushing_stats')
            .select('rushing_attempts, rushing_yards, games_played')
            .ilike('player_name', playerName)
            .eq('team_abbr', playerTeam)
            .eq('season', season)
            .maybeSingle();
          
          const { data: rb2RecStats } = await supabase
            .from('player_receiving_stats')
            .select('targets, receiving_yards, receptions, games_played')
            .ilike('player_name', playerName)
            .eq('team_abbr', playerTeam)
            .eq('season', season)
            .maybeSingle();
          
          if (rb1RushStats && rb1RushStats.games_played > 0) {
            const rb1RushAttPerGame = rb1RushStats.rushing_attempts / rb1RushStats.games_played;
            const rb1RushYdsPerGame = rb1RushStats.rushing_yards / rb1RushStats.games_played;
            
            // RB2 inherits 50-65% of RB1's attempts (use 57.5% average)
            // RB2 inherits 60-75% of RB1's yards (use 67.5% average)
            const rb2InheritedAtt = rb1RushAttPerGame * 0.575;
            const rb2InheritedYds = rb1RushYdsPerGame * 0.675;
            
            // Calculate RB2's current baseline
            const rb2CurrentAtt = rb2RushStats && rb2RushStats.games_played > 0
              ? rb2RushStats.rushing_attempts / rb2RushStats.games_played
              : 0;
            const rb2CurrentYds = rb2RushStats && rb2RushStats.games_played > 0
              ? rb2RushStats.rushing_yards / rb2RushStats.games_played
              : 0;
            
            // Boost = inherited production - current baseline
            const rushAttBoost = Math.max(0, rb2InheritedAtt - rb2CurrentAtt);
            const rushYdsBoost = Math.max(0, rb2InheritedYds - rb2CurrentYds);
            
            // Apply boosts based on prop market
            if (propMarket === 'player_rush_attempts') {
              boost += rushAttBoost;
              details.push(`Key injury: ${topPlayer.name} (RB1) ${injury.game_status} - inherits ${rb2InheritedAtt.toFixed(1)} attempts (${rushAttBoost.toFixed(1)} boost)`);
            } else if (propMarket === 'player_rush_yds') {
              boost += rushYdsBoost;
              details.push(`Key injury: ${topPlayer.name} (RB1) ${injury.game_status} - inherits ${rb2InheritedYds.toFixed(1)} yards (${rushYdsBoost.toFixed(1)} boost)`);
            } else if (propMarket === 'player_anytime_td') {
              // RB2 inherits 40-50% of RB1's TDs (use 45% average)
              // Get RB1's actual TD stats from total_player_stats
              const { data: rb1TotalStats } = await supabase
                .from('total_player_stats')
                .select('total_tds, games_played')
                .ilike('player_name', topPlayer.name)
                .eq('team_abbr', playerTeam)
                .eq('season', season)
                .maybeSingle();
              
              if (rb1TotalStats && rb1TotalStats.games_played > 0) {
                const rb1TDsPerGame = rb1TotalStats.total_tds / rb1TotalStats.games_played;
                const rb2InheritedTDs = rb1TDsPerGame * 0.45; // RB2 inherits 40-50% (use 45% average)
                boost += rb2InheritedTDs * 0.15; // Convert to probability boost
                details.push(`Key injury: ${topPlayer.name} (RB1) ${injury.game_status} - inherits ${rb2InheritedTDs.toFixed(2)} TDs/game`);
              } else {
                // Fallback estimate if TD stats not available
                const rb1TDsPerGame = rb1RushYdsPerGame > 0 ? rb1RushYdsPerGame / 20 : 0; // Rough estimate: 1 TD per 20 rush yards
                const rb2InheritedTDs = rb1TDsPerGame * 0.45;
                boost += rb2InheritedTDs * 0.15;
                details.push(`Key injury: ${topPlayer.name} (RB1) ${injury.game_status} - inherits ${rb2InheritedTDs.toFixed(2)} TDs/game (estimated)`);
              }
            }
            
            // Receiving boosts (40-60% of RB1's targets, 45-65% of RB1's receiving yards)
            if (rb1RecStats && rb1RecStats.games_played > 0) {
              const rb1TargetsPerGame = rb1RecStats.targets / rb1RecStats.games_played;
              const rb1RecYdsPerGame = rb1RecStats.receiving_yards / rb1RecStats.games_played;
              const rb1RecPerGame = rb1RecStats.receptions / rb1RecStats.games_played;
              
              // RB2 inherits 40-60% of targets (use 50% average), 45-65% of yards (use 55% average)
              const rb2InheritedTargets = rb1TargetsPerGame * 0.50;
              const rb2InheritedRecYds = rb1RecYdsPerGame * 0.55;
              const rb2InheritedRec = rb1RecPerGame * 0.50;
              
              const rb2CurrentTargets = rb2RecStats && rb2RecStats.games_played > 0
                ? rb2RecStats.targets / rb2RecStats.games_played
                : 0;
              const rb2CurrentRecYds = rb2RecStats && rb2RecStats.games_played > 0
                ? rb2RecStats.receiving_yards / rb2RecStats.games_played
                : 0;
              const rb2CurrentRec = rb2RecStats && rb2RecStats.games_played > 0
                ? rb2RecStats.receptions / rb2RecStats.games_played
                : 0;
              
              // Calculate additional targets/receptions (opportunity boost)
              const additionalTargets = Math.max(0, rb2InheritedTargets - rb2CurrentTargets);
              const additionalRec = Math.max(0, rb2InheritedRec - rb2CurrentRec);
              
              // Calculate player's efficiency for converting opportunity to yards
              const yardsPerTarget = rb2RecStats && rb2RecStats.games_played > 0 && rb2RecStats.targets > 0
                ? rb2RecStats.receiving_yards / rb2RecStats.targets
                : 7.0; // Default fallback for RBs
              const yardsPerRec = rb2RecStats && rb2RecStats.games_played > 0 && rb2RecStats.receptions > 0
                ? rb2RecStats.receiving_yards / rb2RecStats.receptions
                : 8.5; // Default fallback for RBs
              
              if (propMarket === 'player_reception_yds') {
                // Convert additional targets to yards using player's efficiency
                const yardsFromTargets = additionalTargets * yardsPerTarget;
                boost += yardsFromTargets;
                details.push(`Also gets +${additionalTargets.toFixed(1)} rec targets → +${yardsFromTargets.toFixed(1)} yards (${yardsPerTarget.toFixed(1)} yds/tgt)`);
              } else if (propMarket === 'player_receptions') {
                boost += additionalRec;
                details.push(`Also inherits ${rb2InheritedRec.toFixed(1)} receptions (${additionalRec.toFixed(1)} boost)`);
              }
            }
          } else {
            // Fallback if RB1 stats not found - use conservative estimates
            if (propMarket === 'player_rush_yds') {
              boost += 45.0; // Average of 40-60 range
            } else if (propMarket === 'player_rush_attempts') {
              boost += 6.0; // Average boost
            } else if (propMarket === 'player_reception_yds') {
              boost += 20.0; // Average of 15-25 range
            } else if (propMarket === 'player_receptions') {
              boost += 3.0; // Average of 2-4 range
            }
            details.push(`Key injury: ${topPlayer.name} (RB1) ${injury.game_status} - significant workload increase`);
          }
        } else if (position === 'WR') {
          // WR2/WR3 gets boost when WR1 is out - calculate based on WR1's actual production
          // Historical: WR2 gets 30-40% of WR1's targets, WR3 gets 25-35% of WR1's targets
          // Determine if player is WR2 or WR3 based on snap count ranking
          const playerRank = avgSnaps.findIndex(p => p.name === playerName);
          const isWR2 = playerRank === 1;
          const isWR3 = playerRank === 2;
          
          if (isWR2 || isWR3) {
            // Get WR1's season stats
            const { data: wr1Stats } = await supabase
              .from('player_receiving_stats')
              .select('targets, receiving_yards, receptions, games_played')
              .ilike('player_name', topPlayer.name)
              .eq('team_abbr', playerTeam)
              .eq('season', season)
              .maybeSingle();
            
            // Get current WR's stats (to calculate boost over baseline)
            const { data: wrCurrentStats } = await supabase
              .from('player_receiving_stats')
              .select('targets, receiving_yards, receptions, games_played')
              .ilike('player_name', playerName)
              .eq('team_abbr', playerTeam)
              .eq('season', season)
              .maybeSingle();
            
            if (wr1Stats && wr1Stats.games_played > 0) {
              const wr1TargetsPerGame = wr1Stats.targets / wr1Stats.games_played;
              const wr1RecYdsPerGame = wr1Stats.receiving_yards / wr1Stats.games_played;
              const wr1RecPerGame = wr1Stats.receptions / wr1Stats.games_played;
              
              // WR2 inherits 30-40% (use 35% average), WR3 inherits 25-35% (use 30% average)
              const inheritPct = isWR2 ? 0.35 : 0.30;
              const wrInheritedTargets = wr1TargetsPerGame * inheritPct;
              const wrInheritedRecYds = wr1RecYdsPerGame * inheritPct;
              const wrInheritedRec = wr1RecPerGame * inheritPct;
              
              // Calculate current baseline
              const wrCurrentTargets = wrCurrentStats && wrCurrentStats.games_played > 0
                ? wrCurrentStats.targets / wrCurrentStats.games_played
                : 0;
              const wrCurrentRecYds = wrCurrentStats && wrCurrentStats.games_played > 0
                ? wrCurrentStats.receiving_yards / wrCurrentStats.games_played
                : 0;
              const wrCurrentRec = wrCurrentStats && wrCurrentStats.games_played > 0
                ? wrCurrentStats.receptions / wrCurrentStats.games_played
                : 0;
              
              // Calculate additional targets/receptions (opportunity boost)
              const additionalTargets = Math.max(0, wrInheritedTargets - wrCurrentTargets);
              const additionalRec = Math.max(0, wrInheritedRec - wrCurrentRec);
              
              // Calculate player's efficiency for converting opportunity to yards
              const yardsPerTarget = wrCurrentStats && wrCurrentStats.games_played > 0 && wrCurrentStats.targets > 0
                ? wrCurrentStats.receiving_yards / wrCurrentStats.targets
                : 9.0; // Default fallback for WRs
              const yardsPerRec = wrCurrentStats && wrCurrentStats.games_played > 0 && wrCurrentStats.receptions > 0
                ? wrCurrentStats.receiving_yards / wrCurrentStats.receptions
                : 11.0; // Default fallback for WRs
              
              if (propMarket === 'player_reception_yds') {
                // Convert additional targets to yards using player's efficiency
                const yardsFromTargets = additionalTargets * yardsPerTarget;
                boost += yardsFromTargets;
                details.push(`Key injury: ${topPlayer.name} (WR1) ${injury.game_status} - ${isWR2 ? 'WR2' : 'WR3'} gets +${additionalTargets.toFixed(1)} targets → +${yardsFromTargets.toFixed(1)} yards (${yardsPerTarget.toFixed(1)} yds/tgt)`);
              } else if (propMarket === 'player_receptions') {
                boost += additionalRec;
                details.push(`Key injury: ${topPlayer.name} (WR1) ${injury.game_status} - ${isWR2 ? 'WR2' : 'WR3'} inherits ${wrInheritedRec.toFixed(1)} receptions (${additionalRec.toFixed(1)} boost)`);
              } else if (propMarket === 'player_anytime_td') {
                // WR2/WR3 inherits some TD probability from WR1
                // Get WR1's actual TD stats from total_player_stats
                const { data: wr1TotalStats } = await supabase
                  .from('total_player_stats')
                  .select('total_tds, games_played')
                  .ilike('player_name', topPlayer.name)
                  .eq('team_abbr', playerTeam)
                  .eq('season', season)
                  .maybeSingle();
                
                if (wr1TotalStats && wr1TotalStats.games_played > 0) {
                  const wr1TDsPerGame = wr1TotalStats.total_tds / wr1TotalStats.games_played;
                  const wrInheritedTDs = wr1TDsPerGame * inheritPct;
                  boost += wrInheritedTDs * 0.12; // Convert to probability boost
                  details.push(`Key injury: ${topPlayer.name} (WR1) ${injury.game_status} - ${isWR2 ? 'WR2' : 'WR3'} inherits ${wrInheritedTDs.toFixed(2)} TDs/game`);
                } else {
                  // Fallback estimate if TD stats not available
                  const wr1TDsPerGame = wr1RecYdsPerGame > 0 ? wr1RecYdsPerGame / 60 : 0; // Rough estimate: 1 TD per 60 rec yards
                  const wrInheritedTDs = wr1TDsPerGame * inheritPct;
                  boost += wrInheritedTDs * 0.12;
                  details.push(`Key injury: ${topPlayer.name} (WR1) ${injury.game_status} - ${isWR2 ? 'WR2' : 'WR3'} inherits ${wrInheritedTDs.toFixed(2)} TDs/game (estimated)`);
                }
              }
            } else {
              // Fallback if WR1 stats not found
              const fallbackYds = isWR2 ? 27.5 : 20.0; // Average of ranges
              const fallbackRec = isWR2 ? 3.0 : 2.5;
              
              if (propMarket === 'player_reception_yds') {
                boost += fallbackYds;
              } else if (propMarket === 'player_receptions') {
                boost += fallbackRec;
              }
              details.push(`Key injury: ${topPlayer.name} (WR1) ${injury.game_status} - ${isWR2 ? 'WR2' : 'WR3'} target increase`);
            }
          }
        } else if (position === 'TE') {
          // TE gets boost when WR1 is out - inherits 15-25% of WR1's targets
          // First, find WR1 by checking snap counts for WRs
          const { data: wrSnapCounts } = await supabase
            .from('snap_counts')
            .select('player_name, offensive_snap_pct, week_number')
            .eq('team_abbr', playerTeam)
            .eq('season', season)
            .eq('position', 'WR')
            .gte('week_number', Math.max(1, weekNumber - 4))
            .lte('week_number', weekNumber - 1)
            .order('week_number', { ascending: false })
            .order('offensive_snap_pct', { ascending: false });
          
          if (wrSnapCounts && wrSnapCounts.length > 0) {
            // Group by player and find WR1
            const wrPlayerSnaps = new Map<string, number[]>();
            wrSnapCounts.forEach(snap => {
              if (!wrPlayerSnaps.has(snap.player_name)) {
                wrPlayerSnaps.set(snap.player_name, []);
              }
              const snapPct = parseFloat(snap.offensive_snap_pct.toString());
              wrPlayerSnaps.get(snap.player_name)!.push(snapPct);
            });
            
            const wrAvgSnaps = Array.from(wrPlayerSnaps.entries()).map(([name, snaps]) => ({
              name,
              avg: snaps.reduce((a, b) => a + b, 0) / snaps.length
            })).sort((a, b) => b.avg - a.avg);
            
            if (wrAvgSnaps.length > 0) {
              const wr1Name = wrAvgSnaps[0].name;
              
              // Check if WR1 is injured
              const { data: wr1Injury } = await supabase
                .from('injuries')
                .select('game_status')
                .ilike('player_name', wr1Name)
                .eq('team_abbr', playerTeam)
                .eq('position', 'WR')
                .eq('season', season)
                .or('week_number.eq.' + weekNumber + ',week_number.is.null')
                .in('game_status', ['Out', 'Doubtful'])
                .limit(1)
                .maybeSingle();
              
              if (wr1Injury) {
                // Get WR1's season stats
                const { data: wr1Stats } = await supabase
                  .from('player_receiving_stats')
                  .select('targets, receiving_yards, receptions, games_played')
                  .ilike('player_name', wr1Name)
                  .eq('team_abbr', playerTeam)
                  .eq('season', season)
                  .maybeSingle();
                
                // Get TE's current stats
                const { data: teCurrentStats } = await supabase
                  .from('player_receiving_stats')
                  .select('targets, receiving_yards, receptions, games_played')
                  .ilike('player_name', playerName)
                  .eq('team_abbr', playerTeam)
                  .eq('season', season)
                  .maybeSingle();
                
                if (wr1Stats && wr1Stats.games_played > 0) {
                  const wr1TargetsPerGame = wr1Stats.targets / wr1Stats.games_played;
                  const wr1RecYdsPerGame = wr1Stats.receiving_yards / wr1Stats.games_played;
                  const wr1RecPerGame = wr1Stats.receptions / wr1Stats.games_played;
                  
                  // TE inherits 15-25% of WR1's production (use 20% average)
                  const teInheritedTargets = wr1TargetsPerGame * 0.20;
                  const teInheritedRecYds = wr1RecYdsPerGame * 0.20;
                  const teInheritedRec = wr1RecPerGame * 0.20;
                  
                  // Calculate TE's current baseline
                  const teCurrentTargets = teCurrentStats && teCurrentStats.games_played > 0
                    ? teCurrentStats.targets / teCurrentStats.games_played
                    : 0;
                  const teCurrentRecYds = teCurrentStats && teCurrentStats.games_played > 0
                    ? teCurrentStats.receiving_yards / teCurrentStats.games_played
                    : 0;
                  const teCurrentRec = teCurrentStats && teCurrentStats.games_played > 0
                    ? teCurrentStats.receptions / teCurrentStats.games_played
                    : 0;
                  
                  // Calculate additional targets/receptions (opportunity boost)
                  const additionalTargets = Math.max(0, teInheritedTargets - teCurrentTargets);
                  const additionalRec = Math.max(0, teInheritedRec - teCurrentRec);
                  
                  // Calculate player's efficiency for converting opportunity to yards
                  const yardsPerTarget = teCurrentStats && teCurrentStats.games_played > 0 && teCurrentStats.targets > 0
                    ? teCurrentStats.receiving_yards / teCurrentStats.targets
                    : 10.0; // Default fallback
                  const yardsPerRec = teCurrentStats && teCurrentStats.games_played > 0 && teCurrentStats.receptions > 0
                    ? teCurrentStats.receiving_yards / teCurrentStats.receptions
                    : 12.0; // Default fallback
                  
                  if (propMarket === 'player_reception_yds') {
                    // Convert additional targets to yards using player's efficiency
                    const yardsFromTargets = additionalTargets * yardsPerTarget;
                    boost += yardsFromTargets;
                    details.push(`Key injury: ${wr1Name} (WR1) ${wr1Injury.game_status} - TE gets +${additionalTargets.toFixed(1)} targets → +${yardsFromTargets.toFixed(1)} yards (${yardsPerTarget.toFixed(1)} yds/tgt)`);
                  } else if (propMarket === 'player_receptions') {
                    boost += additionalRec;
                    details.push(`Key injury: ${wr1Name} (WR1) ${wr1Injury.game_status} - TE inherits ${teInheritedRec.toFixed(1)} receptions (${additionalRec.toFixed(1)} boost)`);
                  } else if (propMarket === 'player_anytime_td') {
                    // TE inherits some TD probability from WR1
                    // Get WR1's actual TD stats from total_player_stats
                    const { data: wr1TotalStats } = await supabase
                      .from('total_player_stats')
                      .select('total_tds, games_played')
                      .ilike('player_name', wr1Name)
                      .eq('team_abbr', playerTeam)
                      .eq('season', season)
                      .maybeSingle();
                    
                    if (wr1TotalStats && wr1TotalStats.games_played > 0) {
                      const wr1TDsPerGame = wr1TotalStats.total_tds / wr1TotalStats.games_played;
                      const teInheritedTDs = wr1TDsPerGame * 0.20; // TE inherits 15-25% (use 20% average)
                      boost += teInheritedTDs * 0.10; // Convert to probability boost
                      details.push(`Key injury: ${wr1Name} (WR1) ${wr1Injury.game_status} - TE inherits ${teInheritedTDs.toFixed(2)} TDs/game`);
                    } else {
                      // Fallback estimate if TD stats not available
                      const wr1TDsPerGame = wr1RecYdsPerGame > 0 ? wr1RecYdsPerGame / 60 : 0; // Rough estimate: 1 TD per 60 rec yards
                      const teInheritedTDs = wr1TDsPerGame * 0.20;
                      boost += teInheritedTDs * 0.10;
                      details.push(`Key injury: ${wr1Name} (WR1) ${wr1Injury.game_status} - TE inherits ${teInheritedTDs.toFixed(2)} TDs/game (estimated)`);
                    }
                  }
                } else {
                  // Fallback if WR1 stats not found
                  if (propMarket === 'player_reception_yds') {
                    boost += 12.0; // Conservative estimate
                  } else if (propMarket === 'player_receptions') {
                    boost += 1.5; // Conservative estimate
                  }
                  details.push(`Key injury: ${wr1Name} (WR1) ${wr1Injury.game_status} - TE target increase`);
                }
              }
            }
          }
        }
      }
    }
    
    // Apply diminishing returns for multiple injuries
    // Formula: First injury = 100%, Second = 70%, Third = 50%, Fourth+ = 30%
    // If boost would be X from N injuries, apply: X * (1.0 + 0.7 + 0.5 + 0.3...) / N
    const injuryCount = details.filter(d => d.includes('Key injury:')).length;
    if (injuryCount > 1 && boost > 0) {
      // Calculate diminishing returns multiplier
      // For 2 injuries: (1.0 + 0.7) / 2 = 0.85
      // For 3 injuries: (1.0 + 0.7 + 0.5) / 3 = 0.733
      // For 4+ injuries: (1.0 + 0.7 + 0.5 + 0.3) / 4 = 0.625
      const diminishingRates = [1.0, 0.7, 0.5, 0.3];
      const effectiveInjuries = Math.min(injuryCount, diminishingRates.length);
      const sumOfRates = diminishingRates.slice(0, effectiveInjuries).reduce((a, b) => a + b, 0);
      const avgRate = sumOfRates / effectiveInjuries;
      
      // Apply diminishing returns: reduce boost proportionally
      const originalBoost = boost;
      boost = boost * avgRate;
      
      if (injuryCount > 1) {
        details.push(`Diminishing returns: ${injuryCount} injuries → ${(avgRate * 100).toFixed(0)}% avg effectiveness (${originalBoost.toFixed(1)} → ${boost.toFixed(1)} yards)`);
      }
    }
    
    // Cap injury impact at +12 yards max (Vegas would adjust if higher)
    if (boost > 12) {
      const originalBoost = boost;
      boost = 12;
      details.push(`Injury boost capped at +12 yards (was +${originalBoost.toFixed(1)}) - Vegas would price in larger impacts`);
    }
    
    return { boost, details };
  } catch (error) {
    console.error('Error checking teammate injuries:', error);
    return { boost: 0, details: [] };
  }
}

/**
 * Calculate Game Environment Score (10% weight)
 * Based on Vegas totals, injuries, and game script
 */
async function calculateGameEnvironmentScore(
  playerTeam: string,
  opponentTeam: string,
  position: string,
  homeTeam: string,
  awayTeam: string,
  playerName: string,
  weekNumber: number,
  propMarket: string
): Promise<{ score: number; gameScriptAdj: number; details: string[] }> {
  const supabase = getSupabaseClient();
  const details: string[] = [];
  
  try {
    let environmentScore = 50; // Neutral
    let gameScriptAdj = 0;
    
    // 1. Get game total from odds_bets
    const { data: gameOdds } = await supabase
      .from('odds_bets')
      .select('home_spread, away_spread, bookmakers')
      .eq('home_team', homeTeam)
      .eq('away_team', awayTeam)
      .eq('week', weekNumber)
      .maybeSingle();
    
    if (gameOdds) {
      // Extract total from bookmakers JSON
      const bookmakers = gameOdds.bookmakers as any[];
      let gameTotal = 0;
      let teamSpread = 0;
      
      if (bookmakers && bookmakers.length > 0) {
        const draftKings = bookmakers.find((b: any) => b.key === 'draftkings') || bookmakers[0];
        if (draftKings?.markets) {
          const totalsMarket = draftKings.markets.find((m: any) => m.key === 'totals');
          if (totalsMarket?.outcomes?.[0]) {
            gameTotal = totalsMarket.outcomes[0].point || 0;
          }
        }
      }
      
      // Determine if player's team is favored or underdog
      const playerIsHome = homeTeam.includes(playerTeam) || homeTeam === playerTeam;
      teamSpread = parseFloat(playerIsHome ? (gameOdds.home_spread || '0') : (gameOdds.away_spread || '0'));
      
      if (gameTotal > 0) {
        // High total games favor offensive production (especially pass-catchers)
        if (gameTotal > 50) {
          environmentScore += 15;
          gameScriptAdj += 3;
          details.push(`High game total (${gameTotal}): +15 boost to scoring environment`);
        } else if (gameTotal > 45) {
          environmentScore += 8;
          gameScriptAdj += 1.5;
          details.push(`Above-average total (${gameTotal}): +8 boost`);
        } else if (gameTotal < 40) {
          environmentScore -= 10;
          gameScriptAdj -= 2;
          details.push(`Low game total (${gameTotal}): -10 penalty (defensive game)`);
        }
      }
      
      // Game script: Favorites run more, underdogs pass more
      if (Math.abs(teamSpread) > 3) {
        if (teamSpread < -3) {
          // Team is favored by >3 - likely to run more late
          if (position === 'RB') {
            gameScriptAdj += 2;
            details.push(`Team favored by ${Math.abs(teamSpread).toFixed(1)}: RB boost (+2 touches)`);
          } else if (position === 'QB' || position === 'WR' || position === 'TE') {
            gameScriptAdj -= 1;
            details.push(`Team favored: May run clock late (-1 pass attempts)`);
          }
        } else if (teamSpread > 3) {
          // Team is underdog by >3 - likely to pass more
          if (position === 'QB' || position === 'WR' || position === 'TE') {
            gameScriptAdj += 2;
            details.push(`Team underdog by ${teamSpread.toFixed(1)}: Pass-heavy script (+2 targets)`);
          } else if (position === 'RB') {
            gameScriptAdj -= 1.5;
            details.push(`Team underdog: Less rushing volume (-1.5 carries)`);
          }
        }
      }
    }
    
    // 2. ALWAYS check for injuries to teammates using snap counts (boosts target share/workload)
    // This is critical for accurate predictions - starter injuries significantly impact backups
    const teammateInjuries = await checkTeammateInjuries(
      playerName,
      playerTeam,
      position,
      weekNumber,
      propMarket,
      2025
    );
    
    // Always apply teammate injury boosts when found
    if (teammateInjuries.boost > 0) {
      gameScriptAdj += teammateInjuries.boost;
      details.push(...teammateInjuries.details);
      environmentScore += Math.min(20, teammateInjuries.boost * 4); // Increased impact on environment score
    }
    
    // Also check for cross-position impacts (e.g., TE out helps WRs, WR out helps TEs)
    if (position === 'WR' || position === 'TE') {
      const { data: crossPositionInjuries } = await supabase
        .from('injuries')
        .select('player_name, position, game_status')
        .eq('team_abbr', playerTeam)
        .eq('season', 2025)
        .or('week_number.eq.' + weekNumber + ',week_number.is.null')
        .in('game_status', ['Out', 'Doubtful'])
        .in('position', position === 'WR' ? ['TE'] : ['WR'])
        .limit(3);
      
      if (crossPositionInjuries && crossPositionInjuries.length > 0) {
        const crossBoost = position === 'WR' ? 3.0 : 2.0; // WRs get more boost when TE is out
        gameScriptAdj += crossBoost * crossPositionInjuries.length;
        crossPositionInjuries.forEach(injury => {
          details.push(`Key injury: ${injury.player_name} (${injury.position}) ${injury.game_status} - increased targets for ${position}s`);
        });
      }
    }
    
    // Also check for QB injuries (bad for everyone)
    const { data: qbInjury } = await supabase
      .from('injuries')
      .select('player_name, game_status')
      .eq('team_abbr', playerTeam)
      .eq('position', 'QB')
      .eq('season', 2025)
      .or('week_number.eq.' + weekNumber + ',week_number.is.null')
      .in('game_status', ['Out', 'Doubtful'])
      .limit(1)
      .maybeSingle();
    
    if (qbInjury) {
      gameScriptAdj -= 2;
      details.push(`Key injury: ${qbInjury.player_name} (QB) ${qbInjury.game_status} - backup QB penalty`);
    }
    
    // NOTE: Opponent defensive injuries are NOT included here
    // They should be handled in defensive matchup calculation OR game environment, not both
    // User requested: "Don't double-count injuries (pick one section: matchup OR environment)"
    
    return {
      score: Math.max(0, Math.min(100, environmentScore)),
      gameScriptAdj: gameScriptAdj,
      details: details
    };
  } catch (error) {
    console.error('Error calculating game environment score:', error);
    return {
      score: 50,
      gameScriptAdj: 0,
      details: ['Error fetching game environment data']
    };
  }
}

/**
 * Calculate confidence score for the prediction
 */
function calculatePropConfidence(
  playerStatsScore: number,
  defenseMatchupScore: number,
  environmentScore: number,
  gamesPlayed: number,
  valueScore: number
): number {
  // 1. Model agreement (40%) - Do all factors point same direction?
  const avgScore = (playerStatsScore + defenseMatchupScore + environmentScore) / 3;
  const variance = Math.abs(playerStatsScore - avgScore) + 
                   Math.abs(defenseMatchupScore - avgScore) + 
                   Math.abs(environmentScore - avgScore);
  const agreementScore = Math.max(0, 100 - variance);
  
  // 2. Sample size (30%) - More games = more reliable
  const sampleScore = Math.min(100, (gamesPlayed / 8) * 100);
  
  // 3. Edge magnitude (30%) - Larger edges = more conviction
  const edgeScore = Math.min(100, (Math.abs(valueScore) / 20) * 100);
  
  const confidence = (agreementScore * 0.40) + (sampleScore * 0.30) + (edgeScore * 0.30);
  
  return Math.max(0, Math.min(100, confidence));
}

/**
 * Predict a single player prop
 */
export async function predictPlayerProp(prop: PlayerProp): Promise<PlayerPropPrediction | null> {
  try {
    // Skip if no line (anytime TD props)
    if (prop.line === null && prop.prop_market !== 'player_anytime_td') {
      return null;
    }
    
    // Get player's team and position
    const playerInfo = await getPlayerTeam(prop.player_name);
    if (!playerInfo) {
      console.log(`Could not find team/position for ${prop.player_name}`);
      return null;
    }
    
    const { team: playerTeam, position } = playerInfo;
    
    // Determine opponent
    const homeTeamAbbr = TEAM_ABBR_MAP[prop.home_team];
    const awayTeamAbbr = TEAM_ABBR_MAP[prop.away_team];
    const isHome = playerTeam === homeTeamAbbr;
    const opponentTeam = isHome ? awayTeamAbbr : homeTeamAbbr;
    
    // Use line or default for TD props
    const propLine = prop.line || 0.5; // TD props default to 0.5
    
    // Calculate three main scores
    const playerStats = await calculatePlayerStatsScore(
      prop.player_name,
      prop.prop_market,
      propLine,
      position,
      playerTeam
    );
    
    const defenseMatchup = await calculateDefensiveMatchupScore(
      position,
      prop.prop_market,
      opponentTeam,
      propLine,
      prop.player_name,
      playerTeam
    );
    
    // Extract week number from commence_time (fallback to 11 if not available)
    const commenceDate = new Date(prop.commence_time);
    const seasonStart = new Date('2025-09-05'); // Approximate NFL season start
    const daysDiff = Math.floor((commenceDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
    const estimatedWeek = Math.max(1, Math.min(18, Math.floor(daysDiff / 7) + 1));
    const weekNumber = estimatedWeek;
    
    const gameEnvironment = await calculateGameEnvironmentScore(
      playerTeam,
      opponentTeam,
      position,
      prop.home_team,
      prop.away_team,
      prop.player_name,
      weekNumber,
      prop.prop_market
    );
    
    // Weighted final score
    const finalScore = 
      (playerStats.score * PROP_WEIGHTS.player_stats) +
      (defenseMatchup.score * PROP_WEIGHTS.defensive_matchup) +
      (gameEnvironment.score * PROP_WEIGHTS.game_environment);
    
    // Convert score to predicted value
    // Score of 50 = predict exactly the line
    // Score of 100 = predict significantly over
    // Score of 0 = predict significantly under
    const scoreDiff = finalScore - 50;
    const percentDiff = scoreDiff / 50; // -1 to +1
    
    // Apply adjustments
    const totalAdjustment = defenseMatchup.adjustment + gameEnvironment.gameScriptAdj;
    const predictedValue = playerStats.seasonAvg + totalAdjustment;
    
    // Value score: difference between prediction and line
    const valueScore = predictedValue - propLine;
    
    // Calculate confidence
    const gamesPlayed = 9; // TODO: Pull from actual stats
    const confidence = calculatePropConfidence(
      playerStats.score,
      defenseMatchup.score,
      gameEnvironment.score,
      gamesPlayed,
      valueScore
    );
    
    // Determine recommendation
    let recommendedBet: 'OVER' | 'UNDER' | null = null;
    let reasoning = '';
    
    // Market-specific value thresholds (lower for discrete stats like TDs, receptions, carries)
    const getValueThreshold = (market: string): number => {
      if (market === 'player_anytime_td') return 0.08; // TD props need tiny edge
      if (market === 'player_pass_tds') return 0.15; // Pass TD props
      if (market === 'player_receptions') return 0.4; // Reception props
      if (market === 'player_rush_attempts') return 0.8; // Carry props
      if (market === 'player_pass_completions') return 0.5; // Completion props
      if (market === 'player_pass_attempts') return 0.8; // Attempt props
      return 3.0; // Yardage props need larger edge
    };
    
    const MIN_VALUE_THRESHOLD = getValueThreshold(prop.prop_market);
    const MIN_CONFIDENCE = 60;
    
    if (Math.abs(valueScore) >= MIN_VALUE_THRESHOLD && confidence >= MIN_CONFIDENCE) {
      recommendedBet = valueScore > 0 ? 'OVER' : 'UNDER';
      
      const confidenceTier = confidence >= 75 ? 'STRONG' : confidence >= 65 ? 'GOOD' : 'VALUE';
      reasoning = `${confidenceTier} BET (${confidence.toFixed(0)}%): Model predicts ${predictedValue.toFixed(1)}, line is ${propLine}. ` +
                  `Edge: ${valueScore >= 0 ? '+' : ''}${valueScore.toFixed(1)}. `;
      
      // Add key factors
      if (Math.abs(defenseMatchup.adjustment) > 2) {
        reasoning += `Key matchup factor: ${defenseMatchup.adjustment >= 0 ? 'Favorable' : 'Tough'} defensive matchup. `;
      }
      if (Math.abs(gameEnvironment.gameScriptAdj) > 1.5) {
        reasoning += `Game script: ${gameEnvironment.gameScriptAdj >= 0 ? 'Positive' : 'Negative'} flow expected. `;
      }
    } else {
      reasoning = `PASS (${confidence.toFixed(0)}%): Edge too small (${valueScore.toFixed(1)}) or confidence below ${MIN_CONFIDENCE}%.`;
    }
    
    // Combine all details
    const allDetails = [
      '--- Player Stats (35%) ---',
      ...playerStats.details,
      '',
      '--- Defensive Matchup (55%) ---',
      ...defenseMatchup.details,
      '',
      '--- Game Environment (10%) ---',
      ...gameEnvironment.details,
    ].join('\n');
    
    // Validate player references in reasoning before returning
    const fullReasoning = reasoning + '\n\n' + allDetails;
    const validatedReasoning = await validateReasoningPlayerReferences(
      fullReasoning,
      playerTeam,
      2025
    );
    
    return {
      prop_id: prop.id,
      player_name: prop.player_name,
      team: playerTeam,
      opponent: opponentTeam,
      position: position,
      prop_market: prop.prop_market,
      prop_line: propLine,
      predicted_value: predictedValue,
      confidence_score: confidence,
      value_score: valueScore,
      recommended_bet: recommendedBet,
      odds: prop.odds,
      reasoning: validatedReasoning,
      breakdown: {
        player_stats_score: playerStats.score,
        defensive_matchup_score: defenseMatchup.score,
        game_environment_score: gameEnvironment.score,
        season_avg: playerStats.seasonAvg,
        matchup_adjustment: defenseMatchup.adjustment,
        game_script_adjustment: gameEnvironment.gameScriptAdj,
      }
    };
  } catch (error) {
    console.error(`Error predicting prop for ${prop.player_name}:`, error);
    return null;
  }
}

/**
 * Generate predictions for all available player props
 */
export async function generateAllPropPredictions(
  weekNumber: number,
  season: number = 2025
): Promise<{ total: number; saved: number; failed: number }> {
  const supabase = getSupabaseClient();
  const result = { total: 0, saved: 0, failed: 0 };
  
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🎯 GENERATING PLAYER PROP PREDICTIONS - Week ${weekNumber}, ${season}`);
    console.log(`${'='.repeat(70)}\n`);
    
    // Fetch all props with lines (exclude some anytime TDs for now)
    const { data: props, error } = await supabase
      .from('player_props')
      .select('*')
      .not('line', 'is', null)
      .gte('commence_time', new Date().toISOString())
      .order('player_name');
    
    if (error) {
      console.error('Error fetching props:', error);
      return result;
    }
    
    if (!props || props.length === 0) {
      console.log('No player props found');
      return result;
    }
    
    result.total = props.length;
    console.log(`📊 Analyzing ${props.length} player props...\n`);
    
    // Predict all props
    for (const prop of props) {
      try {
        console.log(`🏈 ${prop.player_name} - ${prop.prop_market} (${prop.line})`);
        
        const prediction = await predictPlayerProp(prop as PlayerProp);
        
        if (prediction && prediction.recommended_bet) {
          // Save to database
          const { error: saveError } = await supabase
            .from('player_prop_predictions')
            .upsert({
              prop_id: prediction.prop_id,
              player_name: prediction.player_name,
              team: prediction.team,
              opponent: prediction.opponent,
              position: prediction.position,
              prop_market: prediction.prop_market,
              prop_line: prediction.prop_line,
              predicted_value: prediction.predicted_value,
              confidence_score: prediction.confidence_score,
              value_score: prediction.value_score,
              recommended_bet: prediction.recommended_bet,
              odds: prediction.odds,
              reasoning: prediction.reasoning,
              breakdown: prediction.breakdown,
              week_number: weekNumber,
              season: season,
            }, {
              onConflict: 'prop_id,week_number,season',
              ignoreDuplicates: false,
            });
          
          if (!saveError) {
            result.saved++;
            console.log(`   ✅ Saved: ${prediction.recommended_bet} ${prediction.prop_line} (${prediction.confidence_score.toFixed(0)}% conf)`);
          } else {
            result.failed++;
            console.log(`   ❌ Failed to save: ${saveError.message}`);
          }
        } else if (prediction) {
          console.log(`   ⚠️  No recommendation (insufficient edge or confidence)`);
        } else {
          result.failed++;
          console.log(`   ⚠️  Could not generate prediction`);
        }
      } catch (error) {
        result.failed++;
        console.error(`   ❌ Error:`, error);
      }
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📈 RESULTS:`);
    console.log(`   Total: ${result.total}`);
    console.log(`   ✅ Saved: ${result.saved}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    console.log(`${'='.repeat(70)}\n`);
    
    return result;
  } catch (error) {
    console.error('Error generating prop predictions:', error);
    return result;
  }
}

/**
 * Get best prop bets from database
 */
export async function getBestPropBets(
  limit: number = 10,
  weekNumber?: number,
  season?: number
): Promise<PlayerPropPrediction[]> {
  const supabase = getSupabaseClient();
  
  try {
    let query = supabase
      .from('player_prop_predictions')
      .select('*')
      .not('recommended_bet', 'is', null)
      .gte('confidence_score', 60)
      .order('confidence_score', { ascending: false })
      .limit(limit);
    
    if (weekNumber) query = query.eq('week_number', weekNumber);
    if (season) query = query.eq('season', season);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching best prop bets:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getBestPropBets:', error);
    return [];
  }
}

