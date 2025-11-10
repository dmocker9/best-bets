import { NextResponse } from 'next/server';
import { getBestPlayerPropRecommendations, getPropRecommendationsFromDatabase } from '@/lib/predictPlayerProps';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam || '20'), 50);

    // Fast path: read precomputed recommendations if available
    let recs = await getPropRecommendationsFromDatabase(limit);
    if (!recs || recs.length === 0) {
      // Fallback: compute on-the-fly
      recs = await getBestPlayerPropRecommendations(limit);
    }

    return NextResponse.json({
      success: true,
      message: recs.length > 0 ? `Found ${recs.length} prop opportunities` : 'No prop opportunities found',
      recommendations: recs,
      generated_at: new Date().toISOString(),
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendations: [],
      generated_at: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}


