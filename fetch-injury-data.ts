/**
 * Fetch NFL Injury Data from ESPN API
 * Display categorized by team with player importance ratings
 * Save to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

/**
 * Initialize Supabase client
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

interface InjuryData {
  playerName: string;
  position: string;
  status: string; // Out, Questionable, Doubtful, etc.
  injuryType?: string;
  details?: string;
  importance: 'Critical' | 'High' | 'Medium' | 'Low';
  importanceScore: number;
}

interface TeamInjuryReport {
  teamName: string;
  totalInjuries: number;
  criticalInjuries: number;
  injuries: InjuryData[];
}

/**
 * Determine player importance based on position and status
 */
function calculateImportance(position: string, status: string): { importance: 'Critical' | 'High' | 'Medium' | 'Low', score: number } {
  let positionScore = 0;
  let statusScore = 0;
  
  // Position importance
  const pos = position.toUpperCase();
  if (pos === 'QB') positionScore = 100;
  else if (['RB', 'WR', 'TE'].includes(pos)) positionScore = 80;
  else if (['LT', 'RT', 'C', 'LG', 'RG'].includes(pos)) positionScore = 70; // O-Line
  else if (['DE', 'DT', 'NT'].includes(pos)) positionScore = 65; // D-Line
  else if (['LB', 'MLB', 'OLB', 'ILB'].includes(pos)) positionScore = 60;
  else if (['CB', 'S', 'FS', 'SS'].includes(pos)) positionScore = 60; // Secondary
  else if (pos === 'K') positionScore = 40;
  else if (pos === 'P') positionScore = 30;
  else positionScore = 50; // Generic
  
  // Status importance
  const stat = status.toUpperCase();
  if (stat.includes('OUT') || stat === 'O') statusScore = 100;
  else if (stat.includes('DOUBTFUL') || stat === 'D') statusScore = 75;
  else if (stat.includes('QUESTIONABLE') || stat === 'Q') statusScore = 50;
  else if (stat.includes('IR') || stat.includes('INJURED RESERVE')) statusScore = 100;
  else if (stat.includes('PUP')) statusScore = 90;
  else statusScore = 25;
  
  // Combined score (weighted: 60% position, 40% status)
  const totalScore = (positionScore * 0.6) + (statusScore * 0.4);
  
  let importance: 'Critical' | 'High' | 'Medium' | 'Low';
  if (totalScore >= 85) importance = 'Critical';
  else if (totalScore >= 70) importance = 'High';
  else if (totalScore >= 50) importance = 'Medium';
  else importance = 'Low';
  
  return { importance, score: totalScore };
}

/**
 * Fetch all NFL teams
 */
async function fetchNFLTeams(): Promise<{ id: string; name: string; abbreviation: string }[]> {
  try {
    console.log('📡 Fetching NFL teams...\n');
    const response = await fetch(`${ESPN_API_BASE}/teams`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`ESPN API failed: ${response.status}`);
    }

    const data = await response.json();
    const teams = data.sports?.[0]?.leagues?.[0]?.teams || [];
    
    return teams.map((t: any) => ({
      id: t.team.id,
      name: t.team.displayName,
      abbreviation: t.team.abbreviation,
    }));
  } catch (error) {
    console.error('❌ Error fetching teams:', error);
    throw error;
  }
}

/**
 * Fetch injuries for a specific team
 */
