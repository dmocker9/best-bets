import { NextResponse } from 'next/server';
import { generateAllPropPredictions } from '@/lib/predictPlayerProps';

export const dynamic = 'force-dynamic';

/**
 * POST /api/generate-prop-predictions
 * 
 * Generates and saves player prop predictions for a given week
 * 
 * Query params:
 *   - week: NFL week number (required)
 *   - season: NFL season year (optional, defaults to current year)
 * 
 * @example
 * POST /api/generate-prop-predictions?week=11&season=2025
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');
    const seasonParam = searchParams.get('season');
    
    if (!weekParam) {
      return NextResponse.json(
        {
          success: false,
          message: 'Week parameter is required',
          error: 'Missing week parameter'
        },
        { status: 400 }
      );
    }
    
    const week = parseInt(weekParam);
    const season = seasonParam ? parseInt(seasonParam) : new Date().getFullYear();
    
    if (isNaN(week) || week < 1 || week > 18) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid week number (must be 1-18)',
          error: 'Invalid week parameter'
        },
        { status: 400 }
      );
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 GENERATING PROP PREDICTIONS - Week ${week}, ${season}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Generate predictions
    const result = await generateAllPropPredictions(week, season);
    
    console.log(`\n✅ Generation complete:`);
    console.log(`   Total props analyzed: ${result.total}`);
    console.log(`   Saved predictions: ${result.saved}`);
    console.log(`   Failed: ${result.failed}\n`);
    
    return NextResponse.json({
      success: true,
      message: `Generated player prop predictions for Week ${week}. Saved ${result.saved} recommendations.`,
      total: result.total,
      saved: result.saved,
      failed: result.failed,
      week: week,
      season: season,
    });
  } catch (error) {
    console.error('Generate prop predictions error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to generate prop predictions',
        error: error instanceof Error ? error.message : 'Unknown error',
        total: 0,
        saved: 0,
        failed: 0,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate-prop-predictions
 * 
 * Alternative method using GET (for easier browser testing)
 */
export async function GET(request: Request) {
  return POST(request);
}

