import { createClient } from '@supabase/supabase-js';

type Nullable<T> = T | null;

// Supabase client (service role on server)
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

export type PlayerPropRow = {
  event_id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  player_name: string;
  prop_market: string; // e.g., player_pass_yds, player_rush_yds, player_reception_yds, player_receptions, player_pass_tds, player_rush_attempts
  bookmaker_key: string;
  bookmaker_title: string;
  bet_type: string; // Over | Under | name for TD-anytime
  line: number | null;
  odds: number; // American odds
  last_update: string;
};

export type PlayerRow = {
  table: 'QB_passing_stats_2025' | 'RB_rushing_stats_2025' | 'WR_TE_receiving_stats_2025';
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'WR/TE' | string;
  player_name: string;
  team: string | null;
  raw: Record<string, any>;
};

export type TeamDefenseStats = Record<string, any> & { team_name?: string };

export type PropRecommendation = {
  event_id: string;
  player_name: string;
  team: string | null;
  opponent: string;
  position: string;
  prop_market: string;
  bookmaker: string;
  line: number | null;
  odds: number;
  side: 'Over' | 'Under' | 'No Bet';
  probability: number; // 0..100
  edge: number; // percentage points vs implied
  expected_value: number; // EV as percentage of stake
  reasoning: string;
};

// League-average baselines (rough defaults when opponent data missing)
const LEAGUE_AVG = {
  player_pass_yds: 235,
  player_pass_tds: 1.6,
  player_rush_yds: 60,
  player_rush_attempts: 14,
  player_reception_yds: 55,
  player_receptions: 4.5,
};

// Assumed per-game standard deviations (coarse priors)
const STAT_STDEV = {
  player_pass_yds: 45,
  player_pass_tds: 0.8,
  player_rush_yds: 20,
  player_rush_attempts: 3.0,
  player_reception_yds: 25,
  player_receptions: 1.5,
};

function americanOddsToImpliedProb(odds: number): number {
  if (odds === 0) return 0.5;
  if (odds > 0) return 100 / (odds + 100);
  return -odds / (-odds + 100);
}

function impliedProbToEV(prob: number, odds: number): number {
  // EV per unit stake = p*profit - (1-p)*1
  const profit = odds > 0 ? odds / 100 : 100 / -odds;
  return prob * profit - (1 - prob);
}

// Approx standard normal CDF (Abramowitz-Stegun)
function normalCdf(x: number): number {
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const t = 1 / (1 + p * Math.abs(x));
  const z = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  const cdf = 1 - z * poly;
  return x >= 0 ? cdf : 1 - cdf;
}

function probOver(mean: number, stdev: number, line: number): number {
  if (stdev <= 1e-6) return mean > line ? 1 : 0;
  const z = (line - mean) / stdev;
  return 1 - normalCdf(z);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Map markets to player stat accessors and opponent allowance fields
function getMarketConfig(market: string) {
  switch (market) {
    case 'player_pass_yds':
      return { playerSeasonKey: 'passing_yards_per_game', playerLast3Key: 'last_3_games_passing_avg', oppKey: 'pass_yards_allowed_per_game' };
    case 'player_pass_tds':
      return { playerSeasonKey: null, playerLast3Key: null, oppKey: 'pass_tds_allowed_per_game' };
    case 'player_rush_yds':
      return { playerSeasonKey: 'rushing_yards_per_game', playerLast3Key: 'last_3_games_rushing_avg', oppKey: 'rush_yards_allowed_per_game' };
    case 'player_rush_attempts':
      return { playerSeasonKey: null, playerLast3Key: null, oppKey: null };
    case 'player_reception_yds':
      return { playerSeasonKey: 'receiving_yards_per_game', playerLast3Key: 'last_3_games_receiving_avg', oppKey: 'rec_yards_allowed_per_game' };
    case 'player_receptions':
      return { playerSeasonKey: null, playerLast3Key: null, oppKey: 'receptions_allowed_per_game' };
    default:
      return { playerSeasonKey: null, playerLast3Key: null, oppKey: null };
  }
}

async function getPlayerFromPositionTables(playerName: string): Promise<Nullable<PlayerRow>> {
  const supabase = getSupabaseClient();
  const tables: Array<{ table: PlayerRow['table']; position: PlayerRow['position'] }> = [
    { table: 'QB_passing_stats_2025', position: 'QB' },
    { table: 'RB_rushing_stats_2025', position: 'RB' },
    { table: 'WR_TE_receiving_stats_2025', position: 'WR/TE' },
  ];
  for (const t of tables) {
    try {
      const { data, error } = await supabase
        .from(t.table)
        .select('*')
        .ilike('player_name', playerName)
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        const team = (data as any).team || (data as any).team_name || null;
        return { table: t.table, position: t.position, player_name: (data as any).player_name || playerName, team, raw: data as any };
      }
    } catch (_) {
      // table may not exist or no match
    }
  }
  return null;
}

