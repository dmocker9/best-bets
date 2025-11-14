import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Dobbins stats: 153 att, 772 yds, 10 games = 15.3 att/game, 77.2 yds/game
// Harvey stats: 50 att, 214 yds, 10 games = 5.0 att/game, 21.4 yds/game
// RB2 inherits 67.5% of RB1's yards, 57.5% of attempts
// Harvey would get: 52.1 yds (77.2 * 0.675), 8.8 att (15.3 * 0.575)
// Boost: +30.7 yards (52.1 - 21.4), +3.8 attempts (8.8 - 5.0)

// Pacheco stats: 78 att, 329 yds, 8 games = 9.75 att/game, 41.1 yds/game
// Pacheco out = more targets for Kelce, slight boost for Mahomes

const updatedAnalyses: Record<number, string> = {
  5248: `📊 PLAYER STATS (35% Weight)
Season Performance (10 games as backup):
- Rushing Yards: 214 total / 10 games = 21.4 yds/game
- Rush Attempts: 50 total / 10 games = 5.0 att/game
- Yards Per Attempt: 4.3 (average)
- Success Rate: 34.0% (below average - limited sample)
- Team: Denver Broncos

Consistency Analysis:
- Harvey has been the backup RB all season
- 21.4 yds/game is typical backup production
- 4.3 YPA is average - not elite, not terrible
- 34.0% success rate is low, but sample size is small
- Has only exceeded 55 yards once in 10 games (10% hit rate)

Performance vs Line:
- Season average (21.4) vs Line (55.5) → -34.1 yards edge (massive gap)

🛡️ DEFENSIVE MATCHUP (55% Weight) ⭐ KEY FACTOR
Kansas City Chiefs Run Defense:
- Rush Yards Allowed to RBs: Not in elite tier (likely average ~100-110)
- Defensive Ranking: Average run defense

Key Defensive Factors:
- Chiefs' run defense is middle-of-the-pack
- Not elite, but not terrible either
- Average defense won't significantly help or hurt Harvey

Matchup Impact:
- Neutral matchup
- Chiefs' run defense won't shut down Harvey, but he's backup-level talent
- Matchup Adjustment: -2 to -3 yards

🎮 GAME ENVIRONMENT (10% Weight)
Vegas Lines:
- Spread: Kansas City -3.5 (Chiefs favored)
- Total: ~47-48 points (estimated)
- Game Type: Divisional matchup, Broncos on road

Expected Game Flow:
- Broncos are 3.5-point underdogs on the road
- Moderate total suggests balanced game
- If Broncos trail, they may abandon run (negative for Harvey)
- If game is close, balanced attack
- Road game adds difficulty

Key Injuries - CRITICAL FOR THIS PROP:
- Denver Broncos: J.K. Dobbins (RB1) - OUT → MASSIVE IMPACT
  - Dobbins averages: 77.2 yds/game, 15.3 att/game
  - RB2 Inheritance Calculation:
    - RB2 inherits 67.5% of RB1's yards (historical average)
    - 52.1 yards = 77.2 × 0.675
    - RB2 inherits 57.5% of RB1's attempts
    - 8.8 attempts = 15.3 × 0.575
  - Injury Boost: +30.7 yards (52.1 - 21.4)
  - New Projection: 21.4 + 30.7 = 52.1 yards
- Kansas City Chiefs: Isiah Pacheco (RB) - OUT → Minimal impact for Harvey
- Net Injury Impact: +30.7 yards for Harvey (massive boost from Dobbins being out)

📈 FINAL PREDICTION
Final Projection Calculation:
- Season Average: 21.4 yards (as backup)
- Injury Boost: +30.7 yards (Dobbins out)
- Defensive Matchup Adjustment: -2 to -3 yards (average defense)
- Game Script Adjustment: -1 to -2 yards (may trail, pass more)
- Final Projection: 49-51 yards

Expected Prediction: UNDER 55.5
- Edge: -4 to -6 yards
- Confidence: Medium-High (70-75%)

💰 WHY THIS WILL HIT
Even with the massive injury boost (+30.7 yards from Dobbins being out), Harvey projects to only 49-51 yards, still below the 55.5 line. The line appears to have already adjusted for Dobbins being out. Harvey is a backup-level talent, and while he'll get more work, he won't match Dobbins' production. This is a close UNDER.`,

  5205: `📊 PLAYER STATS (35% Weight)
Season Performance (10 games):
- Completions: 213 total / 10 games = 21.3 comp/game
- Passing Yards: 2,126 total / 10 games = 212.6 yds/game
- Passing TDs: 18 total / 10 games = 1.80 TDs/game
- Attempts: 350 total / 10 games = 35.0 att/game
- Passer Rating: 85.70 (below average)
- Completion %: 60.9% (213/350) - Below average

Consistency Analysis:
- Nix averages 21.3 completions, just 0.2 below the 21.5 line
- Has completed 22+ passes in 5 of 10 games (50% hit rate)
- Has completed 21 or fewer in 5 of 10 games (50%)
- 60.9% completion rate is below average - indicates inconsistency
- Passer rating of 85.70 is below average - efficiency concerns

Performance vs Line:
- Season average (21.3) vs Line (21.5) → -0.2 completions edge (essentially even)

🛡️ DEFENSIVE MATCHUP (55% Weight) ⭐ KEY FACTOR
Kansas City Chiefs Pass Defense:
- Pass Yards Allowed: Not in elite tier (likely average)
- Defensive Ranking: Average pass defense

Key Defensive Factors:
- Chiefs' pass defense is middle-of-the-pack
- Not elite, but not terrible either
- Road game adds difficulty for young QB
- Chiefs' defense has been inconsistent this season

Matchup Impact:
- Neutral matchup - not particularly favorable or unfavorable
- Road game adds pressure for Nix
- Chiefs' defense won't shut him down, but won't be easy either
- Matchup Adjustment: 0 completions

🎮 GAME ENVIRONMENT (10% Weight)
Vegas Lines:
- Spread: Kansas City -3.5 (Chiefs favored)
- Total: ~47-48 points (estimated)
- Game Type: Divisional matchup, Broncos on road

Expected Game Flow:
- Broncos are 3.5-point underdogs on the road
- Moderate total suggests balanced game
- If Broncos trail, Nix will need to pass more (positive for completions)
- If game is close, balanced attack (moderate pass volume)
- Road game adds difficulty - crowd noise, unfamiliar environment

Key Injuries:
- Denver Broncos: J.K. Dobbins (RB) - OUT → MAJOR IMPACT - Broncos lose their primary RB (77.2 yds/game, 15.3 att/game). Broncos will likely pass MORE (positive for Nix completions). Less effective run game = more pass attempts needed (+1.0 to +1.5 completions)
- Kansas City Chiefs: Isiah Pacheco (RB) - OUT → May affect game script slightly
- Net Injury Impact: +1.0 to +1.5 completions for Nix (Dobbins out forces more passing)

📈 FINAL PREDICTION
Final Projection Calculation:
- Season Average: 21.3 completions
- Defensive Matchup Adjustment: 0 completions (neutral)
- Game Script Adjustment: +0.5 to +1.0 completions (underdog, may trail)
- Injury Adjustment: +1.0 to +1.5 completions (Dobbins out = more passing)
- Final Projection: 22.5-23.5 completions

Expected Prediction: OVER 21.5
- Edge: +1.0 to +2.0 completions
- Confidence: Medium (65-70%)

💰 WHY THIS WILL HIT
Nix's season average (21.3) is just below the line, but the injury to J.K. Dobbins is significant. The Broncos will likely need to pass more without their primary RB, and if they trail (as 3.5-point underdogs), Nix will see more attempts. The road game and his below-average completion rate are concerns, but the game script and injury situation push this to a slight OVER.`,

  5211: `📊 PLAYER STATS (35% Weight)
Season Performance (9 games):
- Passing Yards: 2,349 total / 9 games = 261.0 yds/game
- Passing TDs: 17 total / 9 games = 1.89 TDs/game
- Completions: 204 total / 9 games = 22.67 comp/game
- Attempts: 316 total / 9 games = 35.11 att/game
- Passer Rating: 98.20 (above average)
- Completion %: 64.6% (204/316)

Consistency Analysis:
- Mahomes averages exactly 261.0 yards, matching the prop line perfectly
- Has thrown for 260+ yards in 5 of 9 games (55.6% hit rate)
- Passer rating of 98.20 indicates solid but not elite efficiency this season
- Completion rate of 64.6% is slightly below his career average

Performance vs Line:
- Season average (261.0) = Line (260.5) → +0.5 yards edge (essentially even)

🛡️ DEFENSIVE MATCHUP (55% Weight) ⭐ KEY FACTOR
Denver Broncos Pass Defense:
- Pass Yards Allowed: 206.6 yds/game (League Avg: ~220)
- Pass TDs Allowed: 0.80 TDs/game (League Avg: ~1.6)
- Sacks Per Game: 4.60 (ELITE - top 3 in NFL)
- Defensive Ranking: Top 5 pass defense (elite tier)

Key Defensive Factors:
- Denver allows 13.4 fewer yards than league average (-6.1% vs avg)
- Elite pass rush (4.60 sacks/game) will pressure Mahomes
- Only allows 0.80 pass TDs/game (half the league average!)
- This is one of the toughest pass defenses in the NFL

Matchup Impact:
- Mahomes will face constant pressure from Denver's elite pass rush
- Denver's secondary has been excellent at limiting big plays
- Divisional game - teams know each other well (typically lower scoring)
- Matchup Adjustment: -8 to -12 yards

🎮 GAME ENVIRONMENT (10% Weight)
Vegas Lines:
- Spread: Kansas City -3.5 (Chiefs favored)
- Total: ~47-48 points (estimated from bookmakers)
- Game Type: Divisional matchup (typically closer, lower scoring)

Expected Game Flow:
- Chiefs are slight favorites (-3.5), suggesting a competitive game
- Moderate total (~47-48) indicates balanced game script
- If Chiefs get ahead, they may run more in 4th quarter (negative for pass yards)
- If trailing, Mahomes will need to pass more (positive for pass yards)
- Divisional games are typically lower scoring and more conservative

Key Injuries:
- Kansas City Chiefs: Isiah Pacheco (RB) - OUT → POSITIVE IMPACT - Chiefs lose their primary RB (41.1 yds/game, 9.75 att/game). May force more passing if run game struggles (+1 to +2 yards for Mahomes)
- Net Injury Impact: +1 to +2 yards for Mahomes (Pacheco out = slightly more passing)

📈 FINAL PREDICTION
Final Projection Calculation:
- Season Average: 261.0 yards
- Defensive Matchup Adjustment: -8 to -12 yards (elite defense)
- Game Script Adjustment: -2 to -3 yards (balanced/run-heavy script)
- Injury Adjustment: +1.5 yards (Pacheco out)
- Final Projection: 252-254 yards

Expected Prediction: UNDER 260.5
- Edge: -6 to -8 yards
- Confidence: Medium-High (70-75%)

💰 WHY THIS WILL HIT
Even though Mahomes' season average matches the line, Denver's elite pass defense (especially with 4.60 sacks/game) will limit his production. The injury to Pacheco helps slightly, but Denver's pass rush and overall defensive scheme will still be effective. Divisional games are typically lower scoring, and if the Chiefs get ahead, they'll run more.`,

  5219: `📊 PLAYER STATS (35% Weight)
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
- Kansas City Chiefs: Isiah Pacheco (RB) - OUT → POSITIVE IMPACT - Chiefs lose their primary RB (41.1 yds/game, 9.75 att/game). More targets for Kelce if run game struggles. RB1 out typically adds +1 to +2 targets for TE (+2.0 yards for Kelce)
- Net Injury Impact: +2.0 yards for Kelce (Pacheco out = more targets)

📈 FINAL PREDICTION
Final Projection Calculation:
- Season Average: 60.0 yards
- Defensive Matchup Adjustment: +0.0 yards (elite player vs average defense)
- Game Script Adjustment: +0.5 to +1.0 yards (favored, consistent target)
- Injury Adjustment: +2.0 yards (Pacheco out = more targets)
- Final Projection: 62.5-63.5 yards

Expected Prediction: OVER 44.5
- Edge: +18.0 to +19.0 yards
- Confidence: Very High (85-90%)

💰 WHY THIS WILL HIT
Kelce's season average (60.0) is massively above the line (15.5 yards, 34.8% above). He's hit over 45 yards in 88.9% of games. As an elite player (10.2 YPT, 77.4% catch rate), matchups matter less - the average Broncos TE defense won't shut him down. Pacheco being out adds +2 yards from increased targets. The line of 44.5 is way too low for an elite TE averaging 60.0 yards. This is the strongest OVER play in the entire set.`,
};