async function fetchTeamInjuries(teamId: string, teamName: string): Promise<InjuryData[]> {
  try {
    // Try the team roster endpoint with injury info
    const response = await fetch(
      `${ESPN_API_BASE}/teams/${teamId}?enable=roster`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const injuries: InjuryData[] = [];
    
    // Check athletes in the roster for injury info
    const athletes = data.team?.athletes || [];
    
    for (const athlete of athletes) {
      const injuryStatus = athlete.injuries || athlete.injury;
      
      if (injuryStatus && injuryStatus.length > 0) {
        for (const injury of injuryStatus) {
          const status = injury.status || injury.type || 'Unknown';
          const position = athlete.position?.abbreviation || 'Unknown';
          const { importance, score } = calculateImportance(position, status);
          
          injuries.push({
            playerName: athlete.displayName || athlete.fullName,
            position,
            status,
            injuryType: injury.longComment || injury.type || 'Unknown',
            details: injury.details,
            importance,
            importanceScore: score,
          });
        }
      }
    }
    
    return injuries;
  } catch (error) {
    console.log(`   ⚠️  Error fetching injuries for ${teamName}:`, error);
    return [];
  }
}

/**
 * Try alternate injury API endpoint
 */
async function fetchAllInjuries(): Promise<Map<string, InjuryData[]>> {
  const injuryMap = new Map<string, InjuryData[]>();
  
  try {
    // Try scoreboard endpoint which sometimes includes injuries
    const response = await fetch(
      `${ESPN_API_BASE}/scoreboard`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      return injuryMap;
    }

    const data = await response.json();
    const events = data.events || [];
    
    for (const event of events) {
      const competition = event.competitions?.[0];
      if (!competition) continue;
      
      for (const competitor of competition.competitors || []) {
        const teamName = competitor.team?.displayName;
        if (!teamName) continue;
        
        const injuries: InjuryData[] = [];
        const notes = competitor.notes || [];
        
        // Check for injury notes
        for (const note of notes) {
          if (note.type === 'injury') {
            // Parse injury info from note
            console.log(`Found injury note for ${teamName}:`, note);
          }
        }
        
        if (injuries.length > 0) {
          injuryMap.set(teamName, injuries);
        }
      }
    }
    
    return injuryMap;
  } catch (error) {
    console.log('   ⚠️  Error fetching injury data from scoreboard');
    return injuryMap;
  }
}

/**
 * Display injury report
 */
function displayInjuryReport(report: TeamInjuryReport) {
  const criticalEmoji = report.criticalInjuries > 0 ? '🚨' : '✅';
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${criticalEmoji} ${report.teamName} - ${report.totalInjuries} Injuries (${report.criticalInjuries} Critical)`);
  console.log(`${'='.repeat(80)}`);
  
  if (report.injuries.length === 0) {
    console.log('   ✅ No reported injuries');
    return;
  }
  
  // Group by importance
  const critical = report.injuries.filter(i => i.importance === 'Critical');
  const high = report.injuries.filter(i => i.importance === 'High');
  const medium = report.injuries.filter(i => i.importance === 'Medium');
  const low = report.injuries.filter(i => i.importance === 'Low');
  
  if (critical.length > 0) {
    console.log('\n   🚨 CRITICAL INJURIES:');
    critical.forEach(inj => {
      console.log(`      • ${inj.playerName.padEnd(25)} ${inj.position.padEnd(4)} | ${inj.status.padEnd(12)} | ${inj.injuryType}`);
    });
  }
  
  if (high.length > 0) {
    console.log('\n   ⚠️  HIGH IMPACT:');
    high.forEach(inj => {
      console.log(`      • ${inj.playerName.padEnd(25)} ${inj.position.padEnd(4)} | ${inj.status.padEnd(12)} | ${inj.injuryType}`);
    });
  }
  
  if (medium.length > 0) {
    console.log('\n   ℹ️  MEDIUM IMPACT:');
    medium.forEach(inj => {
      console.log(`      • ${inj.playerName.padEnd(25)} ${inj.position.padEnd(4)} | ${inj.status.padEnd(12)} | ${inj.injuryType}`);
    });
  }
  
  if (low.length > 0) {
    console.log('\n   🟢 LOW IMPACT:');
    low.forEach(inj => {
      console.log(`      • ${inj.playerName.padEnd(25)} ${inj.position.padEnd(4)} | ${inj.status.padEnd(12)} | ${inj.injuryType}`);
    });
  }
}

/**
 * Save injuries to Supabase
 */
async function saveInjuriesToSupabase(supabase: any, allReports: TeamInjuryReport[]): Promise<void> {
  console.log('\n💾 Saving injury data to Supabase...\n');
  
  // Clear existing data for 2025 season
  const { error: deleteError } = await supabase
    .from('team_injuries')
    .delete()
    .eq('season', 2025);
  
  if (deleteError) {
    console.log('   ⚠️  Warning: Could not clear existing data:', deleteError.message);
  } else {
    console.log('   ✅ Cleared existing 2025 season injury data');
  }
  
  let savedCount = 0;
  let errorCount = 0;
  
  // Insert all injuries
  for (const report of allReports) {
    for (const injury of report.injuries) {
      const injuryRecord = {
        team_name: report.teamName,
        player_name: injury.playerName,
        position: injury.position,
        status: injury.status,
        injury_type: injury.injuryType,
        injury_details: injury.details,
        importance: injury.importance,
        importance_score: injury.importanceScore.toFixed(1),
        season: 2025,
      };
      
      const { error } = await supabase
        .from('team_injuries')
        .insert(injuryRecord);
      
      if (error) {
        if (!error.message.includes('duplicate key')) {
          errorCount++;
        }
      } else {
        savedCount++;
      }
    }
  }
  
  console.log(`\n✅ Saved ${savedCount} injury records to Supabase`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} errors occurred`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🏈 NFL Injury Report Fetcher & Supabase Saver');
  console.log('='.repeat(80));
  console.log('Fetching injury data from ESPN API...\n');

  try {
    // Initialize Supabase
    const supabase = getSupabaseClient();
    console.log('✅ Connected to Supabase\n');
    // First, try to get all injuries from scoreboard
    console.log('🔍 Checking scoreboard for injury data...\n');
    const scoreboardInjuries = await fetchAllInjuries();
    
    // Fetch all teams
    const teams = await fetchNFLTeams();
    console.log(`✅ Found ${teams.length} NFL teams\n`);
    
    console.log('📊 Fetching injury reports for each team...\n');
    
    const allReports: TeamInjuryReport[] = [];
    
    for (const team of teams) {
      process.stdout.write(`   ⏳ Checking ${team.name}...`);
      
      const injuries = await fetchTeamInjuries(team.id, team.name);
      
      if (injuries.length > 0) {
        process.stdout.write(` ⚠️  ${injuries.length} injuries found\n`);
      } else {
        process.stdout.write(` ✅ No injuries\n`);
      }
      
      const criticalCount = injuries.filter(i => i.importance === 'Critical').length;
      
      allReports.push({
        teamName: team.name,
        totalInjuries: injuries.length,
        criticalInjuries: criticalCount,
        injuries: injuries.sort((a, b) => b.importanceScore - a.importanceScore),
      });
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    // Display all reports
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 FULL INJURY REPORTS BY TEAM');
    console.log('='.repeat(80));
    
    // First show teams with injuries
    const teamsWithInjuries = allReports.filter(r => r.totalInjuries > 0);
    const teamsWithoutInjuries = allReports.filter(r => r.totalInjuries === 0);
    
    if (teamsWithInjuries.length > 0) {
      console.log(`\n🚨 Teams with Injuries: ${teamsWithInjuries.length}`);
      
      // Sort by critical injuries first, then total
      teamsWithInjuries
        .sort((a, b) => {
          if (b.criticalInjuries !== a.criticalInjuries) {
            return b.criticalInjuries - a.criticalInjuries;
          }
          return b.totalInjuries - a.totalInjuries;
        })
        .forEach(report => {
          displayInjuryReport(report);
        });
    }
    
    if (teamsWithoutInjuries.length > 0) {
      console.log(`\n\n✅ Teams with No Reported Injuries: ${teamsWithoutInjuries.length}`);
      teamsWithoutInjuries.forEach(r => {
        console.log(`   • ${r.teamName}`);
      });
    }
    
    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 INJURY SUMMARY');
    console.log('='.repeat(80));
    
    const totalInjuries = allReports.reduce((sum, r) => sum + r.totalInjuries, 0);
    const totalCritical = allReports.reduce((sum, r) => sum + r.criticalInjuries, 0);
    const teamsWithCritical = allReports.filter(r => r.criticalInjuries > 0).length;
    
    console.log(`\nTotal Injuries Across NFL: ${totalInjuries}`);
    console.log(`Critical Injuries: ${totalCritical}`);
    console.log(`Teams with Critical Injuries: ${teamsWithCritical}`);
    console.log(`Teams with Any Injuries: ${teamsWithInjuries.length}`);
    console.log(`Healthy Teams: ${teamsWithoutInjuries.length}`);
    
    // Save to Supabase
    await saveInjuriesToSupabase(supabase, allReports);
    
    console.log('\n✅ Injury data fetch and save complete!\n');
    
    if (totalInjuries === 0) {
      console.log('⚠️  NOTE: No injury data was found from the ESPN API.');
      console.log('This could mean:');
      console.log('   1. The API endpoint structure has changed');
      console.log('   2. Injury data is in a different endpoint');
      console.log('   3. Injury data requires authentication');
      console.log('\nYou may want to explore alternative data sources like:');
      console.log('   - NFL.com injury reports');
      console.log('   - Pro Football Reference');
      console.log('   - Sports data APIs (The Odds API, SportsRadar, etc.)');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();