// Try multiple defense tables gracefully
async function getTeamDefenseStats(teamName: string): Promise<Nullable<TeamDefenseStats>> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('team_defense_stats')
      .select('*')
      .ilike('team_name', teamName)
      .limit(1)
      .maybeSingle();
    if (!error && data) {
      return data as TeamDefenseStats;
    }
  } catch (_) {
    // ignore
  }
  return null;
}

function findNumeric(row: Record<string, any>, includePatterns: string[], preferPatterns: string[] = []): number | null {
  const keys = Object.keys(row);
  const lc = (s: string) => s.toLowerCase();
  const matches = keys.filter(k => includePatterns.every(p => lc(k).includes(p)) && typeof row[k] === 'number');
  if (matches.length === 0) return null;
  if (preferPatterns.length > 0) {
    const preferred = matches.find(k => preferPatterns.some(p => lc(k).includes(p)));
    if (preferred) return row[preferred];
  }
  return row[matches[0]];
}

function estimateMeanForMarket(market: string, player: PlayerRow, def: Nullable<TeamDefenseStats>): number {
  const row = player.raw;
  let base: number | null = null;

  if (market === 'player_pass_yds') {
    base = findNumeric(row, ['pass', 'yd'], ['per', 'pg']);
  } else if (market === 'player_pass_tds') {
    base = findNumeric(row, ['pass', 'td'], ['per', 'pg']);
  } else if (market === 'player_rush_yds') {
    base = findNumeric(row, ['rush', 'yd'], ['per', 'pg']);
  } else if (market === 'player_rush_attempts') {
    base = findNumeric(row, ['rush', 'att'], ['per', 'pg']);
  } else if (market === 'player_reception_yds') {
    base = findNumeric(row, ['receiv', 'yd'], ['per', 'pg']);
    if (base == null) base = findNumeric(row, ['rec', 'yd'], ['per', 'pg']);
  } else if (market === 'player_receptions') {
    base = findNumeric(row, ['recept'], ['per', 'pg']);
    if (base == null) base = findNumeric(row, ['rec'], ['per', 'pg']);
  }

  if (base == null) {
    base = (LEAGUE_AVG as any)[market] ?? 0;
  }

  let mean = base as number;

  // Opponent adjustment using available defensive metrics by pattern
  const leagueAvg = (LEAGUE_AVG as any)[market] as number | undefined;
  if (def && leagueAvg) {
    const tryKeys = (
      market === 'player_pass_yds' ? ['pass', 'yd', 'allow'] :
      market === 'player_pass_tds' ? ['pass', 'td', 'allow'] :
      market === 'player_rush_yds' ? ['rush', 'yd', 'allow'] :
      market === 'player_reception_yds' ? ['receiv', 'yd', 'allow'] :
      market === 'player_receptions' ? ['recept', 'allow'] : ['yd', 'allow']
    );
    const defVal = findNumeric(def, tryKeys, ['per', 'pg']);
    if (defVal != null) {
      const ratio = clamp(defVal / leagueAvg, 0.7, 1.3);
      mean = mean * (1 + (ratio - 1) * 0.6);
    }
  }

  return mean;
}

function estimateStdevForMarket(market: string): number {
  return (STAT_STDEV as any)[market] ?? 20;
}

function pickOverUnder(mean: number, stdev: number, line: number | null, odds: number): { side: 'Over' | 'Under' | 'No Bet'; prob: number; edge: number; ev: number } {
  if (line == null) return { side: 'No Bet', prob: 0, edge: 0, ev: 0 };
  const pOver = probOver(mean, stdev, line);
  const pUnder = 1 - pOver;
  const implied = americanOddsToImpliedProb(odds);
  // Assume same odds for both sides if not provided; edge calculated against implied on the chosen side
  const edgeOver = pOver - implied;
  const edgeUnder = pUnder - implied;
  const evOver = impliedProbToEV(pOver, odds);
  const evUnder = impliedProbToEV(pUnder, odds);
  if (edgeOver > edgeUnder) {
    return { side: edgeOver > 0.05 ? 'Over' : 'No Bet', prob: pOver, edge: edgeOver, ev: evOver };
  } else {
    return { side: edgeUnder > 0.05 ? 'Under' : 'No Bet', prob: pUnder, edge: edgeUnder, ev: evUnder };
  }
}

