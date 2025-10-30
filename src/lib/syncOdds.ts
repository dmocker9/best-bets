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

// The Odds API configuration
const ODDS_API_KEY = process.env.ODDS_API_KEY || 'd38b7f712b4ef276d719082f04a4c89e';

interface OddsApiGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: any[];
}

export interface SyncOddsResult {
  success: boolean;
  message: string;
  inserted: number;
  updated: number;
  failed: number;
  errors: string[];
  totalGames: number;
}

interface FlattenedBookmaker {
  bookmaker_name: string;
  // Spreads (point spread betting)
  spread_home_price: number | null;
  spread_away_price: number | null;
  spread_home_line: number | null;
  spread_away_line: number | null;
  // Moneyline (h2h - win/loss betting)
  moneyline_home_price: number | null;
  moneyline_away_price: number | null;
}

/**
 * Flattens the complex bookmakers structure from The Odds API into a simpler format
 * 
 * @param bookmakers - Raw bookmakers array from API
 * @param homeTeam - Home team name to match outcomes
 * @param awayTeam - Away team name to match outcomes
 * @returns Simplified array with just bookmaker names and prices
 */
function flattenBookmakers(
  bookmakers: any[],
  homeTeam: string,
  awayTeam: string
): FlattenedBookmaker[] {
  if (!bookmakers || bookmakers.length === 0) {
    return [];
  }

  return bookmakers.map((bookmaker) => {
    const flattened: FlattenedBookmaker = {
      bookmaker_name: bookmaker.title || bookmaker.key || 'Unknown',
      spread_home_price: null,
      spread_away_price: null,
      spread_home_line: null,
      spread_away_line: null,
      moneyline_home_price: null,
      moneyline_away_price: null,
    };

    // Find the spreads market
    const spreadMarket = bookmaker.markets?.find((m: any) => m.key === 'spreads');
    
    if (spreadMarket && spreadMarket.outcomes) {
      // Find home and away team outcomes
      const homeOutcome = spreadMarket.outcomes.find(
        (o: any) => o.name === homeTeam
      );
      const awayOutcome = spreadMarket.outcomes.find(
        (o: any) => o.name === awayTeam
      );

      if (homeOutcome) {
        flattened.spread_home_price = homeOutcome.price || null;
        flattened.spread_home_line = homeOutcome.point || null;
      }

      if (awayOutcome) {
        flattened.spread_away_price = awayOutcome.price || null;
        flattened.spread_away_line = awayOutcome.point || null;
      }
    }

    // Find the h2h (moneyline) market
    const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');
    
    if (h2hMarket && h2hMarket.outcomes) {
      // Find home and away team outcomes
      const homeOutcome = h2hMarket.outcomes.find(
        (o: any) => o.name === homeTeam
      );
      const awayOutcome = h2hMarket.outcomes.find(
        (o: any) => o.name === awayTeam
      );

      if (homeOutcome) {
        flattened.moneyline_home_price = homeOutcome.price || null;
      }

      if (awayOutcome) {
        flattened.moneyline_away_price = awayOutcome.price || null;
      }
    }

    return flattened;
  }).filter(b => {
    // Include bookmakers with either spread or moneyline odds
    const hasSpread = b.spread_home_price !== null || b.spread_away_price !== null;
    const hasMoneyline = b.moneyline_home_price !== null || b.moneyline_away_price !== null;
    return hasSpread || hasMoneyline;
  });
}

/**
 * Fetches odds data from The Odds API and syncs it to the odds_bets table
 * 
 * @param sport - The sport key to fetch odds for (default: 'americanfootball_nfl')
 * @param apiKey - Optional API key override
 * @returns Promise<SyncOddsResult> - Summary of the sync operation
 * 
 * @example
 * ```typescript
 * const result = await syncOddsToDatabase();
 * console.log(result.message);
 * console.log(`Inserted: ${result.inserted}, Updated: ${result.updated}`);
 * ```
 */
