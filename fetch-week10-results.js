// Script to fetch NFL Week 10 game results from ESPN API
// Week 10 2025: November 7-11, 2025

async function fetchWeek10Results() {
  try {
    // Week 10 2025 date ranges to try
    const urls = [
      // Format 1: With dates (Week 10 2025 is around Nov 7-11, 2025)
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=20251107-20251111`,
      // Format 2: With week parameter (2025 season)
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=10&seasontype=2&season=2025`,
      // Format 3: Alternative date range for Week 10
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=20251106-20251113`,
    ];

    for (const url of urls) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🏈 Fetching NFL Week 10 Results (2025)`);
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
              gameDate: event.date,
            };
            gameResults.push(result);
            console.log(`${index + 1}. ${result.awayTeam} @ ${result.homeTeam}`);
            console.log(`   Score: ${result.awayTeam} ${result.awayScore} - ${result.homeScore} ${result.homeTeam}`);
            const winner = result.homeScore > result.awayScore ? result.homeTeam : result.awayScore > result.homeScore ? result.awayTeam : 'Tie';
            console.log(`   Winner: ${winner}`);
            console.log(`   Status: ${result.status}`);
            console.log(`   Date: ${result.gameDate}\n`);
          } else {
            const result = {
              awayTeam: awayTeam.team.displayName,
              homeTeam: homeTeam.team.displayName,
              awayScore: parseInt(awayTeam.score || '0'),
              homeScore: parseInt(homeTeam.score || '0'),
              status: competition.status?.type?.description || 'Unknown',
              gameDate: event.date,
            };
            gameResults.push(result);
            console.log(`${index + 1}. ${result.awayTeam} @ ${result.homeTeam}`);
            console.log(`   Score: ${result.awayTeam} ${result.awayScore} - ${result.homeScore} ${result.homeTeam}`);
            const winner = result.homeScore > result.awayScore ? result.homeTeam : result.awayScore > result.homeScore ? result.awayTeam : 'Tie';
            console.log(`   Winner: ${winner}`);
            console.log(`   Status: ${result.status}`);
            console.log(`   Date: ${result.gameDate}\n`);
          }
        });

        console.log(`${'='.repeat(70)}`);
        console.log(`\n📊 SUMMARY: ${gameResults.length} games found\n`);
        console.log(`${'='.repeat(70)}\n`);
        
        // Display our 5 picks
        console.log(`\n🎯 OUR 5 WEEK 10 PICKS:\n`);
        
        const ourPicks = [
          { team: 'Seattle Seahawks', spread: -6.5, opponent: 'Arizona Cardinals' },
          { team: 'Carolina Panthers', spread: -5.5, opponent: 'New Orleans Saints' },
          { team: 'Los Angeles Rams', spread: -4.5, opponent: 'San Francisco 49ers' },
          { team: 'Chicago Bears', spread: -4.5, opponent: 'New York Giants' },
          { team: 'Los Angeles Chargers', spread: -3, opponent: 'Pittsburgh Steelers' },
        ];
        
        ourPicks.forEach((pick, idx) => {
          const game = gameResults.find(g => 
            (g.homeTeam.includes(pick.team.split(' ').pop()) || g.awayTeam.includes(pick.team.split(' ').pop())) &&
            (g.homeTeam.includes(pick.opponent.split(' ').pop()) || g.awayTeam.includes(pick.opponent.split(' ').pop()))
          );
          
          if (game) {
            const isHome = game.homeTeam.includes(pick.team.split(' ').pop());
            const teamScore = isHome ? game.homeScore : game.awayScore;
            const oppScore = isHome ? game.awayScore : game.homeScore;
            const scoreDiff = teamScore - oppScore;
            const covered = scoreDiff > Math.abs(pick.spread);
            
            console.log(`${idx + 1}. ${pick.team} ${pick.spread} vs ${pick.opponent}`);
            console.log(`   Score: ${game.awayTeam} ${game.awayScore} - ${game.homeScore} ${game.homeTeam}`);
            console.log(`   Score Diff: ${scoreDiff > 0 ? '+' : ''}${scoreDiff} (needed ${Math.abs(pick.spread)} to cover)`);
            console.log(`   Result: ${covered ? '✅ WIN (COVERED)' : '❌ LOSS (DID NOT COVER)'}\n`);
          } else {
            console.log(`${idx + 1}. ${pick.team} ${pick.spread} vs ${pick.opponent}`);
            console.log(`   ⚠️  Game not found in results\n`);
          }
        });
        
        return gameResults; // Successfully fetched, exit
      } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
        continue;
      }
    }
    
    console.log(`\n⚠️  Could not fetch Week 10 results from any URL format\n`);
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

fetchWeek10Results();

