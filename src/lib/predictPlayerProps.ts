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
    .limit(1)
    .maybeSingle();
  
  if (qbData) return { team: qbData.team_abbr, position: qbData.position || 'QB' };
  
  // Try rushing stats (RBs)
  const { data: rbData } = await supabase
    .from('player_rushing_stats')
    .select('team_abbr, position')
    .ilike('player_name', playerName)
    .limit(1)
    .maybeSingle();
  
  if (rbData) return { team: rbData.team_abbr, position: rbData.position || 'RB' };
  
  // Try receiving stats (WRs/TEs)
  const { data: wrData } = await supabase
    .from('player_receiving_stats')
    .select('team_abbr, position')
    .ilike('player_name', playerName)
    .limit(1)
    .maybeSingle();
  
  if (wrData) return { team: wrData.team_abbr, position: wrData.position || 'WR' };
  
  return null;
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
 * Calculate Defensive Matchup Score (40% weight)
 * Based on opponent's defense vs that position
 */
async function calculateDefensiveMatchupScore(
  position: string,
  propMarket: string,
  opponentTeam: string,
  propLine: number
): Promise<{ score: number; adjustment: number; details: string[] }> {
  const supabase = getSupabaseClient();
  const details: string[] = [];
  
  try {
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
          adjustment = vsLeagueAvg * 0.15; // Each yard above avg = +0.15 adjustment
          
          // Score: Strong defense (low yards) = low score = favor UNDER
          defenseRating = Math.max(0, Math.min(100, 100 - ((passYdsAllowedPerGame - 180) / 100 * 100)));
          
          details.push(`Opp allows ${passYdsAllowedPerGame.toFixed(1)} pass yds/game (league avg: 220)`);
          details.push(`Matchup adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(1)} yards`);
        } else if (propMarket === 'player_pass_tds') {
          const passTDsAllowedPerGame = defStats.pass_td / gamesPlayed;
          const vsLeagueAvg = passTDsAllowedPerGame - 1.6; // League avg ~1.6 TDs/game
          adjustment = vsLeagueAvg * 0.15;
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((passTDsAllowedPerGame - 0.8) / 2.0 * 100)));
          
          details.push(`Opp allows ${passTDsAllowedPerGame.toFixed(2)} pass TDs/game (league avg: 1.6)`);
          details.push(`Matchup adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(2)} TDs`);
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
          adjustment = vsLeagueAvg * 0.12;
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((rushYdsAllowedPerGame - 80) / 80 * 100)));
          
          details.push(`Opp allows ${rushYdsAllowedPerGame.toFixed(1)} rush yds to RBs/game (league avg: 115)`);
          details.push(`Matchup adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(1)} yards`);
        } else if (propMarket === 'player_reception_yds') {
          const recYdsAllowedPerGame = defStats.rec_yds / gamesPlayed;
          const vsLeagueAvg = recYdsAllowedPerGame - 40; // League avg ~40 rec yds to RBs
          adjustment = vsLeagueAvg * 0.10;
          
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
          adjustment = vsLeagueAvg * 0.10;
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((recYdsAllowedPerGame - 150) / 100 * 100)));
          
          details.push(`Opp allows ${recYdsAllowedPerGame.toFixed(1)} rec yds to WRs/game (league avg: 190)`);
          details.push(`Matchup adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(1)} yards`);
        } else if (propMarket === 'player_receptions') {
          const receptionsAllowed = defStats.receptions / gamesPlayed;
          const vsLeagueAvg = receptionsAllowed - 17; // League avg ~17 rec to WRs
          adjustment = vsLeagueAvg * 0.08;
          
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
          const vsLeagueAvg = recYdsAllowedPerGame - 55; // League avg ~55 rec yds to TEs
          adjustment = vsLeagueAvg * 0.12;
          
          defenseRating = Math.max(0, Math.min(100, 100 - ((recYdsAllowedPerGame - 35) / 50 * 100)));
          
          details.push(`Opp allows ${recYdsAllowedPerGame.toFixed(1)} rec yds to TEs/game (league avg: 55)`);
          details.push(`Matchup adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(1)} yards`);
        } else if (propMarket === 'player_receptions') {
          const receptionsAllowed = defStats.receptions / gamesPlayed;
          const vsLeagueAvg = receptionsAllowed - 5.5; // League avg ~5.5 rec to TEs
          adjustment = vsLeagueAvg * 0.10;
          
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
 * Calculate Game Environment Score (10% weight)
 * Based on Vegas totals, injuries, and game script
 */
async function calculateGameEnvironmentScore(
  playerTeam: string,
  opponentTeam: string,
  position: string,
  homeTeam: string,
  awayTeam: string
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
      .eq('week', 11)
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
    
    // 2. Check for injuries to teammates (boosts target share)
    const playerFullTeamName = Object.keys(TEAM_ABBR_MAP).find(
      key => TEAM_ABBR_MAP[key] === playerTeam
    );
    
    const { data: teamInjuries } = await supabase
      .from('injuries')
      .select('player_name, position, game_status')
      .eq('team_abbr', playerTeam)
      .eq('season', 2025)
      .eq('on_track_to_play', false);
    
    if (teamInjuries && teamInjuries.length > 0) {
      let keyInjuries = 0;
      
      teamInjuries.forEach(injury => {
        // WR1 out boosts WR2/WR3
        if (injury.position === 'WR' && (position === 'WR' || position === 'TE')) {
          keyInjuries++;
          gameScriptAdj += 1.5;
          details.push(`Key injury: ${injury.player_name} (${injury.position}) OUT - increased targets`);
        }
        // RB1 out boosts RB2
        else if (injury.position === 'RB' && position === 'RB') {
          keyInjuries++;
          gameScriptAdj += 2;
          details.push(`Key injury: ${injury.player_name} (${injury.position}) OUT - increased workload`);
        }
        // QB out generally bad for everyone
        else if (injury.position === 'QB') {
          gameScriptAdj -= 2;
          details.push(`Key injury: ${injury.player_name} (QB) OUT - backup QB penalty`);
        }
      });
      
      environmentScore += Math.min(20, keyInjuries * 8);
    }
    
    // 3. Check for opponent defensive injuries (boosts matchup)
    const opponentFullName = Object.keys(TEAM_ABBR_MAP).find(
      key => TEAM_ABBR_MAP[key] === opponentTeam
    );
    
    const { data: oppInjuries } = await supabase
      .from('injuries')
      .select('player_name, position, game_status')
      .eq('team_abbr', opponentTeam)
      .eq('season', 2025)
      .eq('on_track_to_play', false);
    
    if (oppInjuries && oppInjuries.length > 0) {
      oppInjuries.forEach(injury => {
        // CB1 out boosts WR1
        if (injury.position === 'CB' && position === 'WR') {
          gameScriptAdj += 1.5;
          environmentScore += 8;
          details.push(`Opp injury: ${injury.player_name} (CB) OUT - favorable matchup`);
        }
        // LB out boosts RB receiving and TEs
        else if (injury.position === 'LB' && (position === 'RB' || position === 'TE')) {
          gameScriptAdj += 1.2;
          environmentScore += 6;
          details.push(`Opp injury: ${injury.player_name} (LB) OUT - middle of field open`);
        }
        // S out boosts deep threats
        else if (injury.position === 'S' && (position === 'WR' || position === 'TE')) {
          gameScriptAdj += 1.0;
          environmentScore += 5;
          details.push(`Opp injury: ${injury.player_name} (S) OUT - deep ball opportunities`);
        }
      });
    }
    
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
      propLine
    );
    
    const gameEnvironment = await calculateGameEnvironmentScore(
      playerTeam,
      opponentTeam,
      position,
      prop.home_team,
      prop.away_team
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
    
    const MIN_VALUE_THRESHOLD = prop.prop_market === 'player_anytime_td' ? 0.08 : 3.0;
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
      '--- Player Stats (50%) ---',
      ...playerStats.details,
      '',
      '--- Defensive Matchup (40%) ---',
      ...defenseMatchup.details,
      '',
      '--- Game Environment (10%) ---',
      ...gameEnvironment.details,
    ].join('\n');
    
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
      reasoning: reasoning + '\n\n' + allDetails,
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

