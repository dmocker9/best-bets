/**
 * Generate and display top 5 Week 11 spread recommendations
 */

import { generateAndSavePredictions } from './src/lib/predictGames';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🏈 GENERATING WEEK 11 SPREAD PREDICTIONS');
  console.log('='.repeat(80) + '\n');

  // Generate predictions for Week 11
  const result = await generateAndSavePredictions(11, 2025);

  console.log(`\n✅ Generated predictions for ${result.total} games`);
  console.log(`   Saved: ${result.saved}`);
  console.log(`   Failed: ${result.failed}\n`);

  // Query for top 5 recommendations
  console.log('='.repeat(80));
  console.log('🎯 TOP 5 SPREAD RECOMMENDATIONS');
  console.log('='.repeat(80) + '\n');

  const { data: predictions, error } = await supabase
    .from('spread_predictions')
    .select('*')
    .eq('week_number', 11)
    .eq('season', 2025)
    .gte('value_score', 2.5)
    .gte('confidence_score', 60)
    .order('value_score', { ascending: false })
    .order('confidence_score', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching predictions:', error);
    process.exit(1);
  }

  if (!predictions || predictions.length === 0) {
    console.log('No qualifying recommendations found.\n');
    process.exit(0);
  }

  predictions.forEach((pred, index) => {
    console.log(`\n${index + 1}. ${pred.away_team} @ ${pred.home_team}`);
    console.log('   ' + '-'.repeat(76));
    
    const vegasSpreadNum = parseFloat(pred.current_spread);
    console.log(`   Vegas Spread: ${pred.current_spread} (${vegasSpreadNum > 0 ? pred.home_team : pred.away_team} favored)`);
    console.log(`   Model Prediction: ${pred.predicted_winner} by ${Math.abs(pred.predicted_margin).toFixed(1)} points`);
    console.log(`   Edge: ${pred.value_score.toFixed(1)} points`);
    console.log(`   Confidence: ${pred.confidence_score.toFixed(1)}%`);
    console.log(`   Recommendation: ${pred.recommended_bet || 'None'}`);
    
    if (pred.reasoning) {
      console.log(`\n   💡 Analysis:`);
      const reasoningLines = pred.reasoning.split('\n').filter((line: string) => line.trim());
      reasoningLines.slice(0, 8).forEach((line: string) => {
        console.log(`   ${line.trim()}`);
      });
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Predictions: ${result.total}`);
  console.log(`Qualifying Recommendations: ${predictions.length}`);
  console.log(`Minimum Edge: 2.5 points`);
  console.log(`Minimum Confidence: 60%`);
  console.log('='.repeat(80) + '\n');
}

main().catch(console.error);

