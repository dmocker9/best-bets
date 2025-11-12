/**
 * Scrape NFL Snap Counts from Pro Football Reference
 * Fetches offensive, defensive, and special teams snap counts for all 32 teams
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// PFR uses lowercase 3-letter team abbreviations
const NFL_TEAMS_PFR = {
  'ARI': 'crd', // Arizona Cardinals
  'ATL': 'atl', // Atlanta Falcons
  'BAL': 'rav', // Baltimore Ravens
  'BUF': 'buf', // Buffalo Bills
  'CAR': 'car', // Carolina Panthers
  'CHI': 'chi', // Chicago Bears
  'CIN': 'cin', // Cincinnati Bengals
  'CLE': 'cle', // Cleveland Browns
  'DAL': 'dal', // Dallas Cowboys
  'DEN': 'den', // Denver Broncos
  'DET': 'det', // Detroit Lions
  'GNB': 'gnb', // Green Bay Packers
  'HOU': 'htx', // Houston Texans
  'IND': 'clt', // Indianapolis Colts
  'JAX': 'jax', // Jacksonville Jaguars
  'KAN': 'kan', // Kansas City Chiefs
  'LVR': 'rai', // Las Vegas Raiders
  'LAC': 'sdg', // Los Angeles Chargers
  'LAR': 'ram', // Los Angeles Rams
  'MIA': 'mia', // Miami Dolphins
  'MIN': 'min', // Minnesota Vikings
  'NWE': 'nwe', // New England Patriots
  'NOR': 'nor', // New Orleans Saints
  'NYG': 'nyg', // New York Giants
  'NYJ': 'nyj', // New York Jets
  'PHI': 'phi', // Philadelphia Eagles
  'PIT': 'pit', // Pittsburgh Steelers
  'SFO': 'sfo', // San Francisco 49ers
  'SEA': 'sea', // Seattle Seahawks
  'TAM': 'tam', // Tampa Bay Buccaneers
  'TEN': 'oti', // Tennessee Titans
  'WAS': 'was', // Washington Commanders
};

interface SnapCountRecord {
  playerName: string;
  teamAbbr: string;
  position: string;
  offensiveSnaps: number;
  offensiveSnapPct: number;
  defensiveSnaps: number;
  defensiveSnapPct: number;
  specialTeamsSnaps: number;
  specialTeamsSnapPct: number;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

function parsePercentage(pctString: string): number {
  // Convert "97.50%" to 97.50
  const cleaned = pctString.replace('%', '').trim();
  return parseFloat(cleaned) || 0;
}

function parseNumber(numString: string): number {
  const cleaned = numString.replace(/,/g, '').trim();
  return parseInt(cleaned, 10) || 0;
}

async function scrapeTeamSnapCounts(teamAbbr: string, pfrCode: string): Promise<SnapCountRecord[]> {
  const url = `https://www.pro-football-reference.com/teams/${pfrCode}/2025-snap-counts.htm`;
  
  try {
    console.log(`   🔍 Scraping ${teamAbbr}...`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`      ⚠️  Failed to fetch (${response.status})`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const snapCounts: SnapCountRecord[] = [];
    
    // Find the snap counts table
    const table = $('table#snap_counts, table.stats_table').first();
    
    if (!table.length) {
      console.log(`      ⚠️  No snap counts table found`);
      return [];
    }
    
    // Parse each row
    table.find('tbody tr').each((index, row) => {
      const $row = $(row);
      
      // Skip header rows
      if ($row.hasClass('thead')) return;
      
      const cells = $row.find('td, th');
      if (cells.length < 7) return;
      
      // Extract player name from first cell (usually <th>)
      const playerCell = $row.find('th').first();
      const playerName = playerCell.text().trim();
      
      if (!playerName) return;
      
      // Get all td cells (columns after player name)
      const tdCells = $row.find('td');
      
      if (tdCells.length < 7) return; // Need at least 7 columns (pos, off_num, off_pct, def_num, def_pct, st_num, st_pct)
      
      // Column order: [0]=Pos, [1]=Off Num, [2]=Off Pct, [3]=Def Num, [4]=Def Pct, [5]=ST Num, [6]=ST Pct
      const position = $(tdCells[0]).text().trim();
      const offensiveSnaps = parseNumber($(tdCells[1]).text());
      const offensiveSnapPct = parsePercentage($(tdCells[2]).text());
      const defensiveSnaps = parseNumber($(tdCells[3]).text());
      const defensiveSnapPct = parsePercentage($(tdCells[4]).text());
      const specialTeamsSnaps = parseNumber($(tdCells[5]).text());
      const specialTeamsSnapPct = parsePercentage($(tdCells[6]).text());
      
      snapCounts.push({
        playerName,
        teamAbbr,
        position,
        offensiveSnaps,
        offensiveSnapPct,
        defensiveSnaps,
        defensiveSnapPct,
        specialTeamsSnaps,
        specialTeamsSnapPct,
      });
    });
    
    console.log(`      ✅ Found ${snapCounts.length} players`);
    return snapCounts;
    
  } catch (error) {
    console.log(`      ❌ Error: ${error}`);
    return [];
  }
}

async function saveToSupabase(
  supabase: any,
  allSnapCounts: SnapCountRecord[],
  weekNumber: number,
  season: number
): Promise<void> {
  console.log('\n💾 Saving to Supabase...\n');
  
  // Clear existing data for this week/season
  const { error: deleteError } = await supabase
    .from('snap_counts')
    .delete()
    .eq('week_number', weekNumber)
    .eq('season', season);
  
  if (deleteError && !deleteError.message.includes('no rows')) {
    console.log('   ⚠️  Warning clearing data:', deleteError.message);
  } else {
    console.log(`   ✅ Cleared existing Week ${weekNumber} data\n`);
  }
  
  let savedCount = 0;
  let errorCount = 0;
  
  for (const snap of allSnapCounts) {
    const record = {
      player_name: snap.playerName,
      team_abbr: snap.teamAbbr,
      position: snap.position,
      offensive_snaps: snap.offensiveSnaps,
      offensive_snap_pct: snap.offensiveSnapPct,
      defensive_snaps: snap.defensiveSnaps,
      defensive_snap_pct: snap.defensiveSnapPct,
      special_teams_snaps: snap.specialTeamsSnaps,
      special_teams_snap_pct: snap.specialTeamsSnapPct,
      week_number: weekNumber,
      season: season,
    };
    
    const { error } = await supabase
      .from('snap_counts')
      .insert(record);
    
    if (error) {
      if (!error.message.includes('duplicate')) {
        errorCount++;
        if (errorCount <= 3) {
          console.log(`   ⚠️  Error saving ${snap.playerName}:`, error.message);
        }
      }
    } else {
      savedCount++;
      if (savedCount % 100 === 0) {
        console.log(`   ✅ Saved ${savedCount} records...`);
      }
    }
  }
  
  console.log(`\n✅ Saved ${savedCount} snap count records total`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} errors occurred`);
  }
}

function displaySummary(allSnapCounts: SnapCountRecord[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 SNAP COUNTS SUMMARY');
  console.log('='.repeat(80));
  
  const totalPlayers = allSnapCounts.length;
  const teams = new Set(allSnapCounts.map(s => s.teamAbbr)).size;
  
  // Top offensive players by snap count
  const topOffensive = allSnapCounts
    .filter(s => s.offensiveSnaps > 0)
    .sort((a, b) => b.offensiveSnaps - a.offensiveSnaps)
    .slice(0, 10);
  
  // Top defensive players by snap count
  const topDefensive = allSnapCounts
    .filter(s => s.defensiveSnaps > 0)
    .sort((a, b) => b.defensiveSnaps - a.defensiveSnaps)
    .slice(0, 10);
  
  console.log(`\n📈 Total Players: ${totalPlayers}`);
  console.log(`📈 Teams: ${teams}`);
  
  console.log(`\n⚡ Top 10 Offensive Snap Leaders:`);
  topOffensive.forEach((s, i) => {
    console.log(`   ${(i + 1).toString().padStart(2)}. ${s.playerName.padEnd(25)} ${s.position.padEnd(4)} (${s.teamAbbr}) - ${s.offensiveSnaps} snaps (${s.offensiveSnapPct.toFixed(1)}%)`);
  });
  
  console.log(`\n🛡️  Top 10 Defensive Snap Leaders:`);
  topDefensive.forEach((s, i) => {
    console.log(`   ${(i + 1).toString().padStart(2)}. ${s.playerName.padEnd(25)} ${s.position.padEnd(4)} (${s.teamAbbr}) - ${s.defensiveSnaps} snaps (${s.defensiveSnapPct.toFixed(1)}%)`);
  });
  
  // Position breakdown
  const positionCounts = new Map<string, number>();
  allSnapCounts.forEach(s => {
    positionCounts.set(s.position, (positionCounts.get(s.position) || 0) + 1);
  });
  
  const topPositions = Array.from(positionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  console.log(`\n📋 Players by Position (Top 10):`);
  topPositions.forEach(([pos, count]) => {
    console.log(`   ${pos}: ${count} players`);
  });
}

async function main() {
  console.log('🏈 NFL Snap Counts Scraper - Pro Football Reference');
  console.log('='.repeat(80));
  console.log('Fetching snap counts for all 32 NFL teams...\n');
  
  // Get week number from command line (default to 10)
  const weekArg = process.argv[2];
  const weekNumber = weekArg ? parseInt(weekArg, 10) : 10;
  const season = 2025;
  
  if (weekNumber < 1 || weekNumber > 18) {
    console.error('❌ Error: Week number must be between 1 and 18');
    console.log('Usage: npx tsx scrape-snap-counts.ts [week_number]');
    process.exit(1);
  }
  
  console.log(`📅 Week ${weekNumber}, ${season} Season\n`);

  try {
    const supabase = getSupabaseClient();
    console.log('✅ Connected to Supabase\n');
    
    const allSnapCounts: SnapCountRecord[] = [];
    
    // Scrape all teams
    for (const [teamAbbr, pfrCode] of Object.entries(NFL_TEAMS_PFR)) {
      let teamData = await scrapeTeamSnapCounts(teamAbbr, pfrCode);
      
      // Retry once if we got no data (could be rate limited)
      if (teamData.length === 0) {
        console.log(`      🔄 Retrying ${teamAbbr} in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        teamData = await scrapeTeamSnapCounts(teamAbbr, pfrCode);
      }
      
      allSnapCounts.push(...teamData);
      
      // Longer delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (allSnapCounts.length === 0) {
      console.log('\n⚠️  No snap count data found');
      return;
    }
    
    await saveToSupabase(supabase, allSnapCounts, weekNumber, season);
    displaySummary(allSnapCounts);
    
    console.log('\n✅ Snap counts successfully scraped and saved!\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

