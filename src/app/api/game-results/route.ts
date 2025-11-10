import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const dynamic = 'force-dynamic';

/**
 * GET /api/game-results
 * 
 * Retrieves game results with prediction comparisons
 * 
 * Query params:
 *   - week: filter by week number (optional)
 *   - season: filter by season (optional, default: 2025)
 *   - limit: number of results to return (optional)
 *   - calculateRecord: if true, only returns record stats (faster, optional)
 *   - topPickOnly: if true, only counts #1 pick from each week (Bet of the Week tracking)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week') ? parseInt(searchParams.get('week')!) : undefined;
    const season = parseInt(searchParams.get('season') || '2025');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const calculateRecordOnly = searchParams.get('calculateRecord') === 'true';
    const topPickOnly = searchParams.get('topPickOnly') === 'true';

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 FETCHING GAME RESULTS${calculateRecordOnly ? ' (RECORD ONLY)' : ''}${topPickOnly ? ' (TOP PICKS ONLY)' : ''}`);
    if (week) console.log(`   Week: ${week}`);
    console.log(`   Season: ${season}`);
    if (limit) console.log(`   Limit: ${limit}`);
    console.log(`${'='.repeat(70)}\n`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If only calculating record, use optimized query
    if (calculateRecordOnly) {
      if (topPickOnly) {
        // Special query: Get only the #1 pick from each week
        // Join with predictions to know which side we bet on
        
        // Get top predictions for each week with their recommended bet
        const { data: topPredictions, error: predError } = await supabase
          .from('spread_predictions')
          .select('game_id, week_number, confidence_score, recommended_bet')
          .eq('season', season)
          .neq('recommended_bet', 'none')
          .order('week_number', { ascending: true })
          .order('confidence_score', { ascending: false });

        if (predError) throw predError;

        // Group by week and take only the top pick per week
        const topPicksByWeek: Record<number, { game_id: string; recommended_bet: string }> = {};
        (topPredictions || []).forEach((pred: any) => {
          if (!topPicksByWeek[pred.week_number]) {
            topPicksByWeek[pred.week_number] = {
              game_id: pred.game_id,
              recommended_bet: pred.recommended_bet
            };
          }
        });

        const topPicks = Object.values(topPicksByWeek);
        const topPickGameIds = topPicks.map(p => p.game_id);

        // Get results only for these top picks
        const { data: results, error } = await supabase
          .from('game_results')
          .select('game_id, home_spread_result, away_spread_result, home_moneyline_result, away_moneyline_result')
          .eq('season', season)
          .in('game_id', topPickGameIds);

        if (error) throw error;

        // Calculate record - only count the side we actually bet on
        const record = { wins: 0, losses: 0, pushes: 0 };
        
        (results || []).forEach((result: any) => {
          // Find which side we bet on for this game
          const topPick = topPicks.find(p => p.game_id === result.game_id);
          if (!topPick) return;

          let outcome = null;
          if (topPick.recommended_bet === 'home_spread') {
            outcome = result.home_spread_result;
          } else if (topPick.recommended_bet === 'away_spread') {
            outcome = result.away_spread_result;
          } else if (topPick.recommended_bet === 'home_ml') {
            outcome = result.home_moneyline_result;
          } else if (topPick.recommended_bet === 'away_ml') {
            outcome = result.away_moneyline_result;
          }

          if (outcome === 'win') record.wins++;
          else if (outcome === 'loss') record.losses++;
          else if (outcome === 'push') record.pushes++;
        });

        console.log(`✅ Bet of the Week Record: ${record.wins}-${record.losses}-${record.pushes}\n`);

        return NextResponse.json({
          success: true,
          record,
          total: results?.length || 0,
        });
      }

      // Regular record calculation (all bets)
      // Need to join with predictions to know which side we bet on
      const { data: allPredictions, error: predError } = await supabase
        .from('spread_predictions')
        .select('game_id, week_number, recommended_bet')
        .eq('season', season)
        .neq('recommended_bet', 'none');

      if (predError) throw predError;

      if (week) {
        // Filter to specific week
        const weekPredictions = (allPredictions || []).filter((p: any) => p.week_number === week);
        const gameIds = weekPredictions.map((p: any) => p.game_id);

        const { data: results, error } = await supabase
          .from('game_results')
          .select('game_id, home_spread_result, away_spread_result, home_moneyline_result, away_moneyline_result')
          .eq('season', season)
          .in('game_id', gameIds);

        if (error) throw error;

        // Calculate record based on which side we bet
        const record = { wins: 0, losses: 0, pushes: 0 };
        (results || []).forEach((result: any) => {
          const pred = weekPredictions.find((p: any) => p.game_id === result.game_id);
          if (!pred) return;

          let outcome = null;
          if (pred.recommended_bet === 'home_spread') outcome = result.home_spread_result;
          else if (pred.recommended_bet === 'away_spread') outcome = result.away_spread_result;
          else if (pred.recommended_bet === 'home_ml') outcome = result.home_moneyline_result;
          else if (pred.recommended_bet === 'away_ml') outcome = result.away_moneyline_result;

          if (outcome === 'win') record.wins++;
          else if (outcome === 'loss') record.losses++;
          else if (outcome === 'push') record.pushes++;
        });

        console.log(`✅ Record calculated: ${record.wins}-${record.losses}-${record.pushes}\n`);

        return NextResponse.json({
          success: true,
          record,
          total: results?.length || 0,
        });
      } else {
        // All weeks
        const gameIds = (allPredictions || []).map((p: any) => p.game_id);

        const { data: results, error } = await supabase
          .from('game_results')
          .select('game_id, home_spread_result, away_spread_result, home_moneyline_result, away_moneyline_result')
          .eq('season', season)
          .in('game_id', gameIds);

        if (error) throw error;

        // Calculate record based on which side we bet
        const record = { wins: 0, losses: 0, pushes: 0 };
        (results || []).forEach((result: any) => {
          const pred = (allPredictions || []).find((p: any) => p.game_id === result.game_id);
          if (!pred) return;

          let outcome = null;
          if (pred.recommended_bet === 'home_spread') outcome = result.home_spread_result;
          else if (pred.recommended_bet === 'away_spread') outcome = result.away_spread_result;
          else if (pred.recommended_bet === 'home_ml') outcome = result.home_moneyline_result;
          else if (pred.recommended_bet === 'away_ml') outcome = result.away_moneyline_result;

          if (outcome === 'win') record.wins++;
          else if (outcome === 'loss') record.losses++;
          else if (outcome === 'push') record.pushes++;
        });

        console.log(`✅ Record calculated: ${record.wins}-${record.losses}-${record.pushes}\n`);

        return NextResponse.json({
          success: true,
          record,
          total: results?.length || 0,
        });
      }
    }

    // Full query for detailed results
    // Get all game results for the week/season, we'll filter by predictions later
    let query = supabase
      .from('game_results')
      .select('*')
      .eq('season', season)
      .order('game_date', { ascending: false });

    if (week) {
      query = query.eq('week_number', week);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: results, error } = await query;

    if (error) {
      console.error('Error fetching game results:', error);
      throw error;
    }

    // Don't filter by hardcoded teams - we'll filter by predictions instead
    const filteredResults = results || [];

    console.log(`🎯 Found ${filteredResults.length} total games for week ${week || 'all'}, season ${season}`);

    // Fetch predictions and odds for each game
    const processedResults = await Promise.all(filteredResults.map(async (result: any) => {
      // Fetch prediction for this game - try by game_id first
      let prediction = null;
      if (result.game_id) {
        const { data: predData } = await supabase
          .from('spread_predictions')
          .select('*')
          .eq('game_id', result.game_id)
          .eq('week_number', result.week_number)
          .eq('season', result.season)
          .single();
        prediction = predData;
      }

      // Also try to find prediction by team names if game_id didn't work
      if (!prediction) {
        const { data: predDataArray } = await supabase
          .from('spread_predictions')
          .select(`
            *,
            odds_bets!inner (
              id,
              home_team,
              away_team,
              home_spread,
              away_spread,
              home_price,
              away_price
            )
          `)
          .eq('week_number', result.week_number)
          .eq('season', result.season);
        
        // Find matching prediction by team names
        if (predDataArray && predDataArray.length > 0) {
          for (const pred of predDataArray) {
            const odds = Array.isArray(pred.odds_bets) ? pred.odds_bets[0] : pred.odds_bets;
            if (odds && (
              (odds.home_team === result.home_team && odds.away_team === result.away_team) ||
              (odds.home_team === result.away_team && odds.away_team === result.home_team)
            )) {
              prediction = pred;
              break;
            }
          }
        }
      }

      // Fetch odds if we have game_id
      let odds = null;
      if (result.game_id) {
        const { data: oddsData } = await supabase
          .from('odds_bets')
          .select('*')
          .eq('id', result.game_id)
          .single();
        odds = oddsData;
      }

      // Extract odds from prediction if not found separately
      if (!odds && prediction?.odds_bets) {
        odds = Array.isArray(prediction.odds_bets) ? prediction.odds_bets[0] : prediction.odds_bets;
      }

      // Calculate if prediction was correct
      let predictionCorrect = false;
      let spreadCovered = null;
      let recommendationResult = null;

      if (prediction) {
        // Check if predicted winner matches actual winner
        predictionCorrect = prediction.predicted_winner === result.winner;

        // Check spread result if there was a recommended bet
        if (prediction.recommended_bet && odds) {
          // Parse spreads - they're stored as TEXT with +/- signs (e.g., "-14", "+7.5")
          const homeSpreadStr = odds.home_spread || '0';
          const awaySpreadStr = odds.away_spread || '0';
          const homeSpread = parseFloat(homeSpreadStr.replace(/[^\d.-]/g, '')) || 0;
          const awaySpread = parseFloat(awaySpreadStr.replace(/[^\d.-]/g, '')) || 0;
          const actualMargin = result.home_score - result.away_score;

          if (prediction.recommended_bet === 'home_spread') {
            // Home team spread bet
            // If homeSpread is negative (e.g., -14), home is favored by 14, we need home to win by > 14
            // If homeSpread is positive (e.g., +8.5), home is getting 8.5 points, we need (home_score + 8.5) > away_score OR home wins
            if (homeSpread < 0) {
              // Home team is favored (e.g., Rams -14)
              // We win if home team wins by MORE than |homeSpread|
              const requiredMargin = Math.abs(homeSpread);
              if (actualMargin > requiredMargin) {
                spreadCovered = 'win';
                recommendationResult = 'win';
              } else if (actualMargin === requiredMargin) {
                spreadCovered = 'push';
                recommendationResult = 'push';
              } else {
                spreadCovered = 'loss';
                recommendationResult = 'loss';
              }
            } else {
              // Home team is getting points (underdog, e.g., Titans +8.5)
              // We win if (home_score + homeSpread) > away_score OR home wins
              if (result.home_score > result.away_score) {
                // Home won - bet wins
                spreadCovered = 'win';
                recommendationResult = 'win';
              } else if ((result.home_score + homeSpread) > result.away_score) {
                // Home lost but with spread they win - bet wins
                spreadCovered = 'win';
                recommendationResult = 'win';
              } else if ((result.home_score + homeSpread) === result.away_score) {
                // Exactly the spread - push
                spreadCovered = 'push';
                recommendationResult = 'push';
              } else {
                // Home lost by more than the spread - bet loses
                spreadCovered = 'loss';
                recommendationResult = 'loss';
              }
            }
          } else if (prediction.recommended_bet === 'away_spread') {
            // Away team spread bet
            // awaySpread can be negative (away favored) or positive (away getting points)
            // If awaySpread is negative (e.g., -3.0), away is favored by 3, we need away to win by > 3
            // If awaySpread is positive (e.g., +8.5), away is getting 8.5 points, we need (home_score - away_score) < 8.5 OR away wins
            if (awaySpread < 0) {
              // Away team is favored (e.g., Colts -3.0)
              // We bet away team to win by more than |awaySpread|
              const requiredMargin = Math.abs(awaySpread);
              if (result.away_score > result.home_score) {
                // Away won - check if they won by enough
                const awayMargin = result.away_score - result.home_score;
                if (awayMargin > requiredMargin) {
                  spreadCovered = 'win';
                  recommendationResult = 'win';
                } else if (awayMargin === requiredMargin) {
                  spreadCovered = 'push';
                  recommendationResult = 'push';
                } else {
                  spreadCovered = 'loss';
                  recommendationResult = 'loss';
                }
              } else {
                // Away lost - bet loses
                spreadCovered = 'loss';
                recommendationResult = 'loss';
              }
            } else {
              // Away team is getting points (underdog, e.g., Dolphins +8.5)
              // We win if away loses by less than awaySpread OR away wins
              if (result.away_score > result.home_score) {
                // Away team won - bet wins
                spreadCovered = 'win';
                recommendationResult = 'win';
              } else if (actualMargin < awaySpread) {
                // Away lost but by less than the spread - bet wins
                spreadCovered = 'win';
                recommendationResult = 'win';
              } else if (actualMargin === awaySpread) {
                // Exactly the spread - push
                spreadCovered = 'push';
                recommendationResult = 'push';
              } else {
                // Away lost by more than the spread - bet loses
                spreadCovered = 'loss';
                recommendationResult = 'loss';
              }
            }
          } else if (prediction.recommended_bet === 'home_ml') {
            // Home moneyline bet
            recommendationResult = result.winner === result.home_team ? 'win' : 'loss';
          } else if (prediction.recommended_bet === 'away_ml') {
            // Away moneyline bet
            recommendationResult = result.winner === result.away_team ? 'win' : 'loss';
          }
        }
      }

      return {
        ...result,
        prediction: prediction ? {
          id: prediction.id,
          predicted_winner: prediction.predicted_winner,
          predicted_spread: prediction.predicted_spread,
          confidence_score: prediction.confidence_score,
          recommended_bet: prediction.recommended_bet,
          reasoning: prediction.reasoning,
          correct: predictionCorrect,
        } : null,
        recommendation_result: recommendationResult,
        spread_covered: spreadCovered,
        odds_bets: odds,
      };
    }));

    // Calculate overall record
    const record = processedResults.reduce((acc: any, result: any) => {
      if (result.recommendation_result === 'win') acc.wins++;
      else if (result.recommendation_result === 'loss') acc.losses++;
      else if (result.recommendation_result === 'push') acc.pushes++;
      return acc;
    }, { wins: 0, losses: 0, pushes: 0 });

    console.log(`✅ Found ${processedResults.length} game results`);
    console.log(`   Record: ${record.wins}-${record.losses}-${record.pushes}\n`);

    return NextResponse.json({
      success: true,
      results: processedResults,
      record,
      total: processedResults.length,
    });
  } catch (error) {
    console.error('Error fetching game results:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      results: [],
      record: { wins: 0, losses: 0, pushes: 0 },
      total: 0,
    }, { status: 500 });
  }
}

