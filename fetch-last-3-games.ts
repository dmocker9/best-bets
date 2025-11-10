/**
 * Fetch Last 3 Games for All NFL Teams
 * Uses ESPN Scoreboard API to get actual completed games with scores
 */

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
 * Display game data in a formatted table
 */
function displayTeamGames(teamData: TeamGameData) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🏈 ${teamData.teamName} (${teamData.record})`);
  console.log(`${'='.repeat(80)}`);
  
  if (teamData.last3Games.length === 0) {
    console.log('   No completed games found');
    return;
  }

  teamData.last3Games.forEach((game) => {
    const location = game.isHome ? 'vs' : '@';
    const resultEmoji = game.result === 'W' ? '✅' : game.result === 'L' ? '❌' : '🟡';
    const margin = Math.abs(game.teamScore - game.opponentScore);
    
    console.log(
      `   ${resultEmoji} Week ${game.week.toString().padStart(2)} | ` +
      `${game.date.padEnd(8)} | ` +
      `${location} ${game.opponent.padEnd(25)} | ` +
      `${game.result} ${game.score.padEnd(7)} | ` +
      `(${margin > 0 ? (game.result === 'W' ? '+' : '-') + margin : '0'} pts)`
    );
  });

  // Show trend
  const recentForm = teamData.last3Games.map(g => g.result).join('-');
  const wins = teamData.last3Games.filter(g => g.result === 'W').length;
  const trend = wins >= 2 ? '📈 Hot' : wins === 1 ? '➡️ Average' : '📉 Cold';
  
  // Calculate average margin
  const totalMargin = teamData.last3Games.reduce((sum, g) => {
    return sum + (g.result === 'W' ? (g.teamScore - g.opponentScore) : -(g.opponentScore - g.teamScore));
  }, 0);
  const avgMargin = (totalMargin / teamData.last3Games.length).toFixed(1);
  
  console.log(`\n   Recent Form: ${recentForm} ${trend} | Avg Margin: ${avgMargin > '0' ? '+' : ''}${avgMargin} pts`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🏈 NFL Last 3 Games Fetcher (2025 Season - Week 10)');
  console.log('='.repeat(80));
  console.log('Fetching data from ESPN API...\n');

  try {
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
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Sort teams alphabetically
    allTeamsData.sort((a, b) => a.teamName.localeCompare(b.teamName));

    // Display all results
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTS: LAST 3 GAMES FOR ALL NFL TEAMS');
    console.log('='.repeat(80));

    allTeamsData.forEach(teamData => {
      displayTeamGames(teamData);
    });

    // Summary statistics
    console.log('\n\n' + '='.repeat(80));
    console.log('📈 SUMMARY STATISTICS');
    console.log('='.repeat(80));

    const hotTeams = allTeamsData.filter(t => 
      t.last3Games.filter(g => g.result === 'W').length >= 2
    );
    const coldTeams = allTeamsData.filter(t => 
      t.last3Games.filter(g => g.result === 'W').length === 0 && t.last3Games.length > 0
    );

    console.log(`\n🔥 Hot Teams (2+ wins in last 3): ${hotTeams.length}`);
    hotTeams
      .sort((a, b) => {
        const aWins = a.last3Games.filter(g => g.result === 'W').length;
        const bWins = b.last3Games.filter(g => g.result === 'W').length;
        return bWins - aWins;
      })
      .forEach(t => {
        const wins = t.last3Games.filter(g => g.result === 'W').length;
        const form = t.last3Games.map(g => g.result).join('-');
        console.log(`   • ${t.teamName.padEnd(30)} ${form} - Overall: ${t.record}`);
      });

    console.log(`\n❄️  Cold Teams (0 wins in last 3): ${coldTeams.length}`);
    coldTeams.forEach(t => {
      const form = t.last3Games.map(g => g.result).join('-');
      console.log(`   • ${t.teamName.padEnd(30)} ${form} - Overall: ${t.record}`);
    });

    console.log('\n✅ Data fetch complete!\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
