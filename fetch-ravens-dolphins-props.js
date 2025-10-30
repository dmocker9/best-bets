require('dotenv').config();
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const EVENT_ID = '677dbbb6ad96fc5f5b36bb20b43139dd';
const API_KEY = 'd38b7f712b4ef276d719082f04a4c89e';
const API_URL = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/${EVENT_ID}/odds`;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Prop market labels for better logging
const PROP_MARKET_LABELS = {
  player_rush_attempts: 'Rush Attempts',
  player_rush_yds: 'Rush Yards',
  player_receptions: 'Receptions',
  player_reception_yds: 'Reception Yards',
  player_anytime_td: 'Anytime TD',
  player_pass_yds: 'Pass Yards',
  player_pass_tds: 'Pass TDs'
};

async function fetchPlayerProps() {
  console.log('🏈 Fetching Ravens vs. Dolphins Player Props...\n');
  
  try {
    const params = new URLSearchParams({
      apiKey: API_KEY,
      regions: 'us',
      markets: 'player_rush_attempts,player_rush_yds,player_receptions,player_reception_yds,player_anytime_td,player_pass_yds,player_pass_tds',
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
  } catch (error) {
    console.error('❌ Error fetching data from Odds API:', error.message);
    throw error;
  }
}

function parsePlayerProps(apiData) {
  const rows = [];
  const stats = {
    total: 0,
    byMarket: {},
    byBookmaker: {}
  };

  // Initialize market counters
  Object.keys(PROP_MARKET_LABELS).forEach(market => {
    stats.byMarket[market] = 0;
  });

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
    console.warn('⚠️  No bookmakers found in API response');
    return { rows, stats };
  }

  // Iterate through each bookmaker
  bookmakers.forEach(bookmaker => {
    const { key: bookmaker_key, title: bookmaker_title, markets } = bookmaker;
    
    if (!stats.byBookmaker[bookmaker_key]) {
      stats.byBookmaker[bookmaker_key] = 0;
    }

    if (!markets || markets.length === 0) {
      return;
    }

    // Iterate through each market (prop type)
    markets.forEach(market => {
      const { key: prop_market, last_update, outcomes } = market;

      if (!outcomes || outcomes.length === 0) {
        return;
      }

      // Iterate through each outcome (player + over/under or anytime TD)
      outcomes.forEach(outcome => {
        const { description, name, point, price } = outcome;

        // Validate required fields
        if (!description || !name || price === undefined) {
          console.warn(`⚠️  Skipping incomplete outcome in ${prop_market} for ${bookmaker_title}`);
          return;
        }

        // Create row for insertion
        const row = {
          event_id,
          sport_key,
          sport_title,
          commence_time,
          home_team,
          away_team,
          player_name: description,
          prop_market,
          bookmaker_key,
          bookmaker_title,
          bet_type: name,
          line: point !== undefined ? point : null,
          odds: price,
          last_update: last_update || commence_time
        };

        rows.push(row);
        stats.total++;
        stats.byMarket[prop_market]++;
        stats.byBookmaker[bookmaker_key]++;
      });
    });
  });

  return { rows, stats };
}

async function insertIntoSupabase(rows) {
  console.log(`\n📤 Inserting ${rows.length} rows into Supabase...`);

  try {
    // Batch insert with upsert to handle duplicates
    const { data, error } = await supabase
      .from('player_props')
      .upsert(rows, {
        onConflict: 'event_id,player_name,bookmaker_key,bet_type,line,prop_market',
        ignoreDuplicates: false
      });

    if (error) {
      throw error;
    }

    console.log('✅ Data successfully inserted into Supabase');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error inserting data into Supabase:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    throw error;
  }
}

function logStatistics(stats) {
  console.log('\n📊 STATISTICS');
  console.log('═'.repeat(50));
  console.log(`Total Props Inserted: ${stats.total}\n`);
  
  console.log('By Prop Market:');
  Object.entries(stats.byMarket).forEach(([market, count]) => {
    if (count > 0) {
      console.log(`  ${PROP_MARKET_LABELS[market]}: ${count}`);
    }
  });

  console.log('\nBy Bookmaker:');
  Object.entries(stats.byBookmaker).forEach(([bookmaker, count]) => {
    if (count > 0) {
      console.log(`  ${bookmaker}: ${count}`);
    }
  });
  
  console.log('═'.repeat(50));
}

async function main() {
  const startTime = Date.now();
  
  try {
    // Step 1: Fetch data from Odds API
    const apiData = await fetchPlayerProps();

    // Step 2: Parse and structure the data
    console.log('🔄 Parsing player props data...');
    const { rows, stats } = parsePlayerProps(apiData);

    if (rows.length === 0) {
      console.warn('⚠️  No player props data to insert');
      return;
    }

    console.log(`✅ Parsed ${rows.length} player prop entries`);

    // Step 3: Insert into Supabase
    await insertIntoSupabase(rows);

    // Step 4: Display statistics
    logStatistics(stats);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Script completed successfully in ${duration}s`);
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();

