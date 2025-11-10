// Script to fetch NFL Week 9 game results from ESPN API
// Uses Node.js built-in fetch (Node 18+)

async function fetchWeek9Results() {
  try {
    // Try different URL formats for 2025 Week 9
    const urls = [
      // Format 1: With dates (Week 9 2025 is around Nov 2-6, 2025)
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=20251102-20251109`,
      // Format 2: With week parameter (2025 season)
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=9&seasontype=2&season=2025`,
      // Format 3: Alternative date range for Week 9
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=20251101-20251108`,
    ];

    for (const url of urls) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🏈 Fetching NFL Week 9 Results`);
      console.log(`${'='.repeat(70)}\n`);
      console.log(`📍 URL: ${url}\n`);

      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          console.log(`❌ Error: ${response.status} ${response.statusText}`);
          const text = await response.text();
          console.log(`Response: ${text.substring(0, 200)}\n`);
          continue;
        }

        const data = await response.json();
        const events = data.events || [];

        if (events.length === 0) {
          console.log(`⚠️  No games found for this date range`);
          continue;
        }

        console.log(`✅ Found ${events.length} games!\n`);
        console.log(`📅 Week: ${data.week?.number || 'Unknown'}\n`);

        // Display results
        const gameResults = [];
        events.forEach((event, index) => {
          const competition = event.competitions?.[0];
          if (!competition) return;

          const competitors = competition.competitors || [];
          if (competitors.length !== 2) return;

          const homeTeam = competitors.find(c => c.homeAway === 'home');
          const awayTeam = competitors.find(c => c.homeAway === 'away');

          if (!homeTeam || !awayTeam) {
            // Fallback to first two teams
            const [team1, team2] = competitors;
            const result = {
              awayTeam: team1.team.displayName,
              homeTeam: team2.team.displayName,
              awayScore: parseInt(team1.score || '0'),
              homeScore: parseInt(team2.score || '0'),
              status: competition.status?.type?.description || 'Unknown',
            };
            gameResults.push(result);
            console.log(`${index + 1}. ${result.awayTeam} @ ${result.homeTeam}`);
            console.log(`   Score: ${result.awayTeam} ${result.awayScore} - ${result.homeScore} ${result.homeTeam}`);
            const winner = result.homeScore > result.awayScore ? result.homeTeam : result.awayScore > result.homeScore ? result.awayTeam : 'Tie';
            console.log(`   Winner: ${winner}`);
            console.log(`   Status: ${result.status}\n`);
          } else {
            const result = {
              awayTeam: awayTeam.team.displayName,
              homeTeam: homeTeam.team.displayName,
              awayScore: parseInt(awayTeam.score || '0'),
              homeScore: parseInt(homeTeam.score || '0'),
              status: competition.status?.type?.description || 'Unknown',
            };
            gameResults.push(result);
            console.log(`${index + 1}. ${result.awayTeam} @ ${result.homeTeam}`);
            console.log(`   Score: ${result.awayTeam} ${result.awayScore} - ${result.homeScore} ${result.homeTeam}`);
            const winner = result.homeScore > result.awayScore ? result.homeTeam : result.awayScore > result.homeScore ? result.awayTeam : 'Tie';
            console.log(`   Winner: ${winner}`);
            console.log(`   Status: ${result.status}\n`);
          }
        });

        console.log(`${'='.repeat(70)}`);
        console.log(`\n📊 SUMMARY: ${gameResults.length} games found\n`);
        console.log(`${'='.repeat(70)}\n`);
        return gameResults; // Successfully fetched, exit
      } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
        continue;
      }
    }
    
    console.log(`\n⚠️  Could not fetch Week 9 results from any URL format\n`);
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

fetchWeek9Results();

