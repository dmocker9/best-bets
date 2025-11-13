import { NextResponse } from 'next/server';
import { getBestPropBets } from '@/lib/predictPlayerProps';

export const dynamic = 'force-dynamic';

interface BestPropBetsResponse {
  success: boolean;
  message: string;
  predictions: any[];
  total: number;
  generated_at: string;
}

/**
 * GET /api/best-prop-bets
 * 
 * Returns the top recommended player prop bets from stored predictions
 * 
 * Query params:
 *   - limit: number of bets to return (default: 10, max: 50)
 *   - week: filter by week number (optional)
 *   - season: filter by season (optional)
 *   - position: filter by position (optional: QB, RB, WR, TE)
 *   - market: filter by prop market (optional: player_pass_yds, player_rush_yds, etc.)
 * 
 * @example
 * GET /api/best-prop-bets?limit=15
 * GET /api/best-prop-bets?week=11&season=2025&position=QB
 * GET /api/best-prop-bets?market=player_reception_yds
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const weekParam = searchParams.get('week');
    const seasonParam = searchParams.get('season');
    const positionParam = searchParams.get('position');
    const marketParam = searchParams.get('market');
    
    const limit = Math.min(parseInt(limitParam || '10'), 50);
    const week = weekParam ? parseInt(weekParam) : undefined;
    const season = seasonParam ? parseInt(seasonParam) : undefined;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 BEST PROP BETS REQUEST - Top ${limit}`);
    if (week) console.log(`   Week: ${week}`);
    if (season) console.log(`   Season: ${season}`);
    if (positionParam) console.log(`   Position: ${positionParam}`);
    if (marketParam) console.log(`   Market: ${marketParam}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Get best prop bets from database (fetch more to allow for deduplication)
    let predictions = await getBestPropBets(limit * 3, week, season);
    
    // Apply additional filters if provided
    if (positionParam) {
      predictions = predictions.filter(
        p => p.position.toUpperCase() === positionParam.toUpperCase()
      );
    }
    
    if (marketParam) {
      predictions = predictions.filter(
        p => p.prop_market === marketParam
      );
    }
    
    // Calculate quality score and sort by best overall value
    predictions = predictions
      .map(p => ({
        ...p,
        quality_score: p.confidence_score * Math.min(Math.abs(p.value_score || 0), 10)
      }))
      .sort((a, b) => b.quality_score - a.quality_score);
    
    // DEDUPLICATE: Keep only the best prop for each player
    const seenPlayers = new Set<string>();
    const uniquePredictions = predictions.filter(p => {
      if (seenPlayers.has(p.player_name)) {
        return false; // Skip this player, we already have their best prop
      }
      seenPlayers.add(p.player_name);
      return true; // Keep this (first/best prop for this player)
    });
    
    // Take top 10 unique players
    predictions = uniquePredictions.slice(0, limit);
    
    console.log(`\n✅ Retrieved ${predictions.length} unique player prop recommendations\n`);
    
    // Format predictions for response
    const formattedPredictions = predictions.map(pred => ({
      player_name: pred.player_name,
      team: pred.team,
      opponent: pred.opponent,
      position: pred.position,
      prop_market: formatPropMarket(pred.prop_market),
      prop_line: pred.prop_line,
      predicted_value: pred.predicted_value,
      recommended_bet: pred.recommended_bet,
      confidence_score: pred.confidence_score,
      value_score: pred.value_score,
      odds: pred.odds,
      reasoning: pred.reasoning,
      breakdown: pred.breakdown,
      week_number: pred.week_number,
      season: pred.season,
      quality_score: pred.quality_score,
      // Add formatted display strings
      display_line: `${pred.recommended_bet} ${pred.prop_line}`,
      display_edge: `${pred.value_score >= 0 ? '+' : ''}${pred.value_score.toFixed(1)}`,
      bet_strength: getBetStrength(pred.confidence_score, Math.abs(pred.value_score))
    }));
    
    const response: BestPropBetsResponse = {
      success: true,
      message: predictions.length > 0
        ? `Found ${predictions.length} recommended player prop bet${predictions.length > 1 ? 's' : ''}`
        : week
        ? `No prop bets meet our criteria for Week ${week}. The model is conservative and only recommends high-value plays.`
        : 'No prop predictions available. Generate predictions first.',
      predictions: formattedPredictions,
      total: predictions.length,
      generated_at: new Date().toISOString(),
    };
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });
  } catch (error) {
    console.error('Best prop bets endpoint error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        predictions: [],
        total: 0,
        generated_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/best-prop-bets
 * 
 * Alternative method to get best prop bets
 */
export async function POST(request: Request) {
  return GET(request);
}

/**
 * Helper: Format prop market for display
 */
function formatPropMarket(market: string): string {
  const marketMap: Record<string, string> = {
    'player_pass_yds': 'Passing Yards',
    'player_pass_tds': 'Passing TDs',
    'player_pass_attempts': 'Pass Attempts',
    'player_pass_completions': 'Completions',
    'player_rush_yds': 'Rushing Yards',
    'player_rush_attempts': 'Rush Attempts',
    'player_reception_yds': 'Receiving Yards',
    'player_receptions': 'Receptions',
    'player_anytime_td': 'Anytime TD',
  };
  
  return marketMap[market] || market;
}

/**
 * Helper: Determine bet strength tier
 */
function getBetStrength(confidence: number, valueScore: number): string {
  if (confidence >= 75 && valueScore >= 5) {
    return 'elite';
  } else if (confidence >= 70 && valueScore >= 4) {
    return 'strong';
  } else if (confidence >= 65 && valueScore >= 3) {
    return 'good';
  } else {
    return 'value';
  }
}

