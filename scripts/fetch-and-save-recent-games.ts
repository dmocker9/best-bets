/**
 * Fetch Last 3 Games for All NFL Teams and Save to Supabase
 * Uses ESPN Scoreboard API to get actual completed games with scores
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
  isHome: boolean;
  result: 'W' | 'L' | 'T';
  score: string;
  teamScore: number;
  opponentScore: number;
}

interface TeamGameData {
  teamName: string;
  teamId: string;
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
  
  // Fetch games week by week (weeks 1-10 completed so far in 2025)
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
      
      // Process each game
      for (const event of events) {
        const competition = event.competitions?.[0];
        if (!competition) continue;
        
        // Only process completed games
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
          isHome: true,
          result: homeScore > awayScore ? 'W' : homeScore < awayScore ? 'L' : 'T',
          score: `${homeScore}-${awayScore}`,
          teamScore: homeScore,
          opponentScore: awayScore,
        };
        
        // Add game for away team
        const awayGameResult: GameResult = {
          week,
          date: new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          opponent: homeTeam.team.displayName,
          isHome: false,
          result: awayScore > homeScore ? 'W' : awayScore < homeScore ? 'L' : 'T',
          score: `${awayScore}-${homeScore}`,
          teamScore: awayScore,
          opponentScore: homeScore,
        };
        
        // Add to map
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
      
      // Small delay to avoid rate limiting
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
async function fetchNFLTeams(): Promise<{ id: string; name: string; abbreviation: string }[]> {
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
      abbreviation: t.team.abbreviation,
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
 * Save game data to Supabase
 */
async function saveToSupabase(supabase: any, teamData: TeamGameData[]): Promise<void> {
  console.log('\n💾 Saving data to Supabase...\n');
  
  // First, clear existing data for 2025 season
  const { error: deleteError } = await supabase
    .from('recent_game_stats')
    .delete()
    .eq('season', 2025);
  
  if (deleteError) {
    console.log('   ⚠️  Warning: Could not clear existing data:', deleteError.message);
  } else {
    console.log('   ✅ Cleared existing 2025 season data');
  }
  
  let savedCount = 0;
  let errorCount = 0;
  
  // Insert all games
  for (const team of teamData) {
    for (const game of team.last3Games) {
      const gameRecord = {
        team_name: team.teamName,
        team_id: team.teamId,
        overall_record: team.record,
        week_number: game.week,
        game_date: game.date,
        opponent: game.opponent,
        is_home: game.isHome,
        result: game.result,
        team_score: game.teamScore,
        opponent_score: game.opponentScore,
        score_display: game.score,
        margin: game.result === 'W' 
          ? (game.teamScore - game.opponentScore) 
          : game.result === 'L'
          ? -(game.opponentScore - game.teamScore)
          : 0,
        season: 2025,
      };
      
      const { error } = await supabase
        .from('recent_game_stats')
        .insert(gameRecord);
      
      if (error) {
        console.log(`   ❌ Error saving ${team.teamName} Week ${game.week}:`, error.message);
        errorCount++;
      } else {
        savedCount++;
      }
    }
  }
  
  console.log(`\n✅ Saved ${savedCount} game records to Supabase`);
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

  const hotTeams = teamData.filter(t => 
    t.last3Games.filter(g => g.result === 'W').length >= 2
  );
  const coldTeams = teamData.filter(t => 
    t.last3Games.filter(g => g.result === 'W').length === 0 && t.last3Games.length > 0
  );

  console.log(`\n🔥 Hot Teams (2+ wins in last 3): ${hotTeams.length}`);
  hotTeams
    .sort((a, b) => {
      const aWins = a.last3Games.filter(g => g.result === 'W').length;
      const bWins = b.last3Games.filter(g => g.result === 'W').length;
      return bWins - aWins;
    })
    .slice(0, 10)
    .forEach(t => {
      const wins = t.last3Games.filter(g => g.result === 'W').length;
      const form = t.last3Games.map(g => g.result).join('-');
      const avgMargin = (t.last3Games.reduce((sum, g) => {
        return sum + (g.result === 'W' ? (g.teamScore - g.opponentScore) : -(g.opponentScore - g.teamScore));
      }, 0) / t.last3Games.length).toFixed(1);
      console.log(`   • ${t.teamName.padEnd(30)} ${form} (${avgMargin > '0' ? '+' : ''}${avgMargin}) - Record: ${t.record}`);
    });

  console.log(`\n❄️  Cold Teams (0 wins in last 3): ${coldTeams.length}`);
  coldTeams.forEach(t => {
    const form = t.last3Games.map(g => g.result).join('-');
    const avgMargin = (t.last3Games.reduce((sum, g) => {
      return sum + (g.result === 'W' ? (g.teamScore - g.opponentScore) : -(g.opponentScore - g.teamScore));
    }, 0) / t.last3Games.length).toFixed(1);
    console.log(`   • ${t.teamName.padEnd(30)} ${form} (${avgMargin}) - Record: ${t.record}`);
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('🏈 NFL Last 3 Games Fetcher & Supabase Saver (2025 Season - Week 10)');
  console.log('='.repeat(80));
  console.log('Fetching data from ESPN API and saving to Supabase...\n');

  try {
    // Initialize Supabase
    const supabase = getSupabaseClient();
    console.log('✅ Connected to Supabase\n');

    // Step 1: Fetch all completed games
    const allGamesMap = await fetchAllCompletedGames();
    console.log(`✅ Loaded games for ${allGamesMap.size} teams\n`);

    // Step 2: Fetch all teams
    const teams = await fetchNFLTeams();
    console.log(`✅ Found ${teams.length} NFL teams\n`);

    // Step 3: Build team data with last 3 games
    const allTeamsData: TeamGameData[] = [];
    
    console.log('📊 Building team reports...\n');
    for (const team of teams) {
      const games = allGamesMap.get(team.id) || [];
      const last3Games = games.slice(-3); // Get last 3
      const record = await getTeamRecord(team.id);
      
      allTeamsData.push({
        teamName: team.name,
        teamId: team.id,
        record,
        last3Games,
      });
      
      process.stdout.write(`   ✅ ${team.name}\n`);
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 4: Save to Supabase
    await saveToSupabase(supabase, allTeamsData);

    // Step 5: Display summary
    displaySummary(allTeamsData);

    console.log('\n✅ Data fetch and save complete!\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();

