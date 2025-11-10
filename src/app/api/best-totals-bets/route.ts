import { NextResponse } from 'next/server';
import { getBestTotalsBets } from '@/lib/predictTotals';

export const dynamic = 'force-dynamic';

/**
 * GET /api/best-totals-bets
 * 
 * Returns the best Over/Under betting opportunities based on stored predictions
 * 
 * Query params:
 *   - limit: number of bets to return (optional, default: 5, max: 20)
 *   - week: filter by week number (optional)
 *   - season: filter by season (optional)
 * 
 * @example
 * GET /api/best-totals-bets?limit=5&week=10
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const weekParam = searchParams.get('week');
    const seasonParam = searchParams.get('season');
    
    const limit = limitParam ? Math.min(parseInt(limitParam), 20) : 5;
    const week = weekParam ? parseInt(weekParam) : undefined;
    const season = seasonParam ? parseInt(seasonParam) : undefined;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 BEST TOTALS BETS REQUEST`);
    console.log(`   Limit: ${limit}`);
    if (week) console.log(`   Week: ${week}`);
    if (season) console.log(`   Season: ${season}`);
    console.log(`${'='.repeat(60)}\n`);

    const predictions = await getBestTotalsBets(limit, week, season);

    console.log(`✅ Found ${predictions.length} recommended totals bets\n`);

    return NextResponse.json(
      {
        success: true,
        message: `Found ${predictions.length} recommended Over/Under bets`,
        predictions,
        count: predictions.length,
        generated_at: new Date().toISOString(),
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        }
      }
    );
  } catch (error) {
    console.error('Best totals bets endpoint error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

