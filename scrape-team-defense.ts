/**
 * Scrape Team Defense Stats from Pro Football Reference
 * Source: https://www.pro-football-reference.com/years/2025/opp.htm
 */

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TeamDefenseStats {
  team_name: string;
  team_abbr: string;
  games_played: number;
  points_allowed: number;
  total_yards_allowed: number;
  plays_allowed: number;
  yards_per_play: number;
  turnovers_forced: number;
  fumbles_forced: number;
  first_downs_allowed: number;
  // Passing defense
  pass_completions_allowed: number;
  pass_attempts_allowed: number;
  pass_yards_allowed: number;
  pass_tds_allowed: number;
  interceptions: number;
  net_yards_per_attempt: number;
  pass_first_downs_allowed: number;
  // Rushing defense
  rush_attempts_allowed: number;
  rush_yards_allowed: number;
  rush_tds_allowed: number;
  yards_per_rush_attempt: number;
  rush_first_downs_allowed: number;
  // Penalties
  penalties: number;
  penalty_yards: number;
  first_downs_by_penalty: number;
  // Advanced
  expected_points_added_by_defense: number;
  season: number;
  week: number;
}

// Team name to abbreviation mapping
const TEAM_NAME_TO_ABBR: Record<string, string> = {
  'Arizona Cardinals': 'ARI',
  'Atlanta Falcons': 'ATL',
  'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF',
  'Carolina Panthers': 'CAR',
  'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN',
  'Detroit Lions': 'DET',
  'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV',
  'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR',
  'Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE',
  'New Orleans Saints': 'NO',
  'New York Giants': 'NYG',
  'New York Jets': 'NYJ',
  'Philadelphia Eagles': 'PHI',
  'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA',
  'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN',
  'Washington Commanders': 'WSH',
};