export async function syncOddsToDatabase(
  sport: string = 'americanfootball_nfl',
  apiKey?: string
): Promise<SyncOddsResult> {
  const supabase = getSupabaseClient();
  const key = apiKey || ODDS_API_KEY;
  
  const result: SyncOddsResult = {
    success: true,
    message: '',
    inserted: 0,
    updated: 0,
    failed: 0,
    errors: [],
    totalGames: 0,
  };

  try {
    // Build API URL with markets parameter to include both h2h (moneyline) and spreads
    const apiUrl = `https://api.the-odds-api.com/v4/sports/${sport}/odds?regions=us&oddsFormat=american&markets=h2h,spreads&apiKey=${key}`;
    
    // Fetch data from The Odds API
    console.log(`Fetching odds data for ${sport}...`);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    const games: OddsApiGame[] = await response.json();
    result.totalGames = games.length;
    
    console.log(`Fetched ${games.length} games from The Odds API`);

    if (games.length === 0) {
      result.message = 'No games found from API';
      return result;
    }

    // Process each game and upsert into the database
    for (const game of games) {
      try {
        // Check if record exists
        const { data: existingRecord } = await supabase
          .from('odds_bets')
          .select('id')
          .eq('api_id', game.id)
          .single();

        // Flatten the bookmakers data for easier querying
        const flattenedBookmakers = flattenBookmakers(
          game.bookmakers,
          game.home_team,
          game.away_team
        );

        // Prepare the data for insertion/update
        const oddsData = {
          api_id: game.id,
          sport_key: game.sport_key,
          sport_title: game.sport_title,
          commence_time: game.commence_time,
          home_team: game.home_team,
          away_team: game.away_team,
          bookmakers: flattenedBookmakers,
          updated_at: new Date().toISOString(),
        };

        // Upsert the record (insert or update based on api_id)
        const { error } = await supabase
          .from('odds_bets')
          .upsert(oddsData, {
            onConflict: 'api_id',
            ignoreDuplicates: false, // Always update if exists
          });

        if (error) {
          throw error;
        }

        // Track whether it was an insert or update
        if (existingRecord) {
          result.updated++;
          console.log(`Updated: ${game.home_team} vs ${game.away_team}`);
        } else {
          result.inserted++;
          console.log(`Inserted: ${game.home_team} vs ${game.away_team}`);
        }
      } catch (error) {
        result.failed++;
        const errorMessage = `Failed to sync game ${game.id} (${game.home_team} vs ${game.away_team}): ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        result.errors.push(errorMessage);
        console.error(errorMessage);
      }
    }

    // Set final message
    if (result.failed === 0) {
      result.message = `✅ Successfully synced all ${result.totalGames} games (${result.inserted} new, ${result.updated} updated)`;
      result.success = true;
    } else if (result.failed < result.totalGames) {
      result.success = true; // Partial success
      result.message = `⚠️ Partial sync: ${result.inserted} inserted, ${result.updated} updated, ${result.failed} failed out of ${result.totalGames} total`;
    } else {
      result.success = false;
      result.message = `❌ Sync failed: All ${result.totalGames} games failed to sync`;
    }

    console.log(result.message);
    return result;
  } catch (error) {
    result.success = false;
    result.message = `❌ Fatal error during sync: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`;
    result.errors.push(result.message);
    console.error(result.message);
    return result;
  }
}

/**
 * Fetches odds for multiple sports and syncs them all
 * 
 * @param sports - Array of sport keys to sync
 * @returns Promise<Record<string, SyncOddsResult>> - Results for each sport
 * 
 * @example
 * ```typescript
 * const results = await syncMultipleSports(['americanfootball_nfl', 'basketball_nba']);
 * ```
 */
export async function syncMultipleSports(
  sports: string[]
): Promise<Record<string, SyncOddsResult>> {
  const results: Record<string, SyncOddsResult> = {};

  for (const sport of sports) {
    console.log(`\n--- Syncing ${sport} ---`);
    results[sport] = await syncOddsToDatabase(sport);
  }

  return results;
}

