/**
 * CORRECTED Pro Football Reference Injury Scraper
 * Properly extracts player names from the first column
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PFR_URL = 'https://www.pro-football-reference.com/players/injuries.htm';

interface InjuryRecord {
  playerName: string;
  teamAbbr: string;
  position: string;
  gameStatus: string | null;
  injuryComment: string | null;
  practiceStatus: string | null;
  onTrackToPlay: boolean;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

function isOnTrackToPlay(practiceStatus: string | null): boolean {
  if (!practiceStatus) return false;
  const status = practiceStatus.toLowerCase();
  return status.includes('full participation') || status.includes('limited participation');
}

async function scrapeInjuryData(): Promise<InjuryRecord[]> {
  console.log('🔍 Scraping Pro Football Reference...\n');
  
  try {
    const response = await fetch(PFR_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const injuries: InjuryRecord[] = [];
    
    // Find the table
    const table = $('table').first();
    
    // Parse each tbody row
    table.find('tbody tr').each((index, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length < 3) return; // Skip if not enough columns
      
      // CORRECT PARSING:
      // Column 0: Player name (inside <a> tag)
      // Column 1: Team abbreviation
      // Column 2: Position
      // Column 3: Game Status
      // Column 4: Injury Comment
      // Column 5: Practice Status
      
      // Extract player name from the link in first column
      const playerName = $(cells[0]).find('a').text().trim() || $(cells[0]).text().trim();
      const teamAbbr = $(cells[1]).text().trim();
      const position = $(cells[2]).text().trim();
      const gameStatus = $(cells[3]).text().trim() || null;
      const injuryComment = $(cells[4]).text().trim() || null;
      const practiceStatus = cells.length > 5 ? $(cells[5]).text().trim() || null : null;
      
      // Validate we have the key fields
      if (!playerName || playerName.length < 2) {
        console.log(`   ⚠️  Skipping row - no player name found`);
        return;
      }
      
      if (!teamAbbr || teamAbbr.length !== 3) {
        console.log(`   ⚠️  Skipping ${playerName} - invalid team: ${teamAbbr}`);
        return;
      }
      
      if (!position) {
        console.log(`   ⚠️  Skipping ${playerName} - no position`);
        return;
      }
      
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
      
      // Log first few for verification
      if (injuries.length <= 5) {
        console.log(`   ✅ ${playerName.padEnd(25)} ${position.padEnd(4)} (${teamAbbr})`);
      }
    });
    
    console.log(`\n✅ Parsed ${injuries.length} injury records\n`);
    return injuries;
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

async function saveToSupabase(supabase: any, injuries: InjuryRecord[]): Promise<void> {
  console.log('💾 Saving to Supabase...\n');
  
  // Clear existing Week 10 data
  await supabase
    .from('injuries')
    .delete()
    .eq('week_number', 10)
    .eq('season', 2025);
  
  console.log('   ✅ Cleared old data\n');
  
  let saved = 0;
  let errors = 0;
  
  for (const injury of injuries) {
    const { error } = await supabase
      .from('injuries')
      .insert({
        player_name: injury.playerName,
        team_abbr: injury.teamAbbr,
        position: injury.position,
        game_status: injury.gameStatus,
        injury_comment: injury.injuryComment,
        practice_status: injury.practiceStatus,
        on_track_to_play: injury.onTrackToPlay,
        week_number: 10,
        season: 2025,
      });
    
    if (error) {
      if (!error.message.includes('duplicate')) {
        console.log(`   ❌ Error: ${injury.playerName} - ${error.message}`);
        errors++;
      }
    } else {
      saved++;
      if (saved % 50 === 0) {
        console.log(`   ✅ Saved ${saved}...`);
      }
    }
  }
  
  console.log(`\n✅ Saved ${saved} records (${errors} errors)\n`);
}

function displaySummary(injuries: InjuryRecord[]) {
  console.log('='.repeat(80));
  console.log('📊 WEEK 10 INJURY REPORT SUMMARY');
  console.log('='.repeat(80));
  
  const onTrack = injuries.filter(i => i.onTrackToPlay);
  const notOnTrack = injuries.filter(i => !i.onTrackToPlay);
  const outStatus = injuries.filter(i => i.gameStatus?.toLowerCase() === 'out');
  const questionable = injuries.filter(i => i.gameStatus?.toLowerCase() === 'questionable');
  
  console.log(`\n📋 Total: ${injuries.length} injured players`);
  console.log(`\n🏃 Practice Participation:`);
  console.log(`   ✅ On Track (Y): ${onTrack.length} (${((onTrack.length/injuries.length)*100).toFixed(0)}%)`);
  console.log(`   ❌ Not On Track (N): ${notOnTrack.length} (${((notOnTrack.length/injuries.length)*100).toFixed(0)}%)`);
  
  console.log(`\n📋 Game Status:`);
  console.log(`   OUT: ${outStatus.length}`);
  console.log(`   Questionable: ${questionable.length}`);
  
  console.log(`\n🚨 RULED OUT (Top 10):`);
  outStatus.slice(0, 10).forEach(i => {
    const track = i.onTrackToPlay ? '✅' : '❌';
    console.log(`   ${track} ${i.playerName.padEnd(25)} ${i.position.padEnd(4)} (${i.teamAbbr}) - ${i.injuryComment}`);
  });
  
  console.log(`\n✅ ON TRACK TO PLAY (Top 10):`);
  onTrack.slice(0, 10).forEach(i => {
    const status = i.gameStatus || 'No Status';
    console.log(`   ✅ ${i.playerName.padEnd(25)} ${i.position.padEnd(4)} (${i.teamAbbr}) - ${status}`);
  });
}

async function main() {
  console.log('🏈 Pro Football Reference Injury Scraper - CORRECTED');
  console.log('='.repeat(80));
  console.log('Source: https://www.pro-football-reference.com/players/injuries.htm\n');

  try {
    const supabase = getSupabaseClient();
    console.log('✅ Connected to Supabase\n');

    const injuries = await scrapeInjuryData();
    
    if (injuries.length === 0) {
      console.log('⚠️  No data scraped');
      return;
    }

    await saveToSupabase(supabase, injuries);
    displaySummary(injuries);

    console.log('\n✅ Complete!\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

