/**
 * Scrape 2025 NFL Passing Stats from Pro Football Reference
 * Populates: player_passing_stats table
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const URL = 'https://www.pro-football-reference.com/years/2025/passing.htm';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

function parseNumber(str: string): number | null {
  if (!str || str === '') return null;
  const num = parseFloat(str.replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

function parseInt_(str: string): number | null {
  if (!str || str === '') return null;
  const num = parseInt(str.replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

async function scrapePassingStats() {
  console.log('🏈 Scraping 2025 NFL Passing Stats from Pro Football Reference...\n');
  
  try {
    const response = await fetch(URL);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const records: any[] = [];
    
    // Find the passing table
    $('table#passing tbody tr').each((i, row) => {
      const $row = $(row);
      
      // Skip header rows that repeat in the table
      if ($row.hasClass('thead')) return;
      
      // Get player name from the name_display column
      const playerCell = $row.find('td[data-stat="name_display"]');
      if (playerCell.length === 0) return;
      
      const playerName = playerCell.find('a').text().trim();
      if (!playerName) return;
      
      const record = {
        rank: parseInt_($row.find('th[data-stat="ranker"]').text()),
        player_name: playerName,
        age: parseInt_($row.find('td[data-stat="age"]').text()),
        team_abbr: $row.find('td[data-stat="team_name_abbr"]').find('a').text().trim() || null,
        position: $row.find('td[data-stat="pos"]').text().trim() || null,
        
        // Games
        games_played: parseInt_($row.find('td[data-stat="games"]').text()),
        games_started: parseInt_($row.find('td[data-stat="games_started"]').text()),
        qb_record: $row.find('td[data-stat="qb_rec"]').text().trim() || null,
        
        // Basic Passing
        completions: parseInt_($row.find('td[data-stat="pass_cmp"]').text()),
        attempts: parseInt_($row.find('td[data-stat="pass_att"]').text()),
        completion_pct: parseNumber($row.find('td[data-stat="pass_cmp_perc"]').text()),
        passing_yards: parseInt_($row.find('td[data-stat="pass_yds"]').text()),
        passing_tds: parseInt_($row.find('td[data-stat="pass_td"]').text()),
        td_pct: parseNumber($row.find('td[data-stat="pass_td_perc"]').text()),
        interceptions: parseInt_($row.find('td[data-stat="pass_int"]').text()),
        int_pct: parseNumber($row.find('td[data-stat="pass_int_perc"]').text()),
        
        // Advanced
        first_downs: parseInt_($row.find('td[data-stat="pass_first_down"]').text()),
        success_rate: parseNumber($row.find('td[data-stat="pass_success_perc"]').text()),
        longest_pass: parseInt_($row.find('td[data-stat="pass_long"]').text()),
        yards_per_attempt: parseNumber($row.find('td[data-stat="pass_yds_per_att"]').text()),
        adjusted_yards_per_attempt: parseNumber($row.find('td[data-stat="pass_adj_yds_per_att"]').text()),
        yards_per_completion: parseNumber($row.find('td[data-stat="pass_yds_per_cmp"]').text()),
        yards_per_game: parseNumber($row.find('td[data-stat="pass_yds_per_g"]').text()),
        passer_rating: parseNumber($row.find('td[data-stat="pass_rating"]').text()),
        qbr: parseNumber($row.find('td[data-stat="qbr"]').text()),
        
        // Sacks
        sacks: parseInt_($row.find('td[data-stat="pass_sacked"]').text()),
        sack_yards: parseInt_($row.find('td[data-stat="pass_sacked_yds"]').text()),
        sack_pct: parseNumber($row.find('td[data-stat="pass_sacked_perc"]').text()),
        
        // Net Efficiency
        net_yards_per_attempt: parseNumber($row.find('td[data-stat="pass_net_yds_per_att"]').text()),
        adjusted_net_yards_per_attempt: parseNumber($row.find('td[data-stat="pass_adj_net_yds_per_att"]').text()),
        
        // Clutch
        fourth_quarter_comebacks: parseInt_($row.find('td[data-stat="comebacks"]').text()),
        game_winning_drives: parseInt_($row.find('td[data-stat="gwd"]').text()),
        
        season: 2025
      };
      
      records.push(record);
    });
    
    console.log(`✅ Parsed ${records.length} player passing records\n`);
    return records;
    
  } catch (error) {
    console.error('❌ Error scraping passing stats:', error);
    return [];
  }
}

async function saveToSupabase(records: any[]) {
  console.log('💾 Saving to Supabase...\n');
  
  const supabase = getSupabaseClient();
  
  if (records.length === 0) {
    console.log('⚠️  No records to save');
    return;
  }
  
  // Upsert all records
  const { error } = await supabase
    .from('player_passing_stats')
    .upsert(records, { onConflict: 'player_name,team_abbr,season' });
  
  if (error) {
    console.error('❌ Error saving to database:', error);
    throw error;
  }
  
  console.log(`✅ Saved ${records.length} passing stat records\n`);
}

async function main() {
  console.log('================================================================================');
  console.log('🏈 NFL 2025 PASSING STATS SCRAPER');
  console.log('Source: Pro Football Reference');
  console.log('================================================================================\n');
  
  try {
    // Scrape data
    const records = await scrapePassingStats();
    
    if (records.length === 0) {
      console.log('❌ No data scraped. Exiting.');
      return;
    }
    
    // Show sample
    console.log('📋 Sample Records (top 5 by yards):');
    records.slice(0, 5).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.player_name} (${r.team_abbr}): ${r.passing_yards} yds, ${r.passing_tds} TDs, ${r.passer_rating} rating`);
    });
    console.log('');
    
    // Save to database
    await saveToSupabase(records);
    
    console.log('================================================================================');
    console.log('✅ COMPLETE! Passing stats updated successfully');
    console.log('================================================================================\n');
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();

