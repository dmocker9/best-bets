import { NextResponse } from 'next/server';
import { generateAndSaveTotalsPredictions } from '@/lib/predictTotals';

export const dynamic = 'force-dynamic';

/**
 * GET /api/generate-totals-predictions
 * 
 * Generates Over/Under predictions for all upcoming games and saves them to the database
 * 
 * Query params:
 *   - week: week number (required)
 *   - season: season year (optional, defaults to current year)
 * 
 * @example
 * GET /api/generate-totals-predictions?week=10&season=2025
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');
    const seasonParam = searchParams.get('season');
    
    if (!weekParam) {
      return NextResponse.json(
        {
          success: false,
          message: 'Week number is required',
          error: 'Missing week parameter',
        },
        { status: 400 }
      );
    }
    
    const week = parseInt(weekParam);
    const season = seasonParam ? parseInt(seasonParam) : new Date().getFullYear();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 GENERATE TOTALS PREDICTIONS REQUEST`);
    console.log(`   Week: ${week}`);
    console.log(`   Season: ${season}`);
    console.log(`${'='.repeat(60)}\n`);

    const result = await generateAndSaveTotalsPredictions(week, season);

    console.log(`\n✅ Totals prediction generation complete\n`);

    return NextResponse.json(
      {
        success: result.saved > 0,
        message: `Generated totals predictions for ${result.total} games. Saved ${result.saved}, failed ${result.failed}.`,
        total: result.total,
        saved: result.saved,
        failed: result.failed,
        week,
        season,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Generate totals predictions endpoint error:', error);
    
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

/**
 * POST /api/generate-totals-predictions
 * 
 * Alternative method to generate totals predictions
 */
export async function POST(request: Request) {
  return GET(request);
}

