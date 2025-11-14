/**
 * Fetch Player Props for Patriots vs Jets
 * Updates the player_props table with current odds
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Patriots vs Jets Event ID
const EVENT_ID = '32ec2bd4ac9e4c40f9f5cbed7e67f837';
const API_KEY = process.env.ODDS_API_KEY || 'd38b7f712b4ef276d719082f04a4c89e';
const API_URL = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/${EVENT_ID}/odds`;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

async function fetchPlayerProps() {
  console.log('🏈 Fetching Patriots vs Jets Player Props...\n');
  
  try {
    const params = new URLSearchParams({
      apiKey: API_KEY,
      regions: 'us',
      markets: 'player_rush_attempts,player_rush_yds,player_receptions,player_reception_yds,player_anytime_td,player_pass_yds,player_pass_tds,player_pass_completions,player_pass_attempts',
      oddsFormat: 'american'
    });

    const response = await fetch(`${API_URL}?${params}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ API Response received');
    console.log(`📊 Event: ${data.away_team} @ ${data.home_team}`);
    console.log(`📅 Game Time: ${new Date(data.commence_time).toLocaleString()}`);
    console.log(`🏢 Bookmakers: ${data.bookmakers?.length || 0}\n`);

    return data;
  } catch (error: any) {
    console.error('❌ Error fetching data from Odds API:', error.message);
    throw error;
  }
}

function parsePlayerProps(apiData: any) {
  const rows: any[] = [];
  const stats = {
    total: 0,
    byMarket: {} as any,
    byPlayer: {} as any
  };

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
    console.log('⚠️  No bookmakers found in API response');
    return { rows, stats };
  }

  bookmakers.forEach((bookmaker: any) => {
    const { key: bookmaker_key, title: bookmaker_title, markets } = bookmaker;

    if (!markets) return;

    markets.forEach((market: any) => {
      const { key: prop_market, outcomes, last_update } = market;

      // Initialize market counter
      if (!stats.byMarket[prop_market]) {
        stats.byMarket[prop_market] = 0;
      }

      if (!outcomes) return;

      outcomes.forEach((outcome: any) => {
        const { name, description, price, point } = outcome;
        
        // name = player name, description = Over/Under/Yes
        const player_name = description || name;
        const bet_type = name; // Over, Under, or player name for anytime TD
        
        // Initialize player counter
        if (!stats.byPlayer[player_name]) {
          stats.byPlayer[player_name] = 0;
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

        stats.total++;
        stats.byMarket[prop_market]++;
        stats.byPlayer[player_name]++;
      });
    });
  });

  return { rows, stats };
}

async function saveToSupabase(props: any[]) {
  console.log('\n💾 Saving to Supabase...\n');
  
  const supabase = getSupabaseClient();
  
  // Clear existing props for this event
  const { error: deleteError } = await supabase
    .from('player_props')
    .delete()
    .eq('event_id', EVENT_ID);

  if (deleteError) {
    console.log('⚠️  No existing props to clear (or error):', deleteError.message);
  } else {
    console.log('✅ Cleared existing props for this event');
  }

  // Insert new props in batches
  const BATCH_SIZE = 100;
  let saved = 0;

  for (let i = 0; i < props.length; i += BATCH_SIZE) {
    const batch = props.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from('player_props')
      .insert(batch);

    if (error) {
      console.error(`❌ Error saving batch ${i / BATCH_SIZE + 1}:`, error);
      throw error;
    }

    saved += batch.length;
    console.log(`   ✅ Saved ${saved}/${props.length} props...`);
  }

  console.log(`\n✅ Successfully saved ${saved} player props to database!`);
}

async function main() {
  console.log('================================================================================');
  console.log('🏈 NFL PLAYER PROPS FETCHER');
  console.log('Game: New York Jets @ New England Patriots');
  console.log('================================================================================\n');

  try {
    // Fetch data from API
    const apiData = await fetchPlayerProps();

    // Parse the data
    const { rows, stats } = parsePlayerProps(apiData);

    console.log('📊 Parsing Results:');
    console.log(`   Total Props: ${stats.total}`);
    console.log(`   Unique Players: ${Object.keys(stats.byPlayer).length}\n`);

    console.log('📈 Props by Market:');
    Object.entries(stats.byMarket).forEach(([market, count]) => {
      console.log(`   ${market}: ${count} props`);
    });

    if (rows.length === 0) {
      console.log('\n⚠️  No props found to save');
      return;
    }

    // Sample data
    console.log('\n📋 Sample Props (first 3):');
    rows.slice(0, 3).forEach((prop: any, i: number) => {
      console.log(`   ${i + 1}. ${prop.player_name} - ${prop.prop_market} ${prop.bet_type} ${prop.line || 'n/a'} (${prop.odds})`);
    });

    // Save to database
    await saveToSupabase(rows);

    console.log('\n================================================================================');
    console.log('✅ COMPLETE! Player props updated successfully');
    console.log('================================================================================\n');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();


