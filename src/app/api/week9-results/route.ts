import { NextResponse } from 'next/server';
import { fetchWeek9GameResults } from '@/lib/fetchNFLStats';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const week = parseInt(searchParams.get('week') || '9');
    const season = parseInt(searchParams.get('season') || '2025');

    console.log(`\n${'='.repeat(70)}`);
    console.log(`🏈 FETCHING NFL WEEK ${week} GAME RESULTS`);
    console.log(`Season: ${season}`);
    console.log(`${'='.repeat(70)}\n`);

    const gameResults = await fetchWeek9GameResults(week, season);

    if (gameResults.length === 0) {
      return NextResponse.json({
        success: false,
        message: `No games found for Week ${week}, Season ${season}`,
        games: [],
      }, { status: 404 });
    }

    // Format results for display
    const formattedResults = gameResults.map((game) => ({
      awayTeam: game.awayTeam,
      homeTeam: game.homeTeam,
      awayScore: game.awayScore,
      homeScore: game.homeScore,
      status: game.gameStatus,
      winner: game.homeScore > game.awayScore ? game.homeTeam : game.awayScore > game.homeScore ? game.awayTeam : 'Tie',
    }));

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 WEEK ${week} GAME RESULTS:`);
    console.log(`${'='.repeat(70)}`);
    formattedResults.forEach((game, index) => {
      console.log(`\n${index + 1}. ${game.awayTeam} @ ${game.homeTeam}`);
      console.log(`   Score: ${game.awayTeam} ${game.awayScore} - ${game.homeScore} ${game.homeTeam}`);
      console.log(`   Winner: ${game.winner}`);
      console.log(`   Status: ${game.status}`);
    });
    console.log(`\n${'='.repeat(70)}\n`);

    return NextResponse.json({
      success: true,
      week,
      season,
      totalGames: gameResults.length,
      games: formattedResults,
    });
  } catch (error) {
    console.error('❌ Error fetching Week 9 results:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      games: [],
    }, { status: 500 });
  }
}