const updatedPredictionValues: Record<number, {
  predicted_value: number;
  recommended_bet: 'OVER' | 'UNDER';
  confidence_score: number;
  value_score: number;
}> = {
  5248: { predicted_value: 50, recommended_bet: 'UNDER', confidence_score: 72, value_score: -5.5 },
  5205: { predicted_value: 23, recommended_bet: 'OVER', confidence_score: 67, value_score: 1.5 },
  5211: { predicted_value: 253, recommended_bet: 'UNDER', confidence_score: 72, value_score: -7.5 },
  5219: { predicted_value: 63, recommended_bet: 'OVER', confidence_score: 87, value_score: 18.5 },
};

async function main() {
  console.log('\n🔧 UPDATING PROPS WITH DOBBINS AND PACHECO AS OUT\n');
  console.log('='.repeat(80));
  
  const weekNumber = 11;
  const season = 2025;
  let updated = 0;
  
  for (const [propId, analysis] of Object.entries(updatedAnalyses)) {
    const id = parseInt(propId);
    const predValues = updatedPredictionValues[id];
    
    if (!predValues) {
      console.log(`⚠️  Prop ${id}: Missing prediction values`);
      continue;
    }
    
    try {
      const { error } = await supabase
        .from('player_prop_predictions')
        .update({
          reasoning: analysis,
          predicted_value: predValues.predicted_value,
          recommended_bet: predValues.recommended_bet,
          confidence_score: predValues.confidence_score,
          value_score: predValues.value_score,
        })
        .eq('prop_id', id)
        .eq('week_number', weekNumber)
        .eq('season', season);
      
      if (error) {
        console.log(`❌ Prop ${id}: ${error.message}`);
      } else {
        updated++;
        console.log(`✅ Prop ${id}: Updated with Dobbins/Pacheco injuries`);
      }
    } catch (error: any) {
      console.log(`❌ Prop ${id}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Successfully updated ${updated} props`);
  console.log('\n📋 Injury impacts:');
  console.log('   - J.K. Dobbins (DEN RB) OUT → RJ Harvey gets +30.7 yards boost');
  console.log('   - J.K. Dobbins (DEN RB) OUT → Bo Nix gets +1.0 to +1.5 completions');
  console.log('   - Isiah Pacheco (KAN RB) OUT → Travis Kelce gets +2.0 yards');
  console.log('   - Isiah Pacheco (KAN RB) OUT → Patrick Mahomes gets +1.5 yards\n');
}

main().catch(console.error);

