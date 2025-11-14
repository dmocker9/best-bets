import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const kelceDetailedAnalysis = `📊 PLAYER STATS (35% Weight)
Season Performance (9 games):
- Receiving Yards: 540 total / 9 games = 60.0 yds/game
- Receptions: 41 total / 9 games = 4.56 rec/game
- Targets: 53 total / 9 games = 5.89 tgts/game
- Catch %: 77.4% (41/53) - ELITE
- Yards Per Target: 10.2 (excellent)
- Team: Kansas City Chiefs

Consistency Analysis:
- Kelce averages 60.0 yards, 15.5 above the 44.5 line (34.8% above!)
- Has exceeded 45 yards in 8 of 9 games (88.9% hit rate)
- 77.4% catch rate is ELITE - one of the best in NFL
- 10.2 yards per target is excellent
- 5.89 targets/game

Performance vs Line:
- Season average (60.0) vs Line (44.5) → +15.5 yards edge (MASSIVE)

🛡️ DEFENSIVE MATCHUP (55% Weight) ⭐ KEY FACTOR
Denver Broncos TE Defense:
- Receiving Yards Allowed to TEs: 53.5 yds/game (League Avg: ~55)
- Receiving TDs Allowed: 0.30 TDs/game (League Avg: ~0.5)
- Defensive Ranking: Average TE defense

Key Defensive Factors:
- Broncos allow 1.5 fewer yards than league average (-2.7% vs avg)
- This is an average TE defense - not elite, not terrible
- Allow 0.30 TDs/game to TEs (below league average)
- Broncos' defense focuses more on stopping WRs than TEs

Matchup Impact:
- Neutral to slightly favorable matchup for Kelce
- Broncos' TE defense is average - won't shut down Kelce
- Kelce is elite - can produce against any defense
- Broncos' elite pass rush may force quick throws to Kelce (positive)
- Matchup Adjustment: 0 to +1 yards

🎮 GAME ENVIRONMENT (10% Weight)
Vegas Lines:
- Spread: Kansas City -3.5 (Chiefs favored)
- Total: ~47-48 points (estimated)
- Game Type: Divisional matchup, Chiefs on road

Expected Game Flow:
- Chiefs are favored by 3.5 - expected to win
- Moderate total suggests balanced game
- If Chiefs lead, balanced attack (Kelce still targeted)
- If game is close, Kelce will be heavily targeted
- Road game but Chiefs are better team

Key Injuries:
- Kansas City Chiefs: Isiah Pacheco (RB) - OUT → POSITIVE IMPACT - Chiefs lose their primary RB. More targets for Kelce if run game struggles (+1 to +2 yards for Kelce)
- Denver Broncos: Nate Adkins (TE) - OUT → Minimal impact (Broncos' TE, not relevant)
- Denver Broncos: Patrick Surtain II (CB) - OUT → POSITIVE IMPACT - Broncos lose their best cornerback. Easier coverage overall (+1 to +2 yards for Kelce)
- Denver Broncos: Alex Singleton (LB) - OUT → POSITIVE IMPACT - Broncos lose a linebacker. Easier coverage in middle (+1 to +2 yards for Kelce)
- Denver Broncos: Jonah Elliss (OLB) - OUT → Slight positive (less pass rush)
- Net Injury Impact: +3 to +5 yards for Kelce (multiple Broncos defensive injuries)

📈 FINAL PREDICTION
Final Projection Calculation:
- Season Average: 60.0 yards
- Defensive Matchup Adjustment: 0 to +1 yards (average defense)
- Game Script Adjustment: +0.5 to +1.0 yards (favored, consistent target)
- Injury Adjustment: +3 to +5 yards (multiple Broncos defensive injuries)
- Final Projection: 63-67 yards

Expected Prediction: OVER 44.5
- Edge: +18.5 to +22.5 yards
- Confidence: Very High (80-85%)

💰 WHY THIS WILL HIT
Kelce's season average (60.0) is massively above the line (15.5 yards, 34.8% above). He's hit over 45 yards in 88.9% of games. The matchup is neutral (average TE defense), and multiple Broncos defensive injuries help. The line of 44.5 is way too low for an elite TE averaging 60.0 yards. This is the strongest OVER play in the entire set.`;

async function main() {
  console.log('🔄 Restoring Kelce detailed analysis...\n');
  
  const { error } = await supabase
    .from('player_prop_predictions')
    .update({
      reasoning: kelceDetailedAnalysis,
    })
    .eq('prop_id', 5219)
    .eq('week_number', 11)
    .eq('season', 2025);
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Successfully restored Kelce detailed analysis!');
    
    // Verify
    const { data } = await supabase
      .from('player_prop_predictions')
      .select('reasoning')
      .eq('prop_id', 5219)
      .eq('week_number', 11)
      .eq('season', 2025)
      .maybeSingle();
    
    const reasoningLength = data?.reasoning ? data.reasoning.length : 0;
    console.log(`\n📊 Reasoning length: ${reasoningLength} characters`);
  }
}

main().catch(console.error);


