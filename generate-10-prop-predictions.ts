import { predictPlayerProp } from './src/lib/predictPlayerProps';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Selected props: 3 QB, 3 RB, 3 WR, 1 TE with diverse markets
const selectedProps = [
  // QBs (3)
  { id: 5211, name: 'Patrick Mahomes', market: 'player_pass_yds', line: 260.5, position: 'QB' },
  { id: 5326, name: 'Dak Prescott', market: 'player_pass_tds', line: 1.5, position: 'QB' },
  { id: 5205, name: 'Bo Nix', market: 'player_pass_completions', line: 21.5, position: 'QB' },
  
  // RBs (3) - including some tough matchups for UNDER bets
  { id: 5176, name: 'Derrick Henry', market: 'player_rush_yds', line: 76.5, position: 'RB' }, // vs BAL - tough
  { id: 5248, name: 'RJ Harvey', market: 'player_rush_yds', line: 55.5, position: 'RB' }, // vs KC - tough
  { id: 5066, name: 'Chase Brown', market: 'player_rush_attempts', line: 14.5, position: 'RB' },
  
  // WRs (3)
  { id: 4417, name: 'Justin Jefferson', market: 'player_reception_yds', line: 71.5, position: 'WR' },
  { id: 5270, name: 'Amon-Ra St. Brown', market: 'player_reception_yds', line: 75.5, position: 'WR' },
  { id: 5274, name: 'Jameson Williams', market: 'player_reception_yds', line: 48.5, position: 'WR' },
  
  // TE (1)
  { id: 5219, name: 'Travis Kelce', market: 'player_reception_yds', line: 44.5, position: 'TE' },
];

async function main() {
  console.log('\n🎯 GENERATING 10 PLAYER PROP PREDICTIONS\n');
  console.log('='.repeat(80));
  
  const predictions = [];
  
  for (const propInfo of selectedProps) {
    try {
      // Fetch the full prop data
      const { data: prop, error } = await supabase
        .from('player_props')
        .select('*')
        .eq('id', propInfo.id)
        .maybeSingle();
      
      if (error || !prop) {
        console.log(`❌ ${propInfo.name} - Could not fetch prop data`);
        continue;
      }
      
      console.log(`\n🏈 ${propInfo.name} - ${propInfo.market.replace('player_', '').replace('_', ' ')} (${propInfo.line})`);
      
      // Generate prediction
      const prediction = await predictPlayerProp(prop as any);
      
      if (prediction && prediction.recommended_bet) {
        const marketName = propInfo.market
          .replace('player_', '')
          .replace('_', ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        const betStrength = 
          prediction.confidence_score >= 75 ? 'ELITE' :
          prediction.confidence_score >= 70 ? 'STRONG' :
          prediction.confidence_score >= 65 ? 'GOOD' : 'VALUE';
        
        console.log(`   ✅ ${prediction.recommended_bet} ${propInfo.line} ${marketName}`);
        console.log(`   📊 Model: ${prediction.predicted_value.toFixed(1)} | Edge: ${prediction.value_score >= 0 ? '+' : ''}${prediction.value_score.toFixed(1)} | Confidence: ${prediction.confidence_score.toFixed(0)}%`);
        console.log(`   🏆 Bet Strength: ${betStrength}`);
        
        predictions.push({
          ...prediction,
          marketName,
          betStrength,
        });
      } else if (prediction) {
        console.log(`   ⚠️  No recommendation (insufficient edge or confidence)`);
      } else {
        console.log(`   ❌ Could not generate prediction`);
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 SUMMARY: Generated ${predictions.length} recommendations\n`);
  
  // Group by recommendation
  const overs = predictions.filter(p => p.recommended_bet === 'OVER');
  const unders = predictions.filter(p => p.recommended_bet === 'UNDER');
  
  console.log(`✅ OVER: ${overs.length} picks`);
  console.log(`❌ UNDER: ${unders.length} picks`);
  
  // Show breakdown by position
  const byPosition = predictions.reduce((acc, p) => {
    acc[p.position] = (acc[p.position] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📈 By Position:');
  Object.entries(byPosition).forEach(([pos, count]) => {
    console.log(`   ${pos}: ${count}`);
  });
  
  console.log('\n');
}

main().catch(console.error);

