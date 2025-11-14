/**
 * Scrape Current NFL Injury Report from Pro Football Reference
 * Improved parsing to handle current website structure
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
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Removed isOnTrackToPlay function - players are only considered "out" if game_status = 'Out'

async function scrapeInjuryData(): Promise<InjuryRecord[]> {
  console.log('🔍 Scraping injury data from Pro Football Reference...\n');
  
  try {
    const response = await fetch(PFR_INJURIES_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const injuries: InjuryRecord[] = [];
    
    // Find the injury table - try different selectors
    let table = $('#injuries');
    if (!table.length) {
      table = $('table.stats_table').first();
    }
    if (!table.length) {
      table = $('table').first();
    }
    
    if (!table.length) {
      console.log('⚠️  No injury table found');
      return injuries;
    }
    
    console.log('✅ Found injury table, parsing data...\n');
    
    // First, let's determine the column headers
    const headers: string[] = [];
    table.find('thead tr th').each((i, el) => {
      const headerText = $(el).text().trim();
      headers.push(headerText);
    });
    
    console.log('📋 Column headers:', headers.join(' | '));
    console.log('');
    
    // Parse each row in tbody
    let rowCount = 0;
    let validRows = 0;
    
    table.find('tbody tr').each((index, row) => {
      const $row = $(row);
      
      // Skip header rows within tbody
      if ($row.hasClass('thead')) return;
      
      const cells = $row.find('td, th');
      
      if (cells.length < 3) return; // Need at least 3 columns
      
      rowCount++;
      
      // Try to extract data - the structure varies
      // Common patterns:
      // [Player, Tm, Pos, Status, Injury, Practice Status]
      // or [Tm, Pos, Player, Status, Injury, Practice Status]
      
      let playerName = '';
      let teamAbbr = '';
      let position = '';
      let gameStatus = '';
      let injuryComment = '';
      let practiceStatus = '';
      
      // PFR uses simple column order without data-stat attributes
      // Column order: Player (th), Tm, Pos, Status, Injury Comment, Practice Status
      
      // Column 0: Player name (often in <th> tag)
      const playerCell = $row.find('th').first();
      if (playerCell.length) {
        playerName = playerCell.text().trim();
      } else if (cells.length >= 1) {
        playerName = $(cells[0]).text().trim();
      }
      
      // Column 1: Team (first <td>)
      const tdCells = $row.find('td');
      if (tdCells.length >= 1) {
        teamAbbr = $(tdCells[0]).text().trim();
      }
      
      // Column 2: Position
      if (tdCells.length >= 2) {
        position = $(tdCells[1]).text().trim();
      }
      
      // Column 3: Game Status
      if (tdCells.length >= 3) {
        gameStatus = $(tdCells[2]).text().trim();
      }
      
      // Column 4: Injury Comment
      if (tdCells.length >= 4) {
        injuryComment = $(tdCells[3]).text().trim();
      }
      
      // Column 5: Practice Status
      if (tdCells.length >= 5) {
        practiceStatus = $(tdCells[4]).text().trim();
      }
      
      // Validate we have minimum required data
      if (!playerName || !teamAbbr || !position) {
        if (rowCount <= 5) {
          console.log(`   ⚠️  Row ${rowCount}: Missing data - Player: "${playerName}", Team: "${teamAbbr}", Pos: "${position}"`);
        }
        return;
      }
      
      validRows++;
      
      injuries.push({
        playerName,
        teamAbbr,
        position,
        gameStatus: gameStatus || null,
        injuryComment: injuryComment || null,
        practiceStatus: practiceStatus || null,
      });
    });
    
    console.log(`✅ Successfully parsed ${injuries.length} injury records from ${rowCount} rows\n`);
    
    // Show sample of parsed data
    if (injuries.length > 0) {
      console.log('📄 Sample of parsed data (first 3 records):');
      injuries.slice(0, 3).forEach((inj, i) => {
        console.log(`   ${i + 1}. ${inj.playerName} (${inj.teamAbbr} ${inj.position}) - ${inj.injuryComment || 'N/A'}`);
      });
      console.log('');
    }
    
    return injuries;
    
  } catch (error) {
    console.error('❌ Error scraping:', error);
    throw error;
  }
}

async function saveToSupabase(supabase: any, injuries: InjuryRecord[], weekNumber?: number): Promise<void> {
  console.log('💾 Saving to Supabase...\n');
  
  // Use provided week number or try to calculate from date
  let currentWeek: number;
  
  if (weekNumber) {
    currentWeek = weekNumber;
  } else {
    // Calculate week from date (NFL 2024 season: Sept 5, 2024 = Week 1)
    const now = new Date();
    const seasonStart = new Date(2024, 8, 5); // Month is 0-indexed (8 = September)
    const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    currentWeek = Math.min(Math.max(weeksSinceStart + 1, 1), 18);
  }
  
  console.log(`   ℹ️  NFL Week: ${currentWeek}`);
  console.log(`   ℹ️  Season: 2025\n`);
  
  // Clear existing data for current week
  const { error: deleteError } = await supabase
    .from('injuries')
    .delete()
    .eq('week_number', currentWeek)
    .eq('season', 2025);
  
  if (deleteError && !deleteError.message.includes('no rows')) {
    console.log('   ⚠️  Warning clearing data:', deleteError.message);
  } else {
    console.log(`   ✅ Cleared existing week ${currentWeek} data\n`);
  }
  
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
      week_number: currentWeek,
      season: 2025,
    };
    
    const { error } = await supabase
      .from('injuries')
      .insert(record);
    
    if (error) {
      if (!error.message.includes('duplicate')) {
        errorCount++;
        if (errorCount <= 3) {
          console.log(`   ⚠️  Error saving ${injury.playerName}:`, error.message);
        }
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
    console.log(`⚠️  ${errorCount} errors occurred`);
  }
}

function displaySummary(injuries: InjuryRecord[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 INJURY REPORT SUMMARY');
  console.log('='.repeat(80));
  
  const outPlayers = injuries.filter(i => i.gameStatus?.toLowerCase() === 'out');
  const questionable = injuries.filter(i => i.gameStatus?.toLowerCase() === 'questionable');
  const doubtful = injuries.filter(i => i.gameStatus?.toLowerCase() === 'doubtful');
  
  // Count by team
  const teamCounts = new Map<string, number>();
  injuries.forEach(i => {
    teamCounts.set(i.teamAbbr, (teamCounts.get(i.teamAbbr) || 0) + 1);
  });
  
  console.log(`\n📈 Total Injured Players: ${injuries.length}`);
  console.log(`📈 Teams Affected: ${teamCounts.size}`);
  
  console.log(`\n📋 Game Status:`);
  console.log(`  • OUT: ${outPlayers.length}`);
  console.log(`  • Questionable: ${questionable.length}`);
  console.log(`  • Doubtful: ${doubtful.length}`);
  console.log(`  • No designation: ${injuries.length - outPlayers.length - questionable.length - doubtful.length}`);
  
  if (outPlayers.length > 0) {
    console.log(`\n🚨 RULED OUT (showing first 15):`);
    outPlayers
      .slice(0, 15)
      .forEach(i => {
        console.log(`   ❌ ${i.playerName.padEnd(25)} ${i.position.padEnd(4)} (${i.teamAbbr}) - ${i.injuryComment || 'N/A'}`);
      });
  }
  
  if (questionable.length > 0) {
    console.log(`\n❓ QUESTIONABLE (showing first 10):`);
    questionable
      .slice(0, 10)
      .forEach(i => {
        console.log(`   ❓ ${i.playerName.padEnd(25)} ${i.position.padEnd(4)} (${i.teamAbbr}) - ${i.injuryComment || 'N/A'}`);
      });
  }
  
  // Show teams with most injuries
  const sortedTeams = Array.from(teamCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  console.log(`\n🏈 Teams with Most Injuries (Top 10):`);
  sortedTeams.forEach(([team, count]) => {
    console.log(`   ${team}: ${count} players`);
  });
}

async function main() {
  console.log('🏈 Pro Football Reference Injury Scraper - CURRENT');
  console.log('='.repeat(80));
  console.log('Source: https://www.pro-football-reference.com/players/injuries.htm\n');

  // Get week number from command line argument (optional)
  const weekArg = process.argv[2];
  const weekNumber = weekArg ? parseInt(weekArg, 10) : undefined;
  
  if (weekNumber && (weekNumber < 1 || weekNumber > 18)) {
    console.error('❌ Error: Week number must be between 1 and 18');
    console.log('Usage: npx tsx scrape-pfr-injuries-current.ts [week_number]');
    console.log('Example: npx tsx scrape-pfr-injuries-current.ts 10');
    process.exit(1);
  }

  try {
    const supabase = getSupabaseClient();
    console.log('✅ Connected to Supabase\n');

    const injuries = await scrapeInjuryData();
    
    if (injuries.length === 0) {
      console.log('⚠️  No injury data found. The website structure may have changed.');
      console.log('Please check the URL manually and update the scraper if needed.');
      return;
    }

    await saveToSupabase(supabase, injuries, weekNumber);
    displaySummary(injuries);

    console.log('\n✅ Injury data successfully updated!\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

