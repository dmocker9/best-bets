import { predictPlayerProp } from './src/lib/predictPlayerProps';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔄 Regenerating Travis Kelce prediction with fixes...\n');
  
  const { data: prop, error: propError } = await supabase
    .from('player_props')
    .select('*')
    .eq('id', 5219)
    .maybeSingle();
  
  if (propError || !prop) {
    console.error('Error fetching prop:', propError);
    return;
  }
  
  console.log(`Predicting: ${prop.player_name} - ${prop.prop_market} (${prop.line})`);
  
  const prediction = await predictPlayerProp(prop as any);
  
  if (!prediction) {
    console.log('❌ Failed to generate prediction');
    return;
  }
  
  console.log('\n📊 Prediction Results:');
  console.log(`   Defensive Matchup Score: ${prediction.breakdown.defensive_matchup_score.toFixed(0)}/100`);
  console.log(`   Predicted Value: ${prediction.predicted_value.toFixed(1)}`);
  console.log(`   Value Score: ${prediction.value_score >= 0 ? '+' : ''}${prediction.value_score.toFixed(1)}`);
  console.log(`   Recommended: ${prediction.recommended_bet}`);
  console.log(`   Confidence: ${prediction.confidence_score.toFixed(0)}%`);
  
  // Update in database
  const { error: updateError } = await supabase
    .from('player_prop_predictions')
    .upsert({
      prop_id: prediction.prop_id,
      player_name: prediction.player_name,
      team: prediction.team,
      opponent: prediction.opponent,
      position: prediction.position,
      prop_market: prediction.prop_market,
      prop_line: prediction.prop_line,
      predicted_value: prediction.predicted_value,
      confidence_score: prediction.confidence_score,
      value_score: prediction.value_score,
      recommended_bet: prediction.recommended_bet,
      odds: prediction.odds,
      reasoning: prediction.reasoning,
      breakdown: prediction.breakdown,
      week_number: 11,
      season: 2025,
    }, {
      onConflict: 'prop_id,week_number,season',
    });
  
  if (updateError) {
    console.error('❌ Error updating:', updateError);
  } else {
    console.log('\n✅ Successfully updated Kelce prediction in database!');
  }
}

main().catch(console.error);


