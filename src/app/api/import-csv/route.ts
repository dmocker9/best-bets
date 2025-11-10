import { NextResponse } from 'next/server';
import { importCSVTeamData } from '@/lib/importCSVData';

export const dynamic = 'force-dynamic';

/**
 * POST /api/import-csv
 * 
 * Import NFL team stats from CSV data
 * 
 * Body:
 *   - csvData: string (CSV content)
 *   - week: number (optional, default: 9)
 *   - season: number (optional, default: 2025)
 * 
 * @example
 * POST /api/import-csv
 * {
 *   "csvData": "Tm,W,L,T,...\nPhiladelphia Eagles,6,2,0,...",
 *   "week": 9,
 *   "season": 2025
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { csvData, week = 9, season = 2025 } = body;

    if (!csvData) {
      return NextResponse.json(
        {
          success: false,
          message: 'CSV data is required',
          imported: 0,
          failed: 0,
          errors: ['No CSV data provided'],
        },
        { status: 400 }
      );
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📥 CSV IMPORT REQUEST - Week ${week}, ${season} Season`);
    console.log(`${'='.repeat(60)}\n`);

    const result = await importCSVTeamData(csvData, week, season);

    console.log(`\n✅ Import complete:`);
    console.log(`   ${result.imported} teams imported`);
    console.log(`   ${result.failed} teams failed\n`);

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('CSV import endpoint error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        imported: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      },
      { status: 500 }
    );
  }
}


