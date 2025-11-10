/**
 * Scrape NFL Week 10 Injury Report from Pro Football Reference
 * FIXED VERSION - Properly parse column order
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';

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

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

function isOnTrackToPlay(practiceStatus: string | null): boolean {
  if (!practiceStatus) return false;
  
  const status = practiceStatus.toLowerCase();
  
  if (status.includes('full participation')) return true;
  if (status.includes('limited participation')) return true;
  if (status.includes('did not participate')) return false;
  
  return false;
}

async function scrapeInjuryData(): Promise<InjuryRecord[]> {
  console.log('🔍 Scraping injury data from Pro Football Reference...\n');
  
  try {
    const response = await fetch(PFR_INJURIES_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const injuries: InjuryRecord[] = [];
    
    // Find the injury table - look for table with id or class
    let table = $('#injuries');
    if (!table.length) {
      table = $('table').first();
    }
    
    if (!table.length) {
      console.log('⚠️  No injury table found');
      return injuries;
    }
    
    // Parse each row in tbody
    table.find('tbody tr').each((index, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length < 5) return; // Need at least 5 columns
      
      // Correct column order based on PFR structure:
      // 0: Player, 1: Tm, 2: Pos, 3: Status, 4: Injury Comment, 5: Practice Status
      
      const playerName = $(cells[0]).text().trim();
      const teamAbbr = $(cells[1]).text().trim();
      const position = $(cells[2]).text().trim();
      const gameStatus = $(cells[3]).text().trim() || null;
      const injuryComment = $(cells[4]).text().trim() || null;
      const practiceStatus = cells.length > 5 ? $(cells[5]).text().trim() || null : null;
      
      if (!playerName || !teamAbbr || !position) {
        console.log(`   ⚠️  Skipping invalid row: ${playerName} | ${teamAbbr} | ${position}`);
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
    });
    
    console.log(`✅ Successfully parsed ${injuries.length} injury records\n`);
    return injuries;
    
  } catch (error) {
    console.error('❌ Error scraping:', error);
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
  
  console.log('   ✅ Cleared existing data\n');
  
  let savedCount = 0;
  let errorCount = 0;
  
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
      if (!error.message.includes('duplicate')) {
        errorCount++;
      }
    } else {
      savedCount++;
      if (savedCount % 50 === 0) {
        console.log(`   ✅ Saved ${savedCount} records...`);
      }
    }
  }
  
  console.log(`\n✅ Saved ${savedCount} injury records total`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} errors`);
  }
}

function displaySummary(injuries: InjuryRecord[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 INJURY REPORT SUMMARY');
  console.log('='.repeat(80));
  
  const outPlayers = injuries.filter(i => i.gameStatus?.toLowerCase() === 'out');
  const questionable = injuries.filter(i => i.gameStatus?.toLowerCase() === 'questionable');
  const doubtful = injuries.filter(i => i.gameStatus?.toLowerCase() === 'doubtful');
  const onTrack = injuries.filter(i => i.onTrackToPlay);
  const notOnTrack = injuries.filter(i => !i.onTrackToPlay);
  
  console.log(`\nTotal Injured Players: ${injuries.length}`);
  console.log(`\n📋 Game Status:`);
  console.log(`  • OUT: ${outPlayers.length}`);
  console.log(`  • Questionable: ${questionable.length}`);
  console.log(`  • Doubtful: ${doubtful.length}`);
  console.log(`  • No designation: ${injuries.length - outPlayers.length - questionable.length - doubtful.length}`);
  
  console.log(`\n🏃 Practice Status:`);
  console.log(`  • On Track to Play ✅ (Y): ${onTrack.length} (${((onTrack.length/injuries.length)*100).toFixed(1)}%)`);
  console.log(`  • Not On Track ❌ (N): ${notOnTrack.length} (${((notOnTrack.length/injuries.length)*100).toFixed(1)}%)`);
  
  console.log(`\n🚨 RULED OUT (Not Practicing):`);
  outPlayers
    .filter(i => !i.onTrackToPlay)
    .slice(0, 10)
    .forEach(i => {
      console.log(`   ❌ ${i.playerName.padEnd(25)} ${i.position.padEnd(4)} (${i.teamAbbr}) - ${i.injuryComment}`);
    });
  
  console.log(`\n✅ ON TRACK (Full/Limited Practice):`);
  injuries
    .filter(i => i.onTrackToPlay)
    .slice(0, 10)
    .forEach(i => {
      const status = i.gameStatus || 'No Status';
      console.log(`   ✅ ${i.playerName.padEnd(25)} ${i.position.padEnd(4)} (${i.teamAbbr}) - ${status}`);
    });
}

async function main() {
  console.log('🏈 Pro Football Reference Injury Scraper (Week 10) - FIXED');
  console.log('='.repeat(80));
  console.log('Source: https://www.pro-football-reference.com/players/injuries.htm\n');

  try {
    const supabase = getSupabaseClient();
    console.log('✅ Connected to Supabase\n');

    const injuries = await scrapeInjuryData();
    
    if (injuries.length === 0) {
      console.log('⚠️  No data found');
      return;
    }

    await saveToSupabase(supabase, injuries);
    displaySummary(injuries);

    console.log('\n✅ Complete!\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

