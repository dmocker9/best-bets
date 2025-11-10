import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchWeek9GameResults, GameResult } from '@/lib/fetchNFLStats';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const dynamic = 'force-dynamic';

/**
 * POST /api/sync-game-results
 * 
 * Syncs actual game results from ESPN API and stores them in the database
 * 
 * Query params:
 *   - week: week number (default: 9)
 *   - season: season year (default: 2025)
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const week = parseInt(searchParams.get('week') || '9');
    const season = parseInt(searchParams.get('season') || '2025');

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 SYNCING GAME RESULTS - Week ${week}, Season ${season}`);
    console.log(`${'='.repeat(70)}\n`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch game results from ESPN API
    const gameResults = await fetchWeek9GameResults(week, season);

    if (gameResults.length === 0) {
      return NextResponse.json({
        success: false,
        message: `No game results found for Week ${week}, Season ${season}`,
        synced: 0,
        total: 0,
      }, { status: 404 });
    }

    let synced = 0;
    let updated = 0;
    let errors = 0;

    // Process each game result
    for (const game of gameResults) {
      try {
        // Determine winner
        const winner = game.homeScore > game.awayScore ? game.homeTeam : game.awayScore > game.homeScore ? game.awayTeam : 'Tie';

        // Try to find matching game in odds_bets table
        const { data: oddsGame } = await supabase
          .from('odds_bets')
          .select('id')
          .eq('home_team', game.homeTeam)
          .eq('away_team', game.awayTeam)
          .single();

        // Try to find matching prediction to calculate spread results
        let homeSpreadResult = null;
        let awaySpreadResult = null;
        let homeMoneylineResult = null;
        let awayMoneylineResult = null;

        if (oddsGame?.id) {
          // Get both prediction and Vegas spread
          const { data: prediction } = await supabase
            .from('spread_predictions')
            .select('*')
            .eq('game_id', oddsGame.id)
            .eq('week_number', week)
            .eq('season', season)
            .single();

          // Get the Vegas spread from odds_bets
          const { data: odds } = await supabase
            .from('odds_bets')
            .select('home_spread, away_spread')
            .eq('id', oddsGame.id)
            .single();

          // Use Vegas spread (from odds_bets) to calculate results, not predicted spread
          if (odds && (odds.home_spread || odds.away_spread)) {
            const actualMargin = game.homeScore - game.awayScore;
            // Parse the Vegas spread - it's stored as TEXT like "-6.5" or "+7.5"
            const vegasHomeSpread = parseFloat((odds.home_spread || '0').replace(/[^\d.-]/g, '')) || 0;

            // Home team perspective: if home team spread is -7 (home favored by 7)
            // They need to win by MORE than 7 to cover
            
            if (vegasHomeSpread < 0) {
              // Home team is favored (e.g., -6.5)
              const spreadTocover = Math.abs(vegasHomeSpread);
              if (actualMargin > spreadTocover) {
                homeSpreadResult = 'win';
                awaySpreadResult = 'loss';
              } else if (actualMargin === spreadTocover) {
                homeSpreadResult = 'push';
                awaySpreadResult = 'push';
              } else {
                homeSpreadResult = 'loss';
                awaySpreadResult = 'win';
              }
            } else if (vegasHomeSpread > 0) {
              // Home team is underdog (e.g., +4.5)
              // Home team covers if they lose by less than the spread OR win
              if (actualMargin > 0) {
                // Home team won outright
                homeSpreadResult = 'win';
                awaySpreadResult = 'loss';
              } else if (Math.abs(actualMargin) < vegasHomeSpread) {
                // Home team lost but covered the spread
                homeSpreadResult = 'win';
                awaySpreadResult = 'loss';
              } else if (Math.abs(actualMargin) === vegasHomeSpread) {
                // Exactly the spread - push
                homeSpreadResult = 'push';
                awaySpreadResult = 'push';
              } else {
                // Home team lost by more than the spread
                homeSpreadResult = 'loss';
                awaySpreadResult = 'win';
              }
            } else {
              // Pick'em (spread is 0)
              if (actualMargin > 0) {
                homeSpreadResult = 'win';
                awaySpreadResult = 'loss';
              } else if (actualMargin < 0) {
                awaySpreadResult = 'win';
                homeSpreadResult = 'loss';
              } else {
                homeSpreadResult = 'push';
                awaySpreadResult = 'push';
              }
            }
          }

          // Moneyline is simpler - just who won
          if (winner === game.homeTeam) {
            homeMoneylineResult = 'win';
            awayMoneylineResult = 'loss';
          } else if (winner === game.awayTeam) {
            homeMoneylineResult = 'loss';
            awayMoneylineResult = 'win';
          }
        }

        // Check if result already exists
        const { data: existingResult } = await supabase
          .from('game_results')
          .select('id')
          .eq('home_team', game.homeTeam)
          .eq('away_team', game.awayTeam)
          .eq('week_number', week)
          .eq('season', season)
          .single();

        const resultData = {
          game_id: oddsGame?.id || null,
          home_team: game.homeTeam,
          away_team: game.awayTeam,
          home_score: game.homeScore,
          away_score: game.awayScore,
          winner: winner,
          week_number: week,
          season: season,
          game_date: game.gameDate || new Date().toISOString(),
          game_status: game.gameStatus,
          home_spread_result: homeSpreadResult,
          away_spread_result: awaySpreadResult,
          home_moneyline_result: homeMoneylineResult,
          away_moneyline_result: awayMoneylineResult,
        };

        if (existingResult) {
          // Update existing result
          const { error } = await supabase
            .from('game_results')
            .update(resultData)
            .eq('id', existingResult.id);

          if (error) throw error;
          updated++;
        } else {
          // Insert new result
          const { error } = await supabase
            .from('game_results')
            .insert(resultData);

          if (error) throw error;
          synced++;
        }
      } catch (error) {
        console.error(`Error processing game ${game.homeTeam} vs ${game.awayTeam}:`, error);
        errors++;
      }
    }

    console.log(`\n✅ Sync complete:`);
    console.log(`   Synced: ${synced} new results`);
    console.log(`   Updated: ${updated} existing results`);
    console.log(`   Errors: ${errors}`);
    console.log(`${'='.repeat(70)}\n`);

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} new results, updated ${updated} existing results`,
      synced,
      updated,
      errors,
      total: gameResults.length,
    });
  } catch (error) {
    console.error('Error syncing game results:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      synced: 0,
      updated: 0,
      errors: 0,
      total: 0,
    }, { status: 500 });
  }
}

/**
 * GET /api/sync-game-results
 * Alternative method to sync results
 */
export async function GET(request: Request) {
  return POST(request);
}


