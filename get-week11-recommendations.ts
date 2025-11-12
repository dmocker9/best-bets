/**
 * Get top 5 spread recommendations for Week 11
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

// Import prediction logic (simplified for this script)
const HOME_FIELD_ADVANTAGE = 1.5;
const SRS_DAMPENING = 0.70;

async function getTeamStats(teamName: string) {
  const { data, error } = await supabase
    .from('auto_nfl_team_stats')
    .select('*')
    .eq('team_name', teamName)
    .eq('season', 2025)
    .order('week', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Could not find stats for ${teamName}`);
  }

  return {
    ...data,
    points_per_game: data.points_for / (data.wins + data.losses + data.ties),
    points_allowed_per_game: data.points_against / (data.wins + data.losses + data.ties),
  };
}

async function predictGame(homeTeam: string, awayTeam: string, vegasSpread: number) {
  const homeStats = await getTeamStats(homeTeam);
  const awayStats = await getTeamStats(awayTeam);

  // Calculate team scores (simplified - using SRS primarily)
  const homeScore = 50 + (homeStats.srs * 5);
  const awayScore = 50 + (awayStats.srs * 5);

  // Apply dampening and home field advantage
  const rawDiff = (homeScore - awayScore) * SRS_DAMPENING;
  const predictedSpread = rawDiff + HOME_FIELD_ADVANTAGE;

  // Calculate edge
  const edge = Math.abs(predictedSpread) - Math.abs(vegasSpread);

  // Calculate confidence based on data quality and agreement
  const dataQuality = Math.min(homeStats.wins + homeStats.losses, awayStats.wins + awayStats.losses);
  const confidence = Math.min(95, 60 + (dataQuality * 2) + Math.abs(edge) * 3);

  return {
    homeTeam,
    awayTeam,
    homeStats,
    awayStats,
    predictedSpread: parseFloat(predictedSpread.toFixed(1)),
    vegasSpread,
    edge: parseFloat(edge.toFixed(1)),
    confidence: parseFloat(confidence.toFixed(1)),
    recommendation: edge >= 2.5 && confidence >= 60 ? (predictedSpread > 0 ? homeTeam : awayTeam) : 'None',
  };
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🏈 NFL WEEK 11 SPREAD RECOMMENDATIONS');
  console.log('='.repeat(80) + '\n');

  // Fetch all Week 11 games
  const { data: games, error } = await supabase
    .from('odds_bets')
    .select('*')
    .eq('week', 11)
    .order('commence_time');

  if (error || !games) {
    console.error('Error fetching games:', error);
    process.exit(1);
  }

  console.log(`Found ${games.length} games for Week 11\n`);
  console.log('Analyzing all games...\n');

  const predictions = [];

  for (const game of games) {
    try {
      const vegasSpread = parseFloat(game.home_spread);
      const prediction = await predictGame(game.home_team, game.away_team, vegasSpread);
      
      predictions.push({
        ...prediction,
        gameId: game.id,
        vegasHomeSpread: game.home_spread,
        vegasAwaySpread: game.away_spread,
        homeMoneyline: game.home_price,
        awayMoneyline: game.away_price,
      });

      console.log(`✓ ${game.away_team} @ ${game.home_team}`);
    } catch (error: any) {
      console.error(`✗ Failed to predict: ${game.away_team} @ ${game.home_team} - ${error.message}`);
    }
  }

  // Sort by edge (absolute value) and confidence
  predictions.sort((a, b) => {
    const edgeCompare = Math.abs(b.edge) - Math.abs(a.edge);
    if (Math.abs(edgeCompare) < 0.1) {
      return b.confidence - a.confidence;
    }
    return edgeCompare;
  });

  // Get top 5
  const top5 = predictions.slice(0, 5);

  console.log('\n' + '='.repeat(80));
  console.log('🎯 TOP 5 SPREAD RECOMMENDATIONS');
  console.log('='.repeat(80) + '\n');

  top5.forEach((pred, index) => {
    console.log(`\n${index + 1}. ${pred.awayTeam} @ ${pred.homeTeam}`);
    console.log('   ' + '-'.repeat(76));
    console.log(`   Vegas Spread: ${pred.vegasHomeSpread} (${pred.homeTeam})`);
    console.log(`   Model Prediction: ${pred.predictedSpread > 0 ? pred.homeTeam : pred.awayTeam} by ${Math.abs(pred.predictedSpread).toFixed(1)}`);
    console.log(`   Edge: ${pred.edge.toFixed(1)} points`);
    console.log(`   Confidence: ${pred.confidence.toFixed(1)}%`);
    console.log(`   Recommendation: ${pred.recommendation}`);
    console.log('');
    console.log(`   📊 Team Stats:`);
    console.log(`   ${pred.homeTeam} (Home): ${pred.homeStats.wins}-${pred.homeStats.losses}${pred.homeStats.ties > 0 ? `-${pred.homeStats.ties}` : ''}, SRS: ${pred.homeStats.srs.toFixed(1)}, PPG: ${pred.homeStats.points_per_game.toFixed(1)}, PA/G: ${pred.homeStats.points_allowed_per_game.toFixed(1)}`);
    console.log(`   ${pred.awayTeam} (Away): ${pred.awayStats.wins}-${pred.awayStats.losses}${pred.awayStats.ties > 0 ? `-${pred.awayStats.ties}` : ''}, SRS: ${pred.awayStats.srs.toFixed(1)}, PPG: ${pred.awayStats.points_per_game.toFixed(1)}, PA/G: ${pred.awayStats.points_allowed_per_game.toFixed(1)}`);
    console.log('');
    console.log(`   💡 Why This Pick:`);
    
    const srsDiff = Math.abs(pred.homeStats.srs - pred.awayStats.srs);
    const betterTeam = pred.homeStats.srs > pred.awayStats.srs ? pred.homeTeam : pred.awayTeam;
    
    console.log(`   - ${betterTeam} has a ${srsDiff.toFixed(1)}-point SRS advantage`);
    console.log(`   - Model sees ${Math.abs(pred.edge).toFixed(1)} points of value vs Vegas line`);
    console.log(`   - ${pred.confidence.toFixed(0)}% confidence based on season-long data`);
    
    if (Math.abs(pred.predictedSpread) > Math.abs(pred.vegasSpread)) {
      console.log(`   - Model expects a larger margin than Vegas is giving`);
    } else {
      console.log(`   - Model sees the underdog covering more easily than Vegas projects`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('📝 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Games Analyzed: ${predictions.length}`);
  console.log(`Games with 2.5+ Point Edge: ${predictions.filter(p => Math.abs(p.edge) >= 2.5).length}`);
  console.log(`Average Confidence: ${(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length).toFixed(1)}%`);
  console.log('='.repeat(80) + '\n');
}

main();

