/**
 * Recalculate Ravens @ Browns using only Ravens' last 2 games (with Lamar Jackson)
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

const HOME_FIELD_ADVANTAGE = 1.5;
const SRS_DAMPENING = 0.70;

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🏈 RAVENS @ BROWNS - RECALCULATION WITH LAST 2 RAVENS GAMES');
  console.log('='.repeat(80) + '\n');

  // Get Ravens recent games (last 2 with Lamar Jackson)
  const { data: ravensRecent } = await supabase
    .from('team_recent_games')
    .select('recent_games')
    .eq('team_name', 'Baltimore Ravens')
    .eq('season', 2025)
    .single();

  if (!ravensRecent || !ravensRecent.recent_games) {
    console.error('No recent games data for Ravens');
    process.exit(1);
  }

  const recentGames = ravensRecent.recent_games as any[];
  const last2Games = recentGames.slice(-2); // Get last 2 games (Weeks 9-10)

  console.log('📊 Ravens Last 2 Games (with Lamar Jackson):');
  last2Games.forEach((game: any) => {
    console.log(`   Week ${game.week}: ${game.result} ${game.score} vs ${game.opponent} (${game.location})`);
  });

  // Calculate Ravens stats from last 2 games
  const ravensLast2Stats = {
    games: 2,
    pointsScored: last2Games.reduce((sum: number, g: any) => {
      const [scored, allowed] = g.score.split('-').map(Number);
      return sum + scored;
    }, 0),
    pointsAllowed: last2Games.reduce((sum: number, g: any) => {
      const [scored, allowed] = g.score.split('-').map(Number);
      return sum + allowed;
    }, 0),
    margins: last2Games.map((g: any) => g.margin),
  };

  const ravensPPG = ravensLast2Stats.pointsScored / 2;
  const ravensPAG = ravensLast2Stats.pointsAllowed / 2;
  const ravensAvgMargin = ravensLast2Stats.margins.reduce((a: number, b: number) => a + b, 0) / 2;

  console.log('\n📈 Ravens Last 2 Games Stats:');
  console.log(`   PPG: ${ravensPPG.toFixed(1)}`);
  console.log(`   PA/G: ${ravensPAG.toFixed(1)}`);
  console.log(`   Avg Margin: +${ravensAvgMargin.toFixed(1)}`);

  // Get Browns full season stats
  const { data: brownsStats } = await supabase
    .from('auto_nfl_team_stats')
    .select('*')
    .eq('team_name', 'Cleveland Browns')
    .eq('season', 2025)
    .order('week', { ascending: false })
    .limit(1)
    .single();

  if (!brownsStats) {
    console.error('No stats for Browns');
    process.exit(1);
  }

  const brownsGames = brownsStats.wins + brownsStats.losses + brownsStats.ties;
  const brownsPPG = brownsStats.points_for / brownsGames;
  const brownsPAG = brownsStats.points_against / brownsGames;

  console.log('\n📉 Browns Full Season Stats:');
  console.log(`   Record: ${brownsStats.wins}-${brownsStats.losses}${brownsStats.ties > 0 ? `-${brownsStats.ties}` : ''}`);
  console.log(`   PPG: ${brownsPPG.toFixed(1)}`);
  console.log(`   PA/G: ${brownsPAG.toFixed(1)}`);
  console.log(`   SRS: ${brownsStats.srs}`);

  // Calculate predicted score using simplified model
  // Ravens offensive strength (based on last 2 games PPG)
  const ravensOffScore = Math.min(100, (ravensPPG / 35) * 100);
  
  // Ravens defensive strength (based on last 2 games PAG)
  const ravensDefScore = Math.max(0, Math.min(100, ((30 - ravensPAG) / 15) * 100));
  
  // Browns offensive strength
  const brownsOffScore = Math.min(100, (brownsPPG / 35) * 100);
  
  // Browns defensive strength
  const brownsDefScore = Math.max(0, Math.min(100, ((30 - brownsPAG) / 15) * 100));

  // Calculate team strengths
  const ravensStrength = (ravensOffScore + ravensDefScore) / 2;
  const brownsStrength = (brownsOffScore + brownsDefScore) / 2;

  console.log('\n🎯 Calculated Team Strengths:');
  console.log(`   Ravens (Last 2): ${ravensStrength.toFixed(1)}/100`);
  console.log(`   Browns (Season): ${brownsStrength.toFixed(1)}/100`);

  // Predict margin
  const rawMargin = (ravensStrength - brownsStrength - HOME_FIELD_ADVANTAGE) * SRS_DAMPENING;
  const predictedMargin = parseFloat(rawMargin.toFixed(1));

  console.log('\n📊 Prediction:');
  console.log(`   Raw Margin: ${rawMargin.toFixed(1)}`);
  console.log(`   Predicted: Ravens by ${Math.abs(predictedMargin).toFixed(1)}`);
  console.log(`   Vegas Spread: Ravens -7.5`);
  console.log(`   Edge: ${Math.abs(Math.abs(predictedMargin) - 7.5).toFixed(1)} points`);

  // Compare to season-long prediction
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPARISON');
  console.log('='.repeat(80));
  
  // Get current prediction
  const { data: currentPred } = await supabase
    .from('spread_predictions')
    .select(`
      *,
      odds_bets:game_id (home_team, away_team, home_spread)
    `)
    .eq('week_number', 11)
    .eq('season', 2025)
    .limit(100);

  const ravensBrownsPred = currentPred?.find((p: any) => 
    p.odds_bets?.home_team === 'Cleveland Browns'
  );

  if (ravensBrownsPred) {
    console.log('\nCurrent Model (Season-Long Data):');
    console.log(`   Prediction: Ravens by ${Math.abs(ravensBrownsPred.predicted_spread).toFixed(1)}`);
    console.log(`   Confidence: ${ravensBrownsPred.confidence_score.toFixed(1)}%`);
    console.log(`   Recommendation: ${ravensBrownsPred.recommended_bet}`);
  }

  console.log('\nUpdated Model (Last 2 Games):');
  console.log(`   Prediction: Ravens by ${Math.abs(predictedMargin).toFixed(1)}`);
  console.log(`   Analysis: ${Math.abs(predictedMargin) > 7.5 ? 'Ravens -7.5 ✅' : 'Browns +7.5 ✅'}`);
  console.log(`   Reasoning: Ravens averaging +15 margin with Lamar (last 2 games)`);

  console.log('\n' + '='.repeat(80));
  console.log('💡 RECOMMENDATION');
  console.log('='.repeat(80));
  
  if (Math.abs(predictedMargin) > 7.5) {
    console.log(`\n✅ TAKE: RAVENS -7.5`);
    console.log(`   Model predicts Ravens by ${Math.abs(predictedMargin).toFixed(1)}`);
    console.log(`   With Lamar, Ravens are dominant (+15 margin in L2)`);
  } else {
    console.log(`\n✅ TAKE: BROWNS +7.5`);
    console.log(`   Model predicts Ravens by ${Math.abs(predictedMargin).toFixed(1)}`);
    console.log(`   Not enough to cover the 7.5-point spread`);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

main().catch(console.error);


