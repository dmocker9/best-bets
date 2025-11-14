import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (lazy initialization to avoid build-time errors)
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// The Odds API configuration
const ODDS_API_KEY = process.env.ODDS_API_KEY || 'd38b7f712b4ef276d719082f04a4c89e';
const ODDS_API_URL = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?regions=us&oddsFormat=american&markets=h2h,spreads&apiKey=${ODDS_API_KEY}`;

interface OddsApiGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: any[];
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
 */
function flattenBookmakers(
  bookmakers: any[],
  homeTeam: string,
  awayTeam: string
): FlattenedBookmaker[] {
  console.log('🔍 Flattening bookmakers...');
  console.log(`   Home Team: ${homeTeam}`);
  console.log(`   Away Team: ${awayTeam}`);
  console.log(`   Bookmakers count: ${bookmakers?.length || 0}`);
  
  if (!bookmakers || bookmakers.length === 0) {
    console.log('⚠️  No bookmakers data provided');
    return [];
  }

  const flattened = bookmakers.map((bookmaker, index) => {
    console.log(`\n   📊 Processing bookmaker ${index + 1}/${bookmakers.length}:`);
    console.log(`      Key: ${bookmaker.key}`);
    console.log(`      Title: ${bookmaker.title}`);
    console.log(`      Markets: ${bookmaker.markets?.length || 0}`);
    
    const result: FlattenedBookmaker = {
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
      console.log(`      ✓ Found spreads market with ${spreadMarket.outcomes.length} outcomes`);
      
      // Find home and away team outcomes
      const homeOutcome = spreadMarket.outcomes.find(
        (o: any) => o.name === homeTeam
      );
      const awayOutcome = spreadMarket.outcomes.find(
        (o: any) => o.name === awayTeam
      );

      if (homeOutcome) {
        result.spread_home_price = homeOutcome.price || null;
        result.spread_home_line = homeOutcome.point || null;
        console.log(`      ✓ Spread Home: ${homeOutcome.point} (${homeOutcome.price})`);
      }

      if (awayOutcome) {
        result.spread_away_price = awayOutcome.price || null;
        result.spread_away_line = awayOutcome.point || null;
        console.log(`      ✓ Spread Away: ${awayOutcome.point} (${awayOutcome.price})`);
      }
    } else {
      console.log('      ⚠️  No spreads market found');
    }

    // Find the h2h (moneyline) market
    const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');
    
    if (h2hMarket && h2hMarket.outcomes) {
      console.log(`      ✓ Found h2h (moneyline) market with ${h2hMarket.outcomes.length} outcomes`);
      
      // Find home and away team outcomes
      const homeOutcome = h2hMarket.outcomes.find(
        (o: any) => o.name === homeTeam
      );
      const awayOutcome = h2hMarket.outcomes.find(
        (o: any) => o.name === awayTeam
      );

      if (homeOutcome) {
        result.moneyline_home_price = homeOutcome.price || null;
        console.log(`      ✓ Moneyline Home: ${homeOutcome.price}`);
      }

      if (awayOutcome) {
        result.moneyline_away_price = awayOutcome.price || null;
        console.log(`      ✓ Moneyline Away: ${awayOutcome.price}`);
      }
    } else {
      console.log('      ⚠️  No h2h (moneyline) market found');
    }

    return result;
  }).filter(b => {
    const hasSpread = b.spread_home_price !== null || b.spread_away_price !== null;
    const hasMoneyline = b.moneyline_home_price !== null || b.moneyline_away_price !== null;
    const hasData = hasSpread || hasMoneyline;
    
    if (!hasData) {
      console.log(`   ❌ Filtered out ${b.bookmaker_name} - no valid odds`);
    }
    return hasData;
  });

  console.log(`\n✅ Flattened ${flattened.length} bookmakers with valid odds\n`);
  return flattened;
}

interface SyncResult {
  success: boolean;
  message: string;
  inserted: number;
  updated: number;
  failed: number;
  errors: string[];
  totalGames: number;
}

/**
 * Fetches odds data from The Odds API and syncs it to the odds_bets table
 */
async function syncOddsData(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    message: '',
    inserted: 0,
    updated: 0,
    failed: 0,
    errors: [],
    totalGames: 0,
  };

  try {
    // Fetch data from The Odds API
    console.log('Fetching data from The Odds API...');
    const response = await fetch(ODDS_API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }

    const games: OddsApiGame[] = await response.json();
    result.totalGames = games.length;
    console.log(`Fetched ${games.length} games from The Odds API`);

    if (games.length === 0) {
      result.message = 'No games found from API';
      return result;
    }

    // Process each game and upsert into the database
    console.log(`\n🔄 Processing all ${games.length} games...\n`);
    
    for (const game of games) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📋 Processing Game: ${game.away_team} @ ${game.home_team}`);
        console.log(`   API ID: ${game.id}`);
        console.log(`   Sport: ${game.sport_title} (${game.sport_key})`);
        console.log(`   Start Time: ${game.commence_time}`);
        console.log(`${'='.repeat(60)}\n`);

        // Check if record exists (without throwing error)
        const supabase = getSupabaseClient();
        const { data: existingRecords, error: selectError } = await supabase
          .from('odds_bets')
          .select('id, api_id')
          .eq('api_id', game.id);

        if (selectError) {
          console.error('❌ Error checking for existing record:', selectError);
        }

        const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;
        
        if (existingRecord) {
          console.log(`🔄 Found existing record (ID: ${existingRecord.id})`);
        } else {
          console.log(`✨ No existing record found - will insert new`);
        }

        // Log raw bookmakers from API
        console.log(`\n📦 RAW API DATA:`);
        console.log(`   Bookmakers array length: ${game.bookmakers?.length || 0}`);
        if (game.bookmakers && game.bookmakers.length > 0) {
          console.log(`   First bookmaker sample:`, JSON.stringify(game.bookmakers[0], null, 2));
        }

        // Flatten the bookmakers data for easier querying
        const flattenedBookmakers = flattenBookmakers(
          game.bookmakers,
          game.home_team,
          game.away_team
        );

        console.log(`\n💾 DATA TO SAVE:`);
        console.log(`   Flattened bookmakers count: ${flattenedBookmakers.length}`);
        if (flattenedBookmakers.length > 0) {
          console.log(`   Flattened bookmakers:`, JSON.stringify(flattenedBookmakers, null, 2));
        } else {
          console.log(`   ⚠️  WARNING: No bookmakers after flattening!`);
        }

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

        console.log(`\n📝 Full data object to upsert:`);
        console.log(JSON.stringify(oddsData, null, 2));

        // Upsert the record
        console.log(`\n🔄 Executing upsert...`);
        const { data: upsertedData, error: upsertError } = await getSupabaseClient()
          .from('odds_bets')
          .upsert(oddsData, {
            onConflict: 'api_id',
            ignoreDuplicates: false,
          })
          .select();

        if (upsertError) {
          console.error('❌ Upsert error:', upsertError);
          throw upsertError;
        }

        console.log(`✅ Upsert successful!`);
        console.log(`   Returned data:`, JSON.stringify(upsertedData, null, 2));

        // Track whether it was an insert or update
        if (existingRecord) {
          result.updated++;
          console.log(`📊 Result: UPDATED existing record`);
        } else {
          result.inserted++;
          console.log(`📊 Result: INSERTED new record`);
        }

        console.log(`\n✅ Successfully synced: ${game.home_team} vs ${game.away_team}\n`);
      } catch (error) {
        result.failed++;
        const errorMessage = `Failed to sync game ${game.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMessage);
        console.error(`\n❌ ERROR:`, errorMessage);
        console.error('Full error:', error);
      }
    }

    // Set final message
    if (result.failed === 0) {
      result.message = `Successfully synced ${result.inserted + result.updated} games (${result.inserted} new, ${result.updated} updated)`;
    } else {
      result.success = false;
      result.message = `Synced with errors: ${result.inserted} inserted, ${result.updated} updated, ${result.failed} failed`;
    }

    console.log(result.message);
    return result;
  } catch (error) {
    result.success = false;
    result.message = `Fatal error during sync: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(result.message);
    console.error(result.message);
    return result;
  }
}

/**
 * GET endpoint to trigger odds sync
 * Can be called on demand or by a cron job
 */
export async function GET(request: Request) {
  try {
    // Optional: Add authentication/authorization here
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('Starting odds sync...');
    const result = await syncOddsData();

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('Sync endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to trigger odds sync (alternative method)
 */
export async function POST(request: Request) {
  return GET(request);
}

