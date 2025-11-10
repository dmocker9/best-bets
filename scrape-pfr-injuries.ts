/**
 * Scrape NFL Week 10 Injury Report from Pro Football Reference
 * and save to Supabase 'injuries' table
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const PFR_INJURIES_URL = 'https://www.pro-football-reference.com/players/injuries.htm';

interface InjuryRecord {
  playerName: string;
  teamAbbr: string;
  position: string;
  gameStatus: string | null;
  injuryComment: string | null;
  practiceStatus: string | null;
  onTrackToPlay: boolean;
}

/**
 * Initialize Supabase client
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Determine if player is on track to play based on practice status
 */
function isOnTrackToPlay(practiceStatus: string | null): boolean {
  if (!practiceStatus) return false;
  
  const status = practiceStatus.toLowerCase();
  
  // On track if they participated (full or limited)
  if (status.includes('full participation')) return true;
  if (status.includes('limited participation')) return true;
  
  // Not on track if they didn't participate
  if (status.includes('did not participate')) return false;
  
  // Default to false if unclear
  return false;
}

/**
 * Scrape injury data from Pro Football Reference
 */
async function scrapeInjuryData(): Promise<InjuryRecord[]> {
  console.log('🔍 Scraping injury data from Pro Football Reference...\n');
  
  try {
    const response = await fetch(PFR_INJURIES_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const injuries: InjuryRecord[] = [];
    
    // Find the injury table
    const table = $('table').first();
    
    if (!table.length) {
      console.log('⚠️  No injury table found on page');
      return injuries;
    }
    
    // Parse each row
    table.find('tbody tr').each((index, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length === 0) return; // Skip header rows
      
      const playerName = $(cells[0]).text().trim();
      const teamAbbr = $(cells[1]).text().trim();
      const position = $(cells[2]).text().trim();
      const gameStatus = $(cells[3]).text().trim() || null;
      const injuryComment = $(cells[4]).text().trim() || null;
      const practiceStatus = $(cells[5]).text().trim() || null;
      
      if (!playerName || !teamAbbr) return; // Skip invalid rows
      
      const onTrackToPlay = isOnTrackToPlay(practiceStatus);
      
      injuries.push({
        playerName,
        teamAbbr,
        position,
        gameStatus,
        injuryComment,
        practiceStatus,
        onTrackToPlay,
      });
    });
    
    console.log(`✅ Found ${injuries.length} injury records\n`);
    return injuries;
    
  } catch (error) {
    console.error('❌ Error scraping injury data:', error);
    throw error;
  }
}

/**
 * Save injuries to Supabase
 */
async function saveToSupabase(supabase: any, injuries: InjuryRecord[]): Promise<void> {
  console.log('💾 Saving injury data to Supabase...\n');
  
  // Clear existing data for Week 10, 2025
  const { error: deleteError } = await supabase
    .from('injuries')
    .delete()
    .eq('week_number', 10)
    .eq('season', 2025);
  
  if (deleteError) {
    console.log('   ⚠️  Warning: Could not clear existing data:', deleteError.message);
  } else {
    console.log('   ✅ Cleared existing Week 10 injury data');
  }
  
  let savedCount = 0;
  let errorCount = 0;
  
  // Insert all injuries
  for (const injury of injuries) {
    const record = {
      player_name: injury.playerName,
      team_abbr: injury.teamAbbr,
      position: injury.position,
      game_status: injury.gameStatus,
      injury_comment: injury.injuryComment,
      practice_status: injury.practiceStatus,
      on_track_to_play: injury.onTrackToPlay,
      week_number: 10,
      season: 2025,
    };
    
    const { error } = await supabase
      .from('injuries')
      .insert(record);
    
    if (error) {
      if (!error.message.includes('duplicate key')) {
        console.log(`   ❌ Error saving ${injury.playerName}:`, error.message);
        errorCount++;
      }
    } else {
      savedCount++;
    }
  }
  
  console.log(`\n✅ Saved ${savedCount} injury records to Supabase`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} errors occurred`);
  }
}

/**
 * Display summary statistics
 */
function displaySummary(injuries: InjuryRecord[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 INJURY SUMMARY');
  console.log('='.repeat(80));
  
  const totalInjuries = injuries.length;
  const outPlayers = injuries.filter(i => i.gameStatus?.toLowerCase() === 'out').length;
  const questionable = injuries.filter(i => i.gameStatus?.toLowerCase() === 'questionable').length;
  const doubtful = injuries.filter(i => i.gameStatus?.toLowerCase() === 'doubtful').length;
  const onTrack = injuries.filter(i => i.onTrackToPlay).length;
  const notOnTrack = injuries.filter(i => !i.onTrackToPlay).length;
  
  console.log(`\nTotal Injuries: ${totalInjuries}`);
  console.log(`\nGame Status Breakdown:`);
  console.log(`  • Out: ${outPlayers}`);
  console.log(`  • Questionable: ${questionable}`);
  console.log(`  • Doubtful: ${doubtful}`);
  console.log(`\nPractice Participation:`);
  console.log(`  • On Track to Play (Y): ${onTrack} (${((onTrack/totalInjuries)*100).toFixed(1)}%)`);
  console.log(`  • Not On Track (N): ${notOnTrack} (${((notOnTrack/totalInjuries)*100).toFixed(1)}%)`);
  
  // Show some examples
  console.log(`\n🚨 Players RULED OUT:`);
  injuries
    .filter(i => i.gameStatus?.toLowerCase() === 'out')
    .slice(0, 10)
    .forEach(i => {
      const trackStatus = i.onTrackToPlay ? '✅ Y' : '❌ N';
      console.log(`   ${trackStatus} ${i.playerName.padEnd(25)} ${i.position.padEnd(4)} (${i.teamAbbr}) - ${i.injuryComment}`);
    });
  
  console.log(`\n⚠️  QUESTIONABLE Players On Track to Play:`);
  injuries
    .filter(i => i.gameStatus?.toLowerCase() === 'questionable' && i.onTrackToPlay)
    .slice(0, 10)
    .forEach(i => {
      console.log(`   ✅ ${i.playerName.padEnd(25)} ${i.position.padEnd(4)} (${i.teamAbbr}) - ${i.injuryComment}`);
    });
}

/**
 * Main execution
 */
async function main() {
  console.log('🏈 Pro Football Reference Injury Report Scraper (Week 10)');
  console.log('='.repeat(80));
  console.log('Source: https://www.pro-football-reference.com/players/injuries.htm\n');

  try {
    // Initialize Supabase
    const supabase = getSupabaseClient();
    console.log('✅ Connected to Supabase\n');

    // Scrape injury data
    const injuries = await scrapeInjuryData();
    
    if (injuries.length === 0) {
      console.log('⚠️  No injury data found. Exiting.');
      return;
    }

    // Save to Supabase
    await saveToSupabase(supabase, injuries);
    
    // Display summary
    displaySummary(injuries);

    console.log('\n✅ Injury data scrape and save complete!\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();

