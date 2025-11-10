import { NextResponse } from 'next/server';
import { getBestPlayerPropRecommendations, savePropRecommendations } from '@/lib/predictPlayerProps';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam || '200'), 500);

    const recs = await getBestPlayerPropRecommendations(limit);
    const result = await savePropRecommendations(recs);

    return NextResponse.json({
      success: true,
      message: `Computed ${recs.length} recommendations, saved ${result.inserted}`,
      computed: recs.length,
      saved: result.inserted,
      generated_at: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      generated_at: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}