function safeParseFloat(value: string | undefined): number {
  if (!value || value === '') return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function safeParseInt(value: string | undefined): number {
  if (!value || value === '') return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

async function scrapeTeamDefenseStats(season: number): Promise<TeamDefenseStats[]> {
  const url = `https://www.pro-football-reference.com/years/${season}/opp.htm`;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Fetching Team Defense Stats from Pro Football Reference`);
  console.log(`URL: ${url}`);
  console.log(`Season: ${season}`);
  console.log(`${'='.repeat(80)}\n`);

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  };

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const defenseStats: TeamDefenseStats[] = [];
  
  // Find the Team Defense table - PFR uses different IDs for defensive stats
  let table = $('#team_stats');
  if (!table.length) {
    table = $('table[id*="defense"]').first();
  }
  if (!table.length) {
    table = $('table').filter((i, el) => {
      const caption = $(el).find('caption').text();
      return caption.includes('Team Defense') || caption.includes('Opposition');
    }).first();
  }
  
  if (!table.length) {
    console.error('❌ Could not find Team Defense table');
    console.log('Available table IDs:', $('table[id]').map((i, el) => $(el).attr('id')).get());
    return [];
  }

  console.log(`✅ Found table with ID: ${table.attr('id')}\n`);

  // Parse each team row
  table.find('tbody tr').each((index, row) => {
    const $row = $(row);
    
    // Skip header rows or empty rows
    if ($row.hasClass('thead') || $row.hasClass('over_header')) {
      return;
    }

    // Get team name from the second column (data-stat="team")
    const teamCell = $row.find('td[data-stat="team"]');
    if (!teamCell.length) {
      return;
    }

    const teamLink = teamCell.find('a');
    const teamName = teamLink.text().trim();
    
    if (!teamName) {
      return;
    }

    const teamAbbr = TEAM_NAME_TO_ABBR[teamName] || teamName.substring(0, 3).toUpperCase();

    // Debug: Log the first team's row to see available data-stat attributes
    if (index === 0) {
      console.log('📊 First row data-stat attributes:');
      $row.find('td').each((i, td) => {
        const dataStat = $(td).attr('data-stat');
        const value = $(td).text().trim();
        if (dataStat && value) {
          console.log(`  ${dataStat}: ${value}`);
        }
      });
      console.log('');
    }

    // Extract all stats using data-stat attributes (actual PFR attributes)
    const stats: TeamDefenseStats = {
      team_name: teamName,
      team_abbr: teamAbbr,
      games_played: safeParseInt($row.find('td[data-stat="g"]').text()),
      points_allowed: safeParseInt($row.find('td[data-stat="points"]').text()),
      total_yards_allowed: safeParseInt($row.find('td[data-stat="total_yards"]').text()),
      plays_allowed: safeParseInt($row.find('td[data-stat="plays_offense"]').text()),
      yards_per_play: safeParseFloat($row.find('td[data-stat="yds_per_play_offense"]').text()),
      turnovers_forced: safeParseInt($row.find('td[data-stat="turnovers"]').text()),
      fumbles_forced: safeParseInt($row.find('td[data-stat="fumbles_lost"]').text()),
      first_downs_allowed: safeParseInt($row.find('td[data-stat="first_down"]').text()),
      // Passing
      pass_completions_allowed: safeParseInt($row.find('td[data-stat="pass_cmp"]').text()),
      pass_attempts_allowed: safeParseInt($row.find('td[data-stat="pass_att"]').text()),
      pass_yards_allowed: safeParseInt($row.find('td[data-stat="pass_yds"]').text()),
      pass_tds_allowed: safeParseInt($row.find('td[data-stat="pass_td"]').text()),
      interceptions: safeParseInt($row.find('td[data-stat="pass_int"]').text()),
      net_yards_per_attempt: safeParseFloat($row.find('td[data-stat="pass_net_yds_per_att"]').text()),
      pass_first_downs_allowed: safeParseInt($row.find('td[data-stat="pass_fd"]').text()),
      // Rushing
      rush_attempts_allowed: safeParseInt($row.find('td[data-stat="rush_att"]').text()),
      rush_yards_allowed: safeParseInt($row.find('td[data-stat="rush_yds"]').text()),
      rush_tds_allowed: safeParseInt($row.find('td[data-stat="rush_td"]').text()),
      yards_per_rush_attempt: safeParseFloat($row.find('td[data-stat="rush_yds_per_att"]').text()),
      rush_first_downs_allowed: safeParseInt($row.find('td[data-stat="rush_fd"]').text()),
      // Penalties
      penalties: safeParseInt($row.find('td[data-stat="penalties"]').text()),
      penalty_yards: safeParseInt($row.find('td[data-stat="penalties_yds"]').text()),
      first_downs_by_penalty: safeParseInt($row.find('td[data-stat="pen_fd"]').text()),
      // Advanced
      expected_points_added_by_defense: safeParseFloat($row.find('td[data-stat="exp_pts_def_tot"]').text()),
      season,
      week: 10, // Will be updated based on games_played
    };

    // Estimate current week based on games played (most teams play 1 game per week)
    // If a team has played 10 games, we're in week 10
    stats.week = stats.games_played;

    defenseStats.push(stats);

    console.log(`  ✅ ${teamName} (${teamAbbr})`);
    console.log(`     Games: ${stats.games_played} | PA: ${stats.points_allowed} | Yds: ${stats.total_yards_allowed} | Y/P: ${stats.yards_per_play}`);
  });

  console.log(`\n✅ Scraped ${defenseStats.length} teams\n`);
  
  return defenseStats;
}

async function saveToSupabase(stats: TeamDefenseStats[], season: number, week: number): Promise<void> {
  console.log(`${'='.repeat(80)}`);
  console.log(`Saving to Supabase...`);
  console.log(`${'='.repeat(80)}\n`);

  // First, check if the table exists and what columns it has
  const { data: existingData, error: checkError } = await supabase
    .from('team_defense_stats')
    .select('*')
    .limit(1);

  if (checkError) {
    console.error('❌ Error checking table structure:', checkError);
    console.log('\n⚠️  Note: If the table does not exist, you may need to create it first.');
    throw checkError;
  }

  console.log(`✅ Table exists, proceeding with upsert...\n`);

  // Clear existing data for this season/week
  const { error: deleteError } = await supabase
    .from('team_defense_stats')
    .delete()
    .eq('season', season)
    .eq('week', week);

  if (deleteError) {
    console.error('⚠️  Warning: Could not clear existing data:', deleteError.message);
  } else {
    console.log(`✅ Cleared existing data for season ${season}, week ${week}\n`);
  }

  // Insert new data
  let saved = 0;
  let failed = 0;

  for (const stat of stats) {
    try {
      const { error } = await supabase
        .from('team_defense_stats')
        .insert(stat);

      if (error) {
        throw error;
      }

      saved++;
      console.log(`  ✅ Saved: ${stat.team_name}`);
    } catch (error: any) {
      failed++;
      console.error(`  ❌ Failed: ${stat.team_name} - ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Save Complete`);
  console.log(`${'='.repeat(80)}`);
  console.log(`  ✅ Saved: ${saved} teams`);
  console.log(`  ❌ Failed: ${failed} teams`);
  console.log(`${'='.repeat(80)}\n`);
}

async function main() {
  try {
    const season = 2025;
    const week = 10;

    // Scrape the data
    const stats = await scrapeTeamDefenseStats(season);

    if (stats.length === 0) {
      console.error('❌ No stats scraped. Exiting.');
      process.exit(1);
    }

    // Save to database
    await saveToSupabase(stats, season, week);

    console.log('✅ All done!\n');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

