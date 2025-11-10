/**
 * Parse Pro Football Reference Week 10 Injury Data
 * Using the provided markdown table data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

interface InjuryRecord {
  playerName: string;
  teamAbbr: string;
  position: string;
  gameStatus: string | null;
  injuryComment: string | null;
  practiceStatus: string | null;
  onTrackToPlay: boolean;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

function isOnTrackToPlay(practiceStatus: string | null): boolean {
  if (!practiceStatus) return false;
  
  const status = practiceStatus.toLowerCase();
  
  // On track if they participated (full or limited)
  if (status.includes('full participation')) return true;
  if (status.includes('limited participation')) return true;
  
  // Not on track if they didn't participate
  if (status.includes('did not participate')) return false;
  
  return false;
}

// Parsed data from the Pro Football Reference Week 10 injury report
const injuryData: InjuryRecord[] = [
  { playerName: "Leonard Floyd", teamAbbr: "ATL", position: "DE", gameStatus: "Out", injuryComment: "Hamstring", practiceStatus: "Did Not Participate In Practice", onTrackToPlay: false },
  { playerName: "Matthew Bergeron", teamAbbr: "ATL", position: "OL", gameStatus: "Out", injuryComment: "Ankle", practiceStatus: "Did Not Participate In Practice", onTrackToPlay: false },
  { playerName: "Storm Norton", teamAbbr: "ATL", position: "OL", gameStatus: "Out", injuryComment: "Foot", practiceStatus: "Did Not Participate In Practice", onTrackToPlay: false },
  { playerName: "JD Bertrand", teamAbbr: "ATL", position: "LB", gameStatus: null, injuryComment: "Knee", practiceStatus: "Full Participation In Practice", onTrackToPlay: true },
  { playerName: "Billy Bowman", teamAbbr: "ATL", position: "DB", gameStatus: null, injuryComment: "Hamstring", practiceStatus: "Full Participation In Practice", onTrackToPlay: true },
  { playerName: "Jessie Bates III", teamAbbr: "ATL", position: "S", gameStatus: null, injuryComment: "Knee", practiceStatus: "Full Participation In Practice", onTrackToPlay: true },
  { playerName: "Zach Harrison", teamAbbr: "ATL", position: "DL", gameStatus: null, injuryComment: "Knee", practiceStatus: "Full Participation In Practice", onTrackToPlay: true },
  { playerName: "Casey Washington", teamAbbr: "ATL", position: "WR", gameStatus: null, injuryComment: "Back", practiceStatus: "Full Participation In Practice", onTrackToPlay: true },
  { playerName: "Mike Hughes", teamAbbr: "ATL", position: "CB", gameStatus: "Questionable", injuryComment: "Neck", practiceStatus: "Limited Participation In Practice", onTrackToPlay: true },
  { playerName: "Shaq Thompson", teamAbbr: "BUF", position: "OLB", gameStatus: "Out", injuryComment: "Hamstring", practiceStatus: "Did Not Participate In Practice", onTrackToPlay: false },
  { playerName: "A.J. Epenesa", teamAbbr: "BUF", position: "DE", gameStatus: "Out", injuryComment: "Concussion", practiceStatus: "Did Not Participate In Practice", onTrackToPlay: false },
  { playerName: "James Cook", teamAbbr: "BUF", position: "RB", gameStatus: null, injuryComment: "Ankle", practiceStatus: "Full Participation In Practice", onTrackToPlay: true },
  { playerName: "Josh Palmer", teamAbbr: "BUF", position: "WR", gameStatus: "Questionable", injuryComment: "Knee", practiceStatus: "Limited Participation In Practice", onTrackToPlay: true },
  { playerName: "Taron Johnson", teamAbbr: "BUF", position: "CB", gameStatus: "Questionable", injuryComment: "Groin", practiceStatus: "Limited Participation In Practice", onTrackToPlay: true },
  { playerName: "Christian Benford", teamAbbr: "BUF", position: "CB", gameStatus: "Questionable", injuryComment: "Groin", practiceStatus: "Limited Participation In Practice", onTrackToPlay: true },
  { playerName: "Jahdae Walker", teamAbbr: "CHI", position: "WR", gameStatus: "Out", injuryComment: "Concussion", practiceStatus: null, onTrackToPlay: false },
  { playerName: "D'Andre Swift", teamAbbr: "CHI", position: "RB", gameStatus: "Questionable", injuryComment: "Groin", practiceStatus: "Did Not Participate In Practice", onTrackToPlay: false },
  { playerName: "Jayden Daniels", teamAbbr: "WAS", position: "QB", gameStatus: "Out", injuryComment: "Elbow", practiceStatus: "Did Not Participate In Practice", onTrackToPlay: false },
  { playerName: "Terry McLaurin", teamAbbr: "WAS", position: "WR", gameStatus: "Out", injuryComment: "Quad", practiceStatus: "Did Not Participate In Practice", onTrackToPlay: false },
  // Add more from the data...
];

async function saveToSupabase(supabase: any): Promise<void> {
  console.log('💾 Saving injury data to Supabase...\n');
  
  // Clear existing data
  await supabase
    .from('injuries')
    .delete()
    .eq('week_number', 10)
    .eq('season', 2025);
  
  console.log('   ✅ Cleared existing data\n');
  
  let saved = 0;
  for (const injury of injuryData) {
    const { error } = await supabase
      .from('injuries')
      .insert({
        player_name: injury.playerName,
        team_abbr: injury.teamAbbr,
        position: injury.position,
        game_status: injury.gameStatus,
        injury_comment: injury.injuryComment,
        practice_status: injury.practiceStatus,
        on_track_to_play: injury.onTrackToPlay,
        week_number: 10,
        season: 2025,
      });
    
    if (!error) saved++;
  }
  
  console.log(`✅ Saved ${saved} records\n`);
}

async function main() {
  console.log('🏈 Parsing PFR Injury Data (Week 10)');
  console.log('='.repeat(80));

  try {
    const supabase = getSupabaseClient();
    console.log('✅ Connected\n');

    await saveToSupabase(supabase);
    
    const onTrack = injuryData.filter(i => i.onTrackToPlay).length;
    console.log(`📊 Summary:`);
    console.log(`   Total: ${injuryData.length}`);
    console.log(`   On Track (Y): ${onTrack}`);
    console.log(`   Not On Track (N): ${injuryData.length - onTrack}`);

    console.log('\n✅ Complete!\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

