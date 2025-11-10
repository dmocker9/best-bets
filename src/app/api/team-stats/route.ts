import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

/**
 * GET /api/team-stats
 * 
 * Fetches team statistics from auto_nfl_team_stats table
 * 
 * Query params:
 *   - team: team name (required)
 *   - week: week number (optional)
 *   - season: season year (optional, defaults to 2025)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get('team');
    const week = searchParams.get('week');
    const season = searchParams.get('season') || '2025';
    
    if (!team) {
      return NextResponse.json(
        {
          success: false,
          message: 'Team name is required',
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('auto_nfl_team_stats')
      .select('*')
      .eq('team_name', team)
      .eq('season', parseInt(season));
    
    if (week) {
      query = query.eq('week', parseInt(week));
    }
    
    query = query.order('week', { ascending: false }).limit(1);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching team stats:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Error fetching team stats',
          error: error.message,
        },
        { status: 500 }
      );
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `No stats found for ${team}`,
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        success: true,
        stats: data[0],
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        }
      }
    );
  } catch (error) {
    console.error('Team stats endpoint error:', error);
    
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

