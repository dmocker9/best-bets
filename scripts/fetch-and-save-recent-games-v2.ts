/**
 * Fetch Last 3 Games for All NFL Teams and Save to Supabase
 * SIMPLIFIED VERSION: One row per team
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

interface GameResult {
  week: number;
  date: string;
  opponent: string;
  location: 'HOME' | 'AWAY';
  result: 'W' | 'L' | 'T';
  score: string;
  margin: number;
}

interface TeamGameData {
  teamName: string;
  record: string;
  last3Games: GameResult[];
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
 * Fetch all completed games from current season
 */
async function fetchAllCompletedGames(): Promise<Map<string, GameResult[]>> {
  const teamGamesMap = new Map<string, GameResult[]>();
  
  console.log('📡 Fetching all completed games from 2025 NFL season...\n');
  
  for (let week = 1; week <= 10; week++) {
    process.stdout.write(`   ⏳ Fetching Week ${week}...`);
    
    try {
      const response = await fetch(
        `${ESPN_API_BASE}/scoreboard?dates=2025&seasontype=2&week=${week}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        process.stdout.write(` ⚠️ Failed\n`);
        continue;
      }

      const data = await response.json();
      const events = data.events || [];
      
      for (const event of events) {
        const competition = event.competitions?.[0];
        if (!competition) continue;
        
        if (!competition.status?.type?.completed) continue;
        
        const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
        const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');
        
        if (!homeTeam || !awayTeam) continue;
        
        const homeScore = parseInt(homeTeam.score || '0');
        const awayScore = parseInt(awayTeam.score || '0');
        
        // Add game for home team
        const homeGameResult: GameResult = {
          week,
          date: new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          opponent: awayTeam.team.displayName,
          location: 'HOME',
          result: homeScore > awayScore ? 'W' : homeScore < awayScore ? 'L' : 'T',
          score: `${homeScore}-${awayScore}`,
          margin: homeScore > awayScore ? (homeScore - awayScore) : homeScore < awayScore ? -(awayScore - homeScore) : 0,
        };
        
        // Add game for away team
        const awayGameResult: GameResult = {
          week,
          date: new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          opponent: homeTeam.team.displayName,
          location: 'AWAY',
          result: awayScore > homeScore ? 'W' : awayScore < homeScore ? 'L' : 'T',
          score: `${awayScore}-${homeScore}`,
          margin: awayScore > homeScore ? (awayScore - homeScore) : awayScore < homeScore ? -(homeScore - awayScore) : 0,
        };
        
        const homeTeamId = homeTeam.id;
        const awayTeamId = awayTeam.id;
        
        if (!teamGamesMap.has(homeTeamId)) {
          teamGamesMap.set(homeTeamId, []);
        }
        if (!teamGamesMap.has(awayTeamId)) {
          teamGamesMap.set(awayTeamId, []);
        }
        
        teamGamesMap.get(homeTeamId)!.push(homeGameResult);
        teamGamesMap.get(awayTeamId)!.push(awayGameResult);
      }
      
      process.stdout.write(` ✅ (${events.length} games)\n`);
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      process.stdout.write(` ❌ Error\n`);
    }
  }
  
  console.log('');
  return teamGamesMap;
}

/**
 * Fetch all NFL teams
 */
async function fetchNFLTeams(): Promise<{ id: string; name: string }[]> {
  try {
    console.log('📡 Fetching NFL teams...\n');
    const response = await fetch(`${ESPN_API_BASE}/teams`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`ESPN API failed: ${response.status}`);
    }

    const data = await response.json();
    const teams = data.sports?.[0]?.leagues?.[0]?.teams || [];
    
    return teams.map((t: any) => ({
      id: t.team.id,
      name: t.team.displayName,
    }));
  } catch (error) {
    console.error('❌ Error fetching teams:', error);
    throw error;
  }
}

/**
 * Get team record from API
 */
async function getTeamRecord(teamId: string): Promise<string> {
  try {
    const response = await fetch(`${ESPN_API_BASE}/teams/${teamId}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return '0-0';

    const data = await response.json();
    const record = data.team?.record?.items?.[0];
    const wins = record?.stats?.find((s: any) => s.name === 'wins')?.value || 0;
    const losses = record?.stats?.find((s: any) => s.name === 'losses')?.value || 0;
    const ties = record?.stats?.find((s: any) => s.name === 'ties')?.value || 0;
    
    return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
  } catch {
    return '0-0';
  }
}

/**
 * Calculate momentum metrics
 */
function calculateMomentum(games: GameResult[]): {
  wins: number;
  losses: number;
  ties: number;
  recentForm: string;
  avgMargin: number;
  momentum: 'Hot' | 'Average' | 'Cold';
} {
  const wins = games.filter(g => g.result === 'W').length;
  const losses = games.filter(g => g.result === 'L').length;
  const ties = games.filter(g => g.result === 'T').length;
  const recentForm = games.map(g => g.result).join('-');
  const avgMargin = games.reduce((sum, g) => sum + g.margin, 0) / games.length;
  
  let momentum: 'Hot' | 'Average' | 'Cold';
  if (wins >= 2) momentum = 'Hot';
  else if (wins === 1) momentum = 'Average';
  else momentum = 'Cold';
  
  return { wins, losses, ties, recentForm, avgMargin, momentum };
}

/**
 * Save game data to Supabase (simplified - one row per team)
 */
async function saveToSupabase(supabase: any, teamData: TeamGameData[]): Promise<void> {
  console.log('\n💾 Saving data to Supabase (one row per team)...\n');
  
  // Clear existing data for 2025 season
  const { error: deleteError } = await supabase
    .from('team_recent_games')
    .delete()
    .eq('season', 2025);
  
  if (deleteError) {
    console.log('   ⚠️  Warning: Could not clear existing data:', deleteError.message);
  } else {
    console.log('   ✅ Cleared existing 2025 season data');
  }
  
  let savedCount = 0;
  let errorCount = 0;
  
  // Insert one row per team
  for (const team of teamData) {
    const metrics = calculateMomentum(team.last3Games);
    
    const teamRecord = {
      team_name: team.teamName,
      overall_record: team.record,
      recent_games: team.last3Games, // Stored as JSONB array
      games_played: team.last3Games.length,
      wins: metrics.wins,
      losses: metrics.losses,
      ties: metrics.ties,
      recent_form: metrics.recentForm,
      avg_margin: metrics.avgMargin.toFixed(1),
      momentum: metrics.momentum,
      season: 2025,
    };
    
    const { error } = await supabase
      .from('team_recent_games')
      .insert(teamRecord);
    
    if (error) {
      console.log(`   ❌ Error saving ${team.teamName}:`, error.message);
      errorCount++;
    } else {
      console.log(`   ✅ Saved ${team.teamName} (${metrics.recentForm} - ${metrics.momentum})`);
      savedCount++;
    }
  }
  
  console.log(`\n✅ Saved ${savedCount} team records to Supabase (${savedCount} rows total)`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} errors occurred`);
  }
}

/**
 * Display summary statistics
 */
function displaySummary(teamData: TeamGameData[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📈 SUMMARY STATISTICS');
  console.log('='.repeat(80));

  const withMetrics = teamData.map(t => ({
    ...t,
    metrics: calculateMomentum(t.last3Games)
  }));

  const hotTeams = withMetrics.filter(t => t.metrics.wins >= 2);
  const coldTeams = withMetrics.filter(t => t.metrics.wins === 0 && t.last3Games.length > 0);

  console.log(`\n🔥 Hot Teams (2+ wins in last 3): ${hotTeams.length}`);
  hotTeams
    .sort((a, b) => b.metrics.avgMargin - a.metrics.avgMargin)
    .slice(0, 10)
    .forEach(t => {
      console.log(`   • ${t.teamName.padEnd(30)} ${t.metrics.recentForm} (${t.metrics.avgMargin > 0 ? '+' : ''}${t.metrics.avgMargin.toFixed(1)}) - Record: ${t.record}`);
    });

  console.log(`\n❄️  Cold Teams (0 wins in last 3): ${coldTeams.length}`);
  coldTeams
    .sort((a, b) => a.metrics.avgMargin - b.metrics.avgMargin)
    .forEach(t => {
      console.log(`   • ${t.teamName.padEnd(30)} ${t.metrics.recentForm} (${t.metrics.avgMargin.toFixed(1)}) - Record: ${t.record}`);
    });
}

/**
 * Main execution
 */
async function main() {
  console.log('🏈 NFL Last 3 Games Fetcher & Supabase Saver (2025 Season - Week 10)');
  console.log('📊 SIMPLIFIED: One row per team');
  console.log('='.repeat(80));

  try {
    const supabase = getSupabaseClient();
    console.log('✅ Connected to Supabase\n');

    const allGamesMap = await fetchAllCompletedGames();
    console.log(`✅ Loaded games for ${allGamesMap.size} teams\n`);

    const teams = await fetchNFLTeams();
    console.log(`✅ Found ${teams.length} NFL teams\n`);

    const allTeamsData: TeamGameData[] = [];
    
    console.log('📊 Building team reports...\n');
    for (const team of teams) {
      const games = allGamesMap.get(team.id) || [];
      const last3Games = games.slice(-3);
      const record = await getTeamRecord(team.id);
      
      allTeamsData.push({
        teamName: team.name,
        record,
        last3Games,
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await saveToSupabase(supabase, allTeamsData);
    displaySummary(allTeamsData);

    console.log('\n✅ Data fetch and save complete!\n');
    console.log(`📊 Total rows in database: ${allTeamsData.length} (one per team)`);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