export async function getBestPlayerPropRecommendations(limit: number = 20): Promise<PropRecommendation[]> {
  const supabase = getSupabaseClient();

  // 1) Pull upcoming props
  const { data: props, error } = await supabase
    .from('player_props')
    .select('event_id, sport_key, sport_title, commence_time, home_team, away_team, player_name, prop_market, bookmaker_key, bookmaker_title, bet_type, line, odds')
    .gte('commence_time', new Date().toISOString())
    .order('commence_time', { ascending: true })
    .limit(500);
  if (error || !props) return [];

  const results: PropRecommendation[] = [];

  // 2) Score each prop
  for (const row of props as PlayerPropRow[]) {
    const player = await getPlayerFromPositionTables(row.player_name);
    if (!player) continue;

    // Filter markets by position: For RBs, only consider rushing props
    const isRB = player.position === 'RB' || player.table === 'RB_rushing_stats_2025';
    const rushMarkets = new Set(['player_rush_yds', 'player_rush_attempts']);
    if (isRB) {
      if (!rushMarkets.has(row.prop_market)) continue; // Skip non-rushing props for RBs
    } else {
      if (rushMarkets.has(row.prop_market)) continue; // Skip rushing props for non-RBs
    }

    const opponent = player.team && row.home_team && row.away_team
      ? (player.team === row.home_team ? row.away_team : row.home_team)
      : (row.home_team === player.team ? row.away_team : row.home_team);

    const oppDef = await getTeamDefenseStats(opponent);

    const mean = estimateMeanForMarket(row.prop_market, player, oppDef);
    const stdev = estimateStdevForMarket(row.prop_market);

    const pick = pickOverUnder(mean, stdev, row.line, row.odds);

    if (pick.side !== 'No Bet') {
      const reasoning = `Mean ${mean.toFixed(1)} vs line ${row.line}; stdev ${stdev}; opponent ${opponent}.`;
      results.push({
        event_id: row.event_id,
        player_name: player.player_name,
        team: player.team ?? null,
        opponent,
        position: player.position,
        prop_market: row.prop_market,
        bookmaker: row.bookmaker_title,
        line: row.line,
        odds: row.odds,
        side: pick.side,
        probability: Math.round(pick.prob * 1000) / 10,
        edge: Math.round(pick.edge * 1000) / 10,
        expected_value: Math.round(pick.ev * 1000) / 10,
        reasoning,
      });
    }
  }

  // 3) Sort by EV, then edge, then probability
  results.sort((a, b) => {
    if (b.expected_value !== a.expected_value) return b.expected_value - a.expected_value;
    if (b.edge !== a.edge) return b.edge - a.edge;
    return b.probability - a.probability;
  });

  return results.slice(0, limit);
}

export async function savePropRecommendations(recs: PropRecommendation[]): Promise<{ inserted: number; failed: number }> {
  const supabase = getSupabaseClient();
  if (!recs || recs.length === 0) return { inserted: 0, failed: 0 };

  // Map to DB format (flat, minimal columns)
  const rows = recs.map(r => ({
    event_id: r.event_id,
    player_name: r.player_name,
    team: r.team,
    opponent: r.opponent,
    position: r.position,
    prop_market: r.prop_market,
    bookmaker: r.bookmaker,
    line: r.line,
    odds: r.odds,
    side: r.side,
    probability: r.probability,
    edge: r.edge,
    expected_value: r.expected_value,
    reasoning: r.reasoning,
  }));

  const { error } = await supabase
    .from('prop_recommendations')
    .upsert(rows, {
      onConflict: 'event_id,player_name,prop_market,bookmaker,line,side',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error saving prop recommendations:', error);
    return { inserted: 0, failed: rows.length };
  }

  return { inserted: rows.length, failed: 0 };
}

export async function getPropRecommendationsFromDatabase(limit: number = 20): Promise<PropRecommendation[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('prop_recommendations')
    .select('*')
    .order('expected_value', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error reading prop recommendations:', error);
    return [];
  }

  return (data as any[]) as PropRecommendation[];
}


