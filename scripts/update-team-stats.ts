/**
 * Update auto_nfl_team_stats table from Pro Football Reference
 * Source: https://www.pro-football-reference.com/years/2025/
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

interface TeamStats {
  team_name: string;
  season: number;
  week: number;
  wins: number;
  losses: number;
  ties: number;
  win_percentage: number;
  points_for: number;
  points_against: number;
  point_differential: number;
  margin_of_victory: number;
  strength_of_schedule: number;
  srs: number;
  offensive_srs: number;
  defensive_srs: number;
}

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

async function scrapeTeamStats(season: number): Promise<TeamStats[]> {
  const url = `https://www.pro-football-reference.com/years/${season}/`;
  
  console.log('\n' + '='.repeat(80));
  console.log('Fetching Team Stats from Pro Football Reference');
  console.log(`URL: ${url}`);
  console.log(`Season: ${season}`);
  console.log('='.repeat(80) + '\n');

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  };

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const allTeams: TeamStats[] = [];
  
  // Find AFC and NFC tables
  const afcTable = $('#AFC');
  const nfcTable = $('#NFC');

  console.log(`Found AFC table: ${afcTable.length > 0 ? 'Yes' : 'No'}`);
  console.log(`Found NFC table: ${nfcTable.length > 0 ? 'Yes' : 'No'}\n`);

  // Helper function to parse a conference table
  function parseConferenceTable(table: cheerio.Cheerio, conferenceName: string): TeamStats[] {
    const teams: TeamStats[] = [];
    
    table.find('tbody tr').each((index, row) => {
      const $row = $(row);
      
      // Skip division header rows
      if ($row.hasClass('thead')) {
        return;
      }

      // Get team name
      const teamCell = $row.find('th[data-stat="team"]');
      if (!teamCell.length) {
        return;
      }

      const teamLink = teamCell.find('a');
      let teamName = teamLink.text().trim();
      
      // Remove playoff indicators (* and +)
      teamName = teamName.replace(/[*+]/g, '').trim();
      
      if (!teamName) {
        return;
      }

      // Parse all stats
      const wins = safeParseInt($row.find('td[data-stat="wins"]').text());
      const losses = safeParseInt($row.find('td[data-stat="losses"]').text());
      const ties = safeParseInt($row.find('td[data-stat="ties"]').text());
      
      // Calculate current week based on total games played
      const gamesPlayed = wins + losses + ties;
      const currentWeek = gamesPlayed; // Each team has played ~week number of games

      const stats: TeamStats = {
        team_name: teamName,
        season,
        week: currentWeek,
        wins,
        losses,
        ties,
        win_percentage: safeParseFloat($row.find('td[data-stat="win_loss_perc"]').text()),
        points_for: safeParseInt($row.find('td[data-stat="points"]').text()),
        points_against: safeParseInt($row.find('td[data-stat="points_opp"]').text()),
        point_differential: safeParseInt($row.find('td[data-stat="points_diff"]').text()),
        margin_of_victory: safeParseFloat($row.find('td[data-stat="mov"]').text()),
        strength_of_schedule: safeParseFloat($row.find('td[data-stat="sos_total"]').text()),
        srs: safeParseFloat($row.find('td[data-stat="srs_total"]').text()),
        offensive_srs: safeParseFloat($row.find('td[data-stat="srs_offense"]').text()),
        defensive_srs: safeParseFloat($row.find('td[data-stat="srs_defense"]').text()),
      };

      teams.push(stats);
      console.log(`  ✅ ${conferenceName}: ${teamName} (${wins}-${losses}${ties > 0 ? `-${ties}` : ''})`);
    });

    return teams;
  }

  // Parse both conferences
  if (afcTable.length > 0) {
    const afcTeams = parseConferenceTable(afcTable, 'AFC');
    allTeams.push(...afcTeams);
  }

  if (nfcTable.length > 0) {
    const nfcTeams = parseConferenceTable(nfcTable, 'NFC');
    allTeams.push(...nfcTeams);
  }

  console.log(`\n✅ Scraped ${allTeams.length} teams\n`);
  
  return allTeams;
}

async function saveToSupabase(teams: TeamStats[], season: number): Promise<void> {
  console.log('='.repeat(80));
  console.log('Saving to Supabase...');
  console.log('='.repeat(80) + '\n');

  let saved = 0;
  let updated = 0;
  let failed = 0;

  for (const team of teams) {
    try {
      // Upsert: insert or update if team+season+week already exists
      const { error } = await supabase
        .from('auto_nfl_team_stats')
        .upsert(team, {
          onConflict: 'team_name,season,week',
          ignoreDuplicates: false,
        });

      if (error) {
        throw error;
      }

      // Check if it was an insert or update
      const { data: existing } = await supabase
        .from('auto_nfl_team_stats')
        .select('created_at, updated_at')
        .eq('team_name', team.team_name)
        .eq('season', team.season)
        .single();

      if (existing && existing.created_at !== existing.updated_at) {
        updated++;
        console.log(`  🔄 Updated: ${team.team_name}`);
      } else {
        saved++;
        console.log(`  ✅ Saved: ${team.team_name}`);
      }
    } catch (error: any) {
      failed++;
      console.error(`  ❌ Failed: ${team.team_name} - ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Save Complete');
  console.log('='.repeat(80));
  console.log(`  ✅ Saved: ${saved} teams`);
  console.log(`  🔄 Updated: ${updated} teams`);
  console.log(`  ❌ Failed: ${failed} teams`);
  console.log(`  📊 Total: ${teams.length} teams`);
  console.log('='.repeat(80) + '\n');
}

async function main() {
  try {
    const season = 2025;

    // Scrape the data
    const teams = await scrapeTeamStats(season);

    if (teams.length === 0) {
      console.error('❌ No teams scraped. Exiting.');
      process.exit(1);
    }

    // Save to database
    await saveToSupabase(teams, season);

    console.log('✅ All done!\n');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

