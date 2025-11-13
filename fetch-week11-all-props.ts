/**
 * Fetch Player Props for ALL Week 11 Games
 * Only includes players in top 200 usage ranking
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.ODDS_API_KEY || 'd38b7f712b4ef276d719082f04a4c89e';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWeek11Games() {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('odds_bets')
    .select('id, api_id, home_team, away_team, commence_time')
    .eq('week', 11)
    .order('commence_time');
  
  if (error) throw error;
  return data || [];
}

async function getTop200Players() {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('total_player_stats')
    .select('player_name, position, team_abbr, usage_rank')
    .lte('usage_rank', 200)
    .order('usage_rank');
  
  if (error) throw error;
  
  const playerSet = new Set((data || []).map(p => p.player_name));
  console.log(`✅ Loaded ${playerSet.size} top-200 usage players\n`);
  
  return playerSet;
}

async function fetchPlayerProps(eventId: string, gameName: string) {
  const API_URL = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/${eventId}/odds`;
  
  try {
    const params = new URLSearchParams({
      apiKey: API_KEY,
      regions: 'us',
      markets: 'player_rush_attempts,player_rush_yds,player_receptions,player_reception_yds,player_anytime_td,player_pass_yds,player_pass_tds,player_pass_completions,player_pass_attempts',
      oddsFormat: 'american'
    });

    const response = await fetch(`${API_URL}?${params}`);
    
    if (!response.ok) {
      console.log(`   ⚠️  API error ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`   ✅ Fetched data: ${data.bookmakers?.length || 0} bookmakers`);
    
    return data;
  } catch (error: any) {
    console.error(`   ❌ Error:`, error.message);
    return null;
  }
}

function parsePlayerProps(apiData: any, top200Players: Set<string>) {
  const rows: any[] = [];
  let filtered = 0;

  const {
    id: event_id,
    sport_key,
    sport_title,
    commence_time,
    home_team,
    away_team,
    bookmakers
  } = apiData;

  if (!bookmakers || bookmakers.length === 0) {
    return { rows, filtered };
  }

  bookmakers.forEach((bookmaker: any) => {
    const { key: bookmaker_key, title: bookmaker_title, markets } = bookmaker;

    // ONLY DraftKings
    if (bookmaker_key !== 'draftkings') {
      return;
    }

    if (!markets) return;

    markets.forEach((market: any) => {
      const { key: prop_market, outcomes, last_update } = market;

      if (!outcomes) return;

      outcomes.forEach((outcome: any) => {
        const { name, description, price, point } = outcome;
        
        const player_name = description || name;
        const bet_type = name;
        
        // Filter: Only include if player is in top 200 OR is defense/special teams
        const isDefense = player_name.includes('Defense') || player_name.includes('D/ST') || player_name === 'No Touchdown';
        if (!top200Players.has(player_name) && !isDefense) {
          filtered++;
          return;
        }

        rows.push({
          event_id,
          sport_key,
          sport_title,
          commence_time,
          home_team,
          away_team,
          player_name,
          prop_market,
          bookmaker_key,
          bookmaker_title,
          bet_type,
          line: point || null,
          odds: price,
          last_update
        });
      });
    });
  });

  return { rows, filtered };
}

async function saveToSupabase(props: any[], eventId: string) {
  const supabase = getSupabaseClient();
  
  if (props.length === 0) {
    console.log('   ⚠️  No props to save (all filtered)');
    return 0;
  }
  
  // Clear existing props for this event
  await supabase
    .from('player_props')
    .delete()
    .eq('event_id', eventId);

  // Insert new props in batches
  const BATCH_SIZE = 100;
  let saved = 0;

  for (let i = 0; i < props.length; i += BATCH_SIZE) {
    const batch = props.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from('player_props')
      .insert(batch);

    if (error) {
      console.error(`   ❌ Error saving batch:`, error.message);
      throw error;
    }

    saved += batch.length;
  }

  console.log(`   ✅ Saved ${saved} props`);
  return saved;
}

async function main() {
  console.log('================================================================================');
  console.log('🏈 NFL WEEK 11 - ALL PLAYER PROPS FETCHER');
  console.log('Filter: Top 200 Usage Players Only');
  console.log('================================================================================\n');

  try {
    // Get Week 11 games
    const games = await getWeek11Games();
    console.log(`📅 Found ${games.length} Week 11 games\n`);

    // Get top 200 players for filtering
    const top200Players = await getTop200Players();

    let totalStats = {
      games: 0,
      props: 0,
      filtered: 0,
      errors: 0
    };

    // Process each game
    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      const gameName = `${game.away_team} @ ${game.home_team}`;
      
      console.log(`\n[${i + 1}/${games.length}] ${gameName}`);
      console.log(`   Event ID: ${game.api_id}`);
      console.log(`   Time: ${new Date(game.commence_time).toLocaleString()}`);

      try {
        // Fetch props from API
        const apiData = await fetchPlayerProps(game.api_id, gameName);
        
        if (!apiData) {
          console.log('   ⚠️  Skipping (no data)');
          totalStats.errors++;
          await sleep(1000); // Rate limit
          continue;
        }

        // Parse and filter
        const { rows, filtered } = parsePlayerProps(apiData, top200Players);
        console.log(`   📊 Parsed: ${rows.length} props kept, ${filtered} filtered out`);

        // Save to database
        const saved = await saveToSupabase(rows, game.api_id);
        
        totalStats.games++;
        totalStats.props += saved;
        totalStats.filtered += filtered;

        // Rate limit: 6 requests per minute
        if (i < games.length - 1) {
          console.log('   ⏳ Waiting 10 seconds (rate limit)...');
          await sleep(10000);
        }

      } catch (error: any) {
        console.error(`   ❌ Error processing game:`, error.message);
        totalStats.errors++;
        await sleep(2000);
      }
    }

    console.log('\n================================================================================');
    console.log('📊 FINAL SUMMARY');
    console.log('================================================================================');
    console.log(`✅ Games Processed: ${totalStats.games}/${games.length}`);
    console.log(`✅ Total Props Saved: ${totalStats.props.toLocaleString()}`);
    console.log(`🗑️  Props Filtered Out: ${totalStats.filtered.toLocaleString()}`);
    console.log(`❌ Errors: ${totalStats.errors}`);
    console.log('================================================================================\n');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();

