import { createClient } from '@supabase/supabase-js';
import { NFLTeamStats } from './fetchNFLStats';

// Initialize Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

interface CSVTeamData {
  Tm: string;
  W: string;
  L: string;
  T: string;
  'W-L%': string;
  PF: string;
  PA: string;
  PD: string;
  MoV: string;
  SoS: string;
  SRS: string;
  OSRS: string;
  DSRS: string;
}

/**
 * Parse CSV data and import into database
 */
export async function importCSVTeamData(
  csvData: string,
  weekNumber: number = 9,
  seasonYear: number = 2025
): Promise<{
  success: boolean;
  message: string;
  imported: number;
  failed: number;
  errors: string[];
}> {
  const supabase = getSupabaseClient();
  const result = {
    success: true,
    message: '',
    imported: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📥 IMPORTING NFL TEAM STATS FROM CSV`);
    console.log(`   Week ${weekNumber}, ${seasonYear} Season`);
    console.log(`${'='.repeat(70)}\n`);

    // Parse CSV
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',');
    
    console.log(`📊 CSV Headers: ${headers.join(', ')}`);
    console.log(`📦 Found ${lines.length - 1} teams in CSV\n`);

    // Process each team (skip header row)
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      
      if (values.length < 13) {
        console.log(`⚠️  Skipping row ${i}: insufficient data`);
        continue;
      }

      const teamName = values[0].trim();
      
      try {
        console.log(`🏈 Processing: ${teamName}`);

        // Parse all values
        const wins = parseInt(values[1]) || 0;
        const losses = parseInt(values[2]) || 0;
        const ties = parseInt(values[3]) || 0;
        const winPct = parseFloat(values[4]) || 0;
        const pointsFor = parseInt(values[5]) || 0;
        const pointsAgainst = parseInt(values[6]) || 0;
        const pointDiff = parseInt(values[7]) || 0;
        const mov = parseFloat(values[8]) || 0;
        const sos = parseFloat(values[9]) || 0;
        const srs = parseFloat(values[10]) || 0;
        const osrs = parseFloat(values[11]) || 0;
        const dsrs = parseFloat(values[12]) || 0;

        const gamesPlayed = wins + losses + ties;

        // Calculate per-game stats
        const ppg = gamesPlayed > 0 ? pointsFor / gamesPlayed : 0;
        const pag = gamesPlayed > 0 ? pointsAgainst / gamesPlayed : 0;

        console.log(`   Record: ${wins}-${losses}-${ties} (${(winPct * 100).toFixed(1)}%)`);
        console.log(`   PPG: ${ppg.toFixed(2)} | PA/G: ${pag.toFixed(2)}`);
        console.log(`   Ratings: Off ${osrs.toFixed(2)} | Def ${dsrs.toFixed(2)} | SoS ${sos.toFixed(2)}`);

        // Build stats object for auto_nfl_team_stats table
        // Note: points_per_game will be auto-calculated by database trigger
        const stats = {
          team_name: teamName,
          week: weekNumber,
          season: seasonYear,
          
          // Basic record
          wins,
          losses,
          ties,
          win_percentage: winPct,
          
          // Scoring stats (store as season totals)
          // points_per_game and points_allowed_per_game are auto-calculated by trigger
          points_for: pointsFor,
          points_against: pointsAgainst,
          point_differential: pointDiff,
          margin_of_victory: mov,
          
          // Advanced metrics (map to SRS column names)
          strength_of_schedule: sos,
          srs: srs,
          offensive_srs: osrs,
          defensive_srs: dsrs,
        };

        // Upsert to auto_nfl_team_stats table
        const { error } = await supabase
          .from('auto_nfl_team_stats')
          .upsert(stats, {
            onConflict: 'team_name,season,week',
            ignoreDuplicates: false,
          });

        if (error) {
          throw error;
        }

        result.imported++;
        console.log(`   ✅ Imported successfully\n`);
      } catch (error) {
        result.failed++;
        const errorMsg = `Failed to import ${teamName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}\n`);
      }
    }

    console.log(`${'='.repeat(70)}`);
    console.log(`📈 IMPORT RESULTS:`);
    console.log(`   ✅ Imported: ${result.imported} teams`);
    console.log(`   ❌ Failed: ${result.failed} teams`);
    console.log(`${'='.repeat(70)}\n`);

    result.message = `Successfully imported ${result.imported} teams${result.failed > 0 ? `, ${result.failed} failed` : ''}`;
    result.success = result.imported > 0;

    return result;
  } catch (error) {
    result.success = false;
    result.message = `Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(result.message);
    console.error(`❌ ${result.message}`);
    return result;
  }
}

/**
 * Import from CSV file content
 */
export async function importFromCSVFile(
  csvContent: string,
  weekNumber?: number,
  seasonYear?: number
) {
  const week = weekNumber || 9;
  const season = seasonYear || 2025;
  
  return importCSVTeamData(csvContent, week, season);
}

