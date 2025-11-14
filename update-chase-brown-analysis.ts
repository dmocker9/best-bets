import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const updatedChaseBrownAnalysis = `📊 PLAYER STATS (35% Weight)
Season Performance (9 games):
- Rush Attempts: 108 total / 9 games = 12.0 att/game
- Rushing Yards: 420 total / 9 games = 46.7 yds/game
- Yards Per Attempt: 3.9 (below average)
- Success Rate: 47.2% (below average)
- Team: Cincinnati Bengals

Consistency Analysis:
- Brown averages 12.0 attempts, 2.5 below the 14.5 line
- Has had 15+ attempts in only 2 of 9 games (22.2% hit rate)
- 3.9 YPA is below average - not efficient
- 47.2% success rate is below average
- Brown is the primary back but Bengals pass more than run

Performance vs Line:
- Season average (12.0) vs Line (14.5) → -2.5 attempts edge (significant gap)

🛡️ DEFENSIVE MATCHUP (55% Weight) ⭐ KEY FACTOR
Pittsburgh Steelers Run Defense:
- Rush Yards Allowed to RBs: 91.4 yds/game (League Avg: ~115)
- Rush TDs Allowed: 0.56 TDs/game (League Avg: ~1.0)
- Defensive Ranking: Above average run defense (good, not elite)

Key Defensive Factors:
- Steelers allow 23.6 fewer yards than league average (-20.5% vs avg)
- This is a solid run defense - above average
- Only allow 0.56 rush TDs/game (below league average)
- Steelers' front seven is strong against the run

Matchup Impact:
- Tough matchup for Brown
- Steelers' run defense is above average - will limit rushing success
- Bengals may abandon run if it's not working (negative for attempts)
- Matchup Adjustment: -1.0 to -1.5 attempts

🎮 GAME ENVIRONMENT (10% Weight)
Vegas Lines:
- Spread: Pittsburgh -5.5 (Steelers heavily favored)
- Total: ~42-44 points (estimated - lower scoring)
- Game Type: Divisional matchup, Bengals on road

Expected Game Flow:
- Bengals are 5.5-point underdogs on the road
- Lower total suggests defensive game
- If Bengals trail early, they'll pass more (negative for Brown)
- If game is close, balanced attack
- Road game as underdog = likely to trail = more passing

Key Injuries:
- No significant injuries affecting this prop. All key players are available for both teams.

📈 FINAL PREDICTION
Final Projection Calculation:
- Season Average: 12.0 attempts
- Defensive Matchup Adjustment: -1.0 to -1.5 attempts (tough defense)
- Game Script Adjustment: -1.5 to -2.0 attempts (underdog, may trail)
- Injury Adjustment: 0.0 attempts (no significant injuries)
- Final Projection: 9.5-10.5 attempts

Expected Prediction: UNDER 14.5
- Edge: -4 to -5 attempts
- Confidence: Very High (80-85%)

💰 WHY THIS WILL HIT
Brown's season average (12.0) is well below the line, and the game script is strongly negative (5.5-point underdog, likely to trail and pass more). The Steelers' above-average run defense will limit rushing success, and without any injury boosts, Brown projects to only 9.5-10.5 attempts. The line of 14.5 is significantly too high given the game script, matchup, and Brown's season average.`;

async function main() {
  console.log('🔄 Updating Chase Brown detailed analysis...\n');
  
  // Update all Chase Brown predictions (there may be multiple)
  const { error } = await supabase
    .from('player_prop_predictions')
    .update({
      reasoning: updatedChaseBrownAnalysis,
      predicted_value: 10.0, // Updated projection: 9.5-10.5 attempts, use 10.0
      value_score: -4.5, // 10.0 - 14.5 = -4.5
    })
    .eq('player_name', 'Chase Brown')
    .eq('week_number', 11)
    .eq('season', 2025);
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Successfully updated Chase Brown detailed analysis!');
    console.log('   - Removed incorrect injury mentions (Joe Flacco, Samaje Perine, T.J. Watt, etc.)');
    console.log('   - Updated final prediction: 9.5-10.5 attempts (was 10.5-11.5)');
    console.log('   - Updated edge: -4 to -5 attempts (was -3 to -4)');
    console.log('   - Updated confidence: Very High 80-85% (was High 75-80%)');
  }
}

main().catch(console.error);

