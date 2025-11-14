/**
 * Update game result from ESPN API
 * Fetches the Packers vs Eagles game result and updates the game_results table
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ESPN API endpoints
const ESPN_NFL_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

interface ESPNGame {
  id: string;
  name: string;
  shortName: string;
  date: string;
  status: {
    type: {
      id: string;
      name: string;
      state: string;
      completed: boolean;
      description: string;
    };
  };
  competitions: Array<{
    id: string;
    date: string;
    competitors: Array<{
      id: string;
      team: {
        id: string;
        abbreviation: string;
        displayName: string;
        shortDisplayName: string;
      };
      homeAway: 'home' | 'away';
      score: string;
      winner: boolean;
    }>;
  }>;
}

async function fetchPackersEaglesGame(): Promise<ESPNGame | null> {
  console.log('\n='.repeat(80));
  console.log('Fetching Packers vs Eagles game from ESPN API...');
  console.log('='.repeat(80) + '\n');

  try {
    // Try to find the game in recent weeks
    for (let week = 12; week >= 1; week--) {
      const url = `${ESPN_NFL_SCOREBOARD}?seasontype=2&week=${week}`;
      console.log(`Checking Week ${week}...`);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`  ❌ Failed to fetch Week ${week}`);
        continue;
      }

      const data = await response.json();
      
      if (!data.events || data.events.length === 0) {
        continue;
      }

      // Look for Packers vs Eagles game
      for (const event of data.events) {
        const competition = event.competitions?.[0];
        if (!competition) continue;

        const competitors = competition.competitors || [];
        const teamNames = competitors.map((c: any) => c.team.displayName.toLowerCase());
        
        const hasPackers = teamNames.some((name: string) => name.includes('packers'));
        const hasEagles = teamNames.some((name: string) => name.includes('eagles'));

        if (hasPackers && hasEagles) {
          console.log(`\n✅ Found game in Week ${week}!`);
          console.log(`   ${event.name}`);
          console.log(`   Status: ${event.status.type.description}`);
          return event;
        }
      }
    }

    console.log('\n❌ Could not find Packers vs Eagles game');
    return null;
  } catch (error: any) {
    console.error('❌ Error fetching from ESPN:', error.message);
    return null;
  }
}

async function updateGameResult(game: ESPNGame) {
  console.log('\n' + '='.repeat(80));
  console.log('Updating game result in database...');
  console.log('='.repeat(80) + '\n');

  const competition = game.competitions[0];
  const competitors = competition.competitors;

  // Find home and away teams
  const homeTeam = competitors.find(c => c.homeAway === 'home')!;
  const awayTeam = competitors.find(c => c.homeAway === 'away')!;

  const homeScore = parseInt(homeTeam.score) || 0;
  const awayScore = parseInt(awayTeam.score) || 0;
  
  let winner = 'Tie';
  if (homeScore > awayScore) {
    winner = homeTeam.team.displayName;
  } else if (awayScore > homeScore) {
    winner = awayTeam.team.displayName;
  }

  const gameStatus = game.status.type.completed ? 'Final' : game.status.type.description;

  console.log('Game Details:');
  console.log(`  ${awayTeam.team.displayName} @ ${homeTeam.team.displayName}`);
  console.log(`  Score: ${awayScore} - ${homeScore}`);
  console.log(`  Winner: ${winner}`);
  console.log(`  Status: ${gameStatus}`);
  console.log('');

  // Update the game_results table
  const { data, error } = await supabase
    .from('game_results')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      winner: winner,
      game_status: gameStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('home_team', homeTeam.team.displayName)
    .eq('away_team', awayTeam.team.displayName)
    .eq('season', 2025)
    .select();

  if (error) {
    console.error('❌ Error updating database:', error.message);
    throw error;
  }

  if (data && data.length > 0) {
    console.log('✅ Successfully updated game result!');
    console.log(`   Updated ${data.length} record(s)`);
  } else {
    console.log('⚠️  No matching game found in database to update');
    console.log('   Attempting to find by either team name...');

    // Try updating by checking if either team matches
    const { data: data2, error: error2 } = await supabase
      .from('game_results')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        winner: winner,
        game_status: gameStatus,
        updated_at: new Date().toISOString(),
      })
      .or(`home_team.ilike.%packers%,away_team.ilike.%packers%`)
      .or(`home_team.ilike.%eagles%,away_team.ilike.%eagles%`)
      .eq('season', 2025)
      .select();

    if (error2) {
      console.error('❌ Error updating database:', error2.message);
      throw error2;
    }

    if (data2 && data2.length > 0) {
      console.log('✅ Successfully updated game result!');
      console.log(`   Updated ${data2.length} record(s)`);
    } else {
      console.log('❌ Could not find matching game in database');
    }
  }
}

async function main() {
  try {
    const game = await fetchPackersEaglesGame();
    
    if (!game) {
      console.log('\n❌ No game found to update');
      process.exit(1);
    }

    await updateGameResult(game);

    console.log('\n✅ All done!\n');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();


