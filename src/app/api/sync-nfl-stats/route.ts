import { NextResponse } from 'next/server';
import { syncNFLTeamStats } from '@/lib/fetchNFLStats';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync-nfl-stats
 * 
 * Syncs NFL team statistics from ESPN API
 * 
 * Query params:
 *   - week: week number (default: current week)
 *   - season: season year (default: current year)
 * 
 * @example
 * GET /api/sync-nfl-stats?week=9&season=2025
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');
    const seasonParam = searchParams.get('season');
    
    const week = weekParam ? parseInt(weekParam) : 9;
    const season = seasonParam ? parseInt(seasonParam) : 2025;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 SYNCING NFL TEAM STATS - Week ${week}, ${season} Season`);
    console.log(`${'='.repeat(60)}\n`);

    const result = await syncNFLTeamStats(week, season);

    console.log(`\n✅ Sync complete:`);
    console.log(`   ${result.synced} teams synced`);
    console.log(`   ${result.realDataCount} with REAL data`);
    console.log(`   ${result.estimatedCount} with estimated data`);
    console.log(`   ${result.failed} teams failed\n`);

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('NFL stats sync error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        synced: 0,
        failed: 0,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync-nfl-stats
 */
export async function POST(request: Request) {
  return GET(request);
}

