import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const dynamic = 'force-dynamic';

/**
 * GET /api/top-picks
 * 
 * Returns the game_id of the top pick (highest confidence) from each week
 * Used to identify "Bet of the Week" picks in the UI
 * 
 * Query params:
 *   - season: filter by season (default: 2025)
 *   - week: filter by specific week (optional)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const season = parseInt(searchParams.get('season') || '2025');
    const week = searchParams.get('week') ? parseInt(searchParams.get('week')!) : undefined;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all predictions with recommendations
    let query = supabase
      .from('spread_predictions')
      .select('game_id, week_number, confidence_score, recommended_bet')
      .eq('season', season)
      .neq('recommended_bet', 'none')
      .order('week_number', { ascending: true })
      .order('confidence_score', { ascending: false });

    if (week) {
      query = query.eq('week_number', week);
    }

    const { data: predictions, error } = await query;

    if (error) {
      throw error;
    }

    // Group by week and take only the top pick (highest confidence) per week
    const topPicksByWeek: Record<number, string> = {};
    (predictions || []).forEach((pred: any) => {
      if (!topPicksByWeek[pred.week_number]) {
        topPicksByWeek[pred.week_number] = pred.game_id;
      }
    });

    const topPickGameIds = Object.values(topPicksByWeek);

    return NextResponse.json({
      success: true,
      topPickGameIds,
      total: topPickGameIds.length,
    });
  } catch (error) {
    console.error('Error fetching top picks:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      topPickGameIds: [],
      total: 0,
    }, { status: 500 });
  }
}

