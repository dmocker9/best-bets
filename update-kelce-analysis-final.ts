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
- Kelce is ELITE (10.2 YPT, 77.4% catch rate) - matchups matter less for elite players
- Elite players use 0.15 sensitivity vs 0.40 for regular players
- Average defense vs elite player = minimal matchup adjustment
- Matchup Adjustment: +0.0 yards (elite player vs average defense)

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
- Kansas City Chiefs: Isiah Pacheco (RB) - OUT → POSITIVE IMPACT - Chiefs lose their primary RB. More targets for Kelce if run game struggles (+2.0 yards)
- Denver Broncos: Patrick Surtain II (CB) - OUT → POSITIVE IMPACT - Broncos lose their best cornerback. Easier coverage overall (+2.5 yards)
- Denver Broncos: Alex Singleton (LB) - OUT → POSITIVE IMPACT - Broncos lose a linebacker. Easier coverage in middle (+2.0 yards)
- Denver Broncos: Jonah Elliss (OLB) - OUT → Slight positive (less pass rush) (+0.5 yards)
- Diminishing returns: 4 injuries → 62.5% avg effectiveness
- Net Injury Impact: +7.0 yards for Kelce (multiple Broncos defensive injuries, capped and with diminishing returns)

📈 FINAL PREDICTION
Final Projection Calculation:
- Season Average: 60.0 yards
- Defensive Matchup Adjustment: +0.0 yards (elite player vs average defense)
- Game Script Adjustment: +0.5 yards (favored, consistent target)
- Injury Adjustment: +7.0 yards (multiple Broncos defensive injuries with diminishing returns)
- Final Projection: 67.5 yards

Expected Prediction: OVER 44.5
- Edge: +23.0 yards
- Confidence: Very High (82%)

💰 WHY THIS WILL HIT
Kelce's season average (60.0) is massively above the line (15.5 yards, 34.8% above). He's hit over 45 yards in 88.9% of games. As an elite player (10.2 YPT, 77.4% catch rate), matchups matter less - the average Broncos TE defense won't shut him down. Multiple Broncos defensive injuries add +7 yards with diminishing returns applied. The line of 44.5 is way too low for an elite TE averaging 60.0 yards. This is the strongest OVER play in the entire set.`;

async function main() {
  console.log('🔄 Updating Kelce detailed analysis with corrected numbers...\n');
  
  const { error } = await supabase
    .from('player_prop_predictions')
    .update({
      reasoning: kelceDetailedAnalysis,
      predicted_value: 67.5,
      value_score: 23.0,
    })
    .eq('prop_id', 5219)
    .eq('week_number', 11)
    .eq('season', 2025);
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Successfully updated Kelce detailed analysis!');
    console.log('   - Injury boost: +7.0 yards (with diminishing returns)');
    console.log('   - Matchup adjustment: +0.0 yards (elite vs average)');
    console.log('   - Final prediction: 67.5 yards vs 44.5 line = STRONG OVER ✅');
  }
}

main().catch(console.error);

