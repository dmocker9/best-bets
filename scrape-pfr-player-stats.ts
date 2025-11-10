/**
 * Scrape NFL Player Stats from Pro Football Reference
 * - Rushing Stats (2025)
 * - Receiving Stats (2025)
 * Then combine into total_player_stats ranked by usage
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const RUSHING_URL = 'https://www.pro-football-reference.com/years/2025/rushing.htm';
const RECEIVING_URL = 'https://www.pro-football-reference.com/years/2025/receiving.htm';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Parse number, handling empty strings and special characters
 */
function parseNum(value: string): number | null {
  const cleaned = value.replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse integer
 */
function parseInt2(value: string): number {
  const num = parseInt(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Scrape rushing stats
 */
async function scrapeRushingStats(): Promise<any[]> {
  console.log('🏃 Scraping rushing stats from PFR...\n');
  
  try {
    const response = await fetch(RUSHING_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const stats: any[] = [];
    
    // Find the rushing table
    $('#rushing tbody tr').each((index, row) => {
      const $row = $(row);
      
      // Skip header rows
      if ($row.hasClass('thead')) return;
      
      const cells = $row.find('td, th');
      if (cells.length < 10) return;
      
      const rk = parseInt2($(cells[0]).text());
      const playerName = $(cells[1]).find('a').text().trim() || $(cells[1]).text().trim();
      const age = parseInt2($(cells[2]).text());
      const teamAbbr = $(cells[3]).text().trim();
      const position = $(cells[4]).text().trim();
      const gamesPlayed = parseInt2($(cells[5]).text());
      const gamesStarted = parseInt2($(cells[6]).text());
      const attempts = parseInt2($(cells[7]).text());
      const yards = parseInt2($(cells[8]).text());
      const touchdowns = parseInt2($(cells[9]).text());
      const firstDowns = parseInt2($(cells[10]).text());
      const successRate = parseNum($(cells[11]).text());
      const longest = parseInt2($(cells[12]).text());
      const yardsPerAttempt = parseNum($(cells[13]).text());
      const yardsPerGame = parseNum($(cells[14]).text());
      const attemptsPerGame = parseNum($(cells[15]).text());
      const fumbles = parseInt2($(cells[16]).text());
      
      if (!playerName || attempts === 0) return;
      
      stats.push({
        rk,
        playerName,
        age,
        teamAbbr,
        position,
        gamesPlayed,
        gamesStarted,
        attempts,
        yards,
        touchdowns,
        firstDowns,
        successRate,
        longest,
        yardsPerAttempt,
        yardsPerGame,
        attemptsPerGame,
        fumbles,
      });
      
      if (stats.length <= 5) {
        console.log(`   ✅ ${rk}. ${playerName.padEnd(25)} ${attempts} att, ${yards} yds`);
      }
    });
    
    console.log(`\n✅ Scraped ${stats.length} rushing records\n`);
    return stats;
    
  } catch (error) {
    console.error('❌ Error scraping rushing:', error);
    return [];
  }
}

/**
 * Scrape receiving stats
 */
async function scrapeReceivingStats(): Promise<any[]> {
  console.log('📡 Scraping receiving stats from PFR...\n');
  
  try {
    const response = await fetch(RECEIVING_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const stats: any[] = [];
    
    // Find the receiving table
    $('#receiving tbody tr').each((index, row) => {
      const $row = $(row);
      
      // Skip header rows
      if ($row.hasClass('thead')) return;
      
      const cells = $row.find('td, th');
      if (cells.length < 10) return;
      
      const rk = parseInt2($(cells[0]).text());
      const playerName = $(cells[1]).find('a').text().trim() || $(cells[1]).text().trim();
      const age = parseInt2($(cells[2]).text());
      const teamAbbr = $(cells[3]).text().trim();
      const position = $(cells[4]).text().trim();
      const gamesPlayed = parseInt2($(cells[5]).text());
      const gamesStarted = parseInt2($(cells[6]).text());
      const targets = parseInt2($(cells[7]).text());
      const receptions = parseInt2($(cells[8]).text());
      const yards = parseInt2($(cells[9]).text());
      const yardsPerReception = parseNum($(cells[10]).text());
      const touchdowns = parseInt2($(cells[11]).text());
      const firstDowns = parseInt2($(cells[12]).text());
      const successRate = parseNum($(cells[13]).text());
      const longest = parseInt2($(cells[14]).text());
      const yardsPerTarget = parseNum($(cells[15]).text());
      const receptionsPerGame = parseNum($(cells[16]).text());
      const yardsPerGame = parseNum($(cells[17]).text());
      const catchPct = parseNum($(cells[18]).text());
      const fumbles = parseInt2($(cells[19]).text());
      
      if (!playerName || receptions === 0) return;
      
      stats.push({
        rk,
        playerName,
        age,
        teamAbbr,
        position,
        gamesPlayed,
        gamesStarted,
        targets,
        receptions,
        yards,
        yardsPerReception,
        touchdowns,
        firstDowns,
        successRate,
        longest,
        yardsPerTarget,
        receptionsPerGame,
        yardsPerGame,
        catchPct,
        fumbles,
      });
      
      if (stats.length <= 5) {
        console.log(`   ✅ ${rk}. ${playerName.padEnd(25)} ${receptions} rec, ${yards} yds`);
      }
    });
    
    console.log(`\n✅ Scraped ${stats.length} receiving records\n`);
    return stats;
    
  } catch (error) {
    console.error('❌ Error scraping receiving:', error);
    return [];
  }
}

/**
 * Save rushing stats to Supabase
 */
async function saveRushingStats(supabase: any, stats: any[]): Promise<void> {
  console.log('💾 Saving rushing stats...\n');
  
  await supabase.from('player_rushing_stats').delete().eq('season', 2025);
  console.log('   ✅ Cleared old data\n');
  
  let saved = 0;
  for (const stat of stats) {
    const { error } = await supabase.from('player_rushing_stats').insert({
      rk: stat.rk,
      player_name: stat.playerName,
      age: stat.age,
      team_abbr: stat.teamAbbr,
      position: stat.position,
      games_played: stat.gamesPlayed,
      games_started: stat.gamesStarted,
      rushing_attempts: stat.attempts,
      rushing_yards: stat.yards,
      rushing_touchdowns: stat.touchdowns,
      first_downs: stat.firstDowns,
      success_rate: stat.successRate,
      longest_rush: stat.longest,
      yards_per_attempt: stat.yardsPerAttempt,
      yards_per_game: stat.yardsPerGame,
      attempts_per_game: stat.attemptsPerGame,
      fumbles: stat.fumbles,
      season: 2025,
    });
    
    if (!error) {
      saved++;
      if (saved % 50 === 0) console.log(`   ✅ Saved ${saved}...`);
    }
  }
  
  console.log(`\n✅ Saved ${saved} rushing records\n`);
}

/**
 * Save receiving stats to Supabase
 */
async function saveReceivingStats(supabase: any, stats: any[]): Promise<void> {
  console.log('💾 Saving receiving stats...\n');
  
  await supabase.from('player_receiving_stats').delete().eq('season', 2025);
  console.log('   ✅ Cleared old data\n');
  
  let saved = 0;
  for (const stat of stats) {
    const { error } = await supabase.from('player_receiving_stats').insert({
      rk: stat.rk,
      player_name: stat.playerName,
      age: stat.age,
      team_abbr: stat.teamAbbr,
      position: stat.position,
      games_played: stat.gamesPlayed,
      games_started: stat.gamesStarted,
      targets: stat.targets,
      receptions: stat.receptions,
      receiving_yards: stat.yards,
      yards_per_reception: stat.yardsPerReception,
      receiving_touchdowns: stat.touchdowns,
      first_downs: stat.firstDowns,
      success_rate: stat.successRate,
      longest_reception: stat.longest,
      yards_per_target: stat.yardsPerTarget,
      receptions_per_game: stat.receptionsPerGame,
      yards_per_game: stat.yardsPerGame,
      catch_percentage: stat.catchPct,
      fumbles: stat.fumbles,
      season: 2025,
    });
    
    if (!error) {
      saved++;
      if (saved % 50 === 0) console.log(`   ✅ Saved ${saved}...`);
    }
  }
  
  console.log(`\n✅ Saved ${saved} receiving records\n`);
}

/**
 * Generate combined total_player_stats table
 */
async function generateTotalPlayerStats(supabase: any): Promise<void> {
  console.log('🔄 Generating total_player_stats (ranked by usage)...\n');
  
  // Clear existing data
  await supabase.from('total_player_stats').delete().eq('season', 2025);
  
  // Query to combine rushing and receiving
  const query = `
    WITH rushing_data AS (
      SELECT 
        player_name,
        team_abbr,
        position,
        games_played,
        rushing_attempts,
        rushing_yards,
        rushing_touchdowns
      FROM player_rushing_stats
      WHERE season = 2025
    ),
    receiving_data AS (
      SELECT 
        player_name,
        team_abbr,
        position,
        games_played,
        receptions,
        receiving_yards,
        receiving_touchdowns
      FROM player_receiving_stats
      WHERE season = 2025
    ),
    combined AS (
      SELECT 
        COALESCE(r.player_name, rec.player_name) as player_name,
        COALESCE(r.team_abbr, rec.team_abbr) as team_abbr,
        COALESCE(r.position, rec.position) as position,
        COALESCE(r.games_played, rec.games_played, 0) as games_played,
        COALESCE(r.rushing_attempts, 0) as rushing_attempts,
        COALESCE(rec.receptions, 0) as receptions,
        COALESCE(r.rushing_yards, 0) as rushing_yards,
        COALESCE(rec.receiving_yards, 0) as receiving_yards,
        COALESCE(r.rushing_touchdowns, 0) as rushing_tds,
        COALESCE(rec.receiving_touchdowns, 0) as receiving_tds,
        COALESCE(r.rushing_attempts, 0) + COALESCE(rec.receptions, 0) as total_usage,
        COALESCE(r.rushing_yards, 0) + COALESCE(rec.receiving_yards, 0) as total_yards,
        COALESCE(r.rushing_touchdowns, 0) + COALESCE(rec.receiving_touchdowns, 0) as total_tds
      FROM rushing_data r
      FULL OUTER JOIN receiving_data rec 
        ON r.player_name = rec.player_name 
        AND r.team_abbr = rec.team_abbr
    )
    SELECT * FROM combined
    WHERE total_usage > 0
    ORDER BY total_usage DESC;
  `;
  
  const { data, error } = await supabase.rpc('execute_sql', { query });
  
  if (error) {
    console.log('Using direct query instead...');
    
    // Alternative: Fetch both tables and combine in code
    const { data: rushingData } = await supabase
      .from('player_rushing_stats')
      .select('*')
      .eq('season', 2025);
    
    const { data: receivingData } = await supabase
      .from('player_receiving_stats')
      .select('*')
      .eq('season', 2025);
    
    // Create a map to combine players
    const playerMap = new Map();
    
    // Add rushing data
    if (rushingData) {
      for (const player of rushingData) {
        const key = `${player.player_name}|${player.team_abbr}`;
        playerMap.set(key, {
          playerName: player.player_name,
          teamAbbr: player.team_abbr,
          position: player.position,
          gamesPlayed: player.games_played,
          rushingAttempts: player.rushing_attempts,
          receptions: 0,
          rushingYards: player.rushing_yards,
          receivingYards: 0,
          rushingTds: player.rushing_touchdowns,
          receivingTds: 0,
        });
      }
    }
    
    // Add/merge receiving data
    if (receivingData) {
      for (const player of receivingData) {
        const key = `${player.player_name}|${player.team_abbr}`;
        const existing = playerMap.get(key);
        
        if (existing) {
          existing.receptions = player.receptions;
          existing.receivingYards = player.receiving_yards;
          existing.receivingTds = player.receiving_touchdowns;
        } else {
          playerMap.set(key, {
            playerName: player.player_name,
            teamAbbr: player.team_abbr,
            position: player.position,
            gamesPlayed: player.games_played,
            rushingAttempts: 0,
            receptions: player.receptions,
            rushingYards: 0,
            receivingYards: player.receiving_yards,
            rushingTds: 0,
            receivingTds: player.receiving_touchdowns,
          });
        }
      }
    }
    
    // Convert to array and calculate totals
    const combined = Array.from(playerMap.values()).map(p => ({
      ...p,
      totalUsage: p.rushingAttempts + p.receptions,
      totalYards: p.rushingYards + p.receivingYards,
      totalTds: p.rushingTds + p.receivingTds,
    }));
    
    // Sort by usage
    combined.sort((a, b) => b.totalUsage - a.totalUsage);
    
    // Add usage rank
    combined.forEach((p, idx) => {
      (p as any).usageRank = idx + 1;
    });
    
    // Insert into total_player_stats
    let saved = 0;
    for (const player of combined) {
      const { error: insertError } = await supabase
        .from('total_player_stats')
        .insert({
          player_name: player.playerName,
          team_abbr: player.teamAbbr,
          position: player.position,
          rushing_attempts: player.rushingAttempts,
          receptions: player.receptions,
          total_usage: player.totalUsage,
          usage_rank: player.usageRank,
          rushing_yards: player.rushingYards,
          receiving_yards: player.receivingYards,
          total_yards: player.totalYards,
          rushing_tds: player.rushingTds,
          receiving_tds: player.receivingTds,
          total_tds: player.totalTds,
          games_played: player.gamesPlayed,
          season: 2025,
        });
      
      if (!insertError) {
        saved++;
        if (saved % 50 === 0) console.log(`   ✅ Saved ${saved}...`);
      }
    }
    
    console.log(`\n✅ Generated ${saved} total player records\n`);
  }
}

/**
 * Display summary
 */
async function displaySummary(supabase: any): Promise<void> {
  console.log('='.repeat(80));
  console.log('📊 PLAYER STATS SUMMARY');
  console.log('='.repeat(80));
  
  // Get counts
  const { data: rushingCount } = await supabase
    .from('player_rushing_stats')
    .select('*', { count: 'exact', head: true });
  
  const { data: receivingCount } = await supabase
    .from('player_receiving_stats')
    .select('*', { count: 'exact', head: true });
  
  const { data: totalCount } = await supabase
    .from('total_player_stats')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📋 Records Created:`);
  console.log(`   Rushing Stats: ${rushingCount?.length || 0}`);
  console.log(`   Receiving Stats: ${receivingCount?.length || 0}`);
  console.log(`   Total Combined: ${totalCount?.length || 0}`);
  
  // Get top 10 by usage
  const { data: topUsage } = await supabase
    .from('total_player_stats')
    .select('*')
    .eq('season', 2025)
    .order('total_usage', { ascending: false })
    .limit(10);
  
  if (topUsage && topUsage.length > 0) {
    console.log(`\n🏆 TOP 10 PLAYERS BY USAGE (Rushing Attempts + Receptions):`);
    topUsage.forEach((p: any) => {
      console.log(
        `   ${p.usage_rank.toString().padStart(2)}. ${p.player_name.padEnd(25)} ` +
        `${p.position.padEnd(3)} (${p.team_abbr}) - ${p.total_usage} touches ` +
        `(${p.rushing_attempts} rush + ${p.receptions} rec)`
      );
    });
  }
}

async function main() {
  console.log('🏈 Pro Football Reference Player Stats Scraper (2025)');
  console.log('='.repeat(80));
  console.log('Scraping rushing and receiving stats...\n');

  try {
    const supabase = getSupabaseClient();
    console.log('✅ Connected to Supabase\n');

    // Scrape both stat types
    const rushingStats = await scrapeRushingStats();
    const receivingStats = await scrapeReceivingStats();
    
    if (rushingStats.length === 0 && receivingStats.length === 0) {
      console.log('⚠️  No data scraped');
      return;
    }

    // Save to database
    if (rushingStats.length > 0) {
      await saveRushingStats(supabase, rushingStats);
    }
    
    if (receivingStats.length > 0) {
      await saveReceivingStats(supabase, receivingStats);
    }
    
    // Generate combined table
    await generateTotalPlayerStats(supabase);
    
    // Display summary
    await displaySummary(supabase);

    console.log('\n✅ Complete!\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

