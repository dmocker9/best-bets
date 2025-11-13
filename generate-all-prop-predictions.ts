/**
 * Generate predictions for ALL available player props
 * Analyzes 414 props and saves the best recommendations to database
 */

import { createClient } from '@supabase/supabase-js';
import { predictPlayerProp } from './src/lib/predictPlayerProps';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PlayerProp {
  id: number;
  event_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  player_name: string;
  prop_market: string;
  bookmaker_key: string;
  line: number | null;
  odds: number;
  bet_type: string;
}

async function generateAllPropPredictions() {
  console.log('\n' + '='.repeat(70));
  console.log('🎯 GENERATING ALL PLAYER PROP PREDICTIONS');
  console.log('='.repeat(70) + '\n');

  // Fetch all available props
  const { data: props, error } = await supabase
    .from('player_props')
    .select('*')
    .not('line', 'is', null)
    .gte('commence_time', new Date().toISOString())
    .order('player_name');

  if (error || !props) {
    console.error('Error fetching props:', error);
    return;
  }

  console.log(`📊 Found ${props.length} props to analyze\n`);

  let total = 0;
  let saved = 0;
  let skipped = 0;
  let failed = 0;

  // Process each prop
  for (const prop of props as PlayerProp[]) {
    total++;
    
    try {
      // Generate prediction using the model
      const prediction = await predictPlayerProp(prop);

      if (!prediction) {
        skipped++;
        continue;
      }

      // Only save if there's a recommendation (OVER or UNDER)
      if (prediction.recommended_bet) {
        const { error: saveError } = await supabase
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
            ignoreDuplicates: false,
          });

        if (!saveError) {
          saved++;
          if (saved % 10 === 0) {
            console.log(`✅ Saved ${saved} predictions...`);
          }
        } else {
          failed++;
          console.error(`❌ Error saving ${prop.player_name}:`, saveError.message);
        }
      } else {
        skipped++;
      }
    } catch (err) {
      failed++;
      console.error(`❌ Error processing ${prop.player_name}:`, err);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📈 RESULTS:');
  console.log(`   Total Props Analyzed: ${total}`);
  console.log(`   ✅ Saved Recommendations: ${saved}`);
  console.log(`   ⏭️  Skipped (no edge): ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(70) + '\n');

  // Get top 10 by quality score
  const { data: topProps } = await supabase
    .from('player_prop_predictions')
    .select('player_name, position, prop_market, prop_line, recommended_bet, confidence_score, value_score')
    .eq('week_number', 11)
    .eq('season', 2025)
    .not('recommended_bet', 'is', null)
    .order('confidence_score', { ascending: false })
    .limit(20);

  if (topProps && topProps.length > 0) {
    console.log('\n🏆 TOP 10 PROP BETS (by quality):');
    console.log('='.repeat(70));
    
    // Calculate quality scores and deduplicate
    const withQuality = topProps.map(p => ({
      ...p,
      quality_score: p.confidence_score * Math.min(Math.abs(p.value_score || 0), 10)
    }));
    
    // Sort by quality and deduplicate
    withQuality.sort((a, b) => b.quality_score - a.quality_score);
    
    const seen = new Set<string>();
    const unique = withQuality.filter(p => {
      if (seen.has(p.player_name)) return false;
      seen.add(p.player_name);
      return true;
    });
    
    unique.slice(0, 10).forEach((p, i) => {
      console.log(`${i + 1}. ${p.player_name} (${p.position}) - ${p.recommended_bet} ${p.prop_line} ${formatMarket(p.prop_market)}`);
      console.log(`   Confidence: ${p.confidence_score.toFixed(0)}% | Edge: ${p.value_score >= 0 ? '+' : ''}${p.value_score.toFixed(1)} | Quality: ${p.quality_score.toFixed(1)}`);
    });
    console.log('='.repeat(70) + '\n');
  }
}

function formatMarket(market: string): string {
  const map: Record<string, string> = {
    'player_pass_yds': 'Pass Yds',
    'player_rush_yds': 'Rush Yds',
    'player_reception_yds': 'Rec Yds',
    'player_receptions': 'Rec',
    'player_pass_tds': 'Pass TDs',
    'player_pass_attempts': 'Pass Att',
    'player_pass_completions': 'Comp',
    'player_rush_attempts': 'Rush Att',
  };
  return map[market] || market;
}

// Run the script
generateAllPropPredictions()
  .then(() => {
    console.log('✅ All predictions generated successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });

