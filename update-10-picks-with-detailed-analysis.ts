import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Detailed analysis content for each prop
const detailedAnalyses: Record<number, string> = {
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
- Kansas City: Isiah Pacheco (RB) - OUT → May force more passing if run game struggles
- Denver: Patrick Surtain II (CB) - OUT → MAJOR IMPACT - Denver's best cornerback out (+2 to +4 yards for Mahomes)
- Denver: Alex Singleton (LB) - OUT → May affect coverage in middle of field
- Denver: Jonah Elliss (OLB) - OUT → May reduce pass rush slightly
- Net Injury Impact: +2 to +4 yards for Mahomes (Surtain being out is significant)

📈 FINAL PREDICTION
Final Projection Calculation:
- Season Average: 261.0 yards
- Defensive Matchup Adjustment: -8 to -12 yards (elite defense)
- Game Script Adjustment: -2 to -3 yards (balanced/run-heavy script)
- Injury Adjustment: +3 yards (Surtain out)
- Final Projection: 254-256 yards

Expected Prediction: UNDER 260.5
- Edge: -4 to -6 yards
- Confidence: Medium-High (70-75%)

💰 WHY THIS WILL HIT
Even though Mahomes' season average matches the line, Denver's elite pass defense (especially with 4.60 sacks/game) will limit his production. The injury to Surtain helps, but Denver's pass rush and overall defensive scheme will still be effective. Divisional games are typically lower scoring, and if the Chiefs get ahead, they'll run more.`,

  5326: `📊 PLAYER STATS (35% Weight)
Season Performance (9 games):
- Passing TDs: 17 total / 9 games = 1.89 TDs/game
- Passing Yards: 2,319 total / 9 games = 257.7 yds/game
- Completions: 228 total / 9 games = 25.33 comp/game
- Attempts: 329 total / 9 games = 36.56 att/game
- Passer Rating: 98.80 (above average)
- Completion %: 69.3% (228/329) - Excellent

Consistency Analysis:
- Prescott averages 1.89 TDs/game, significantly above the 1.5 line
- Has thrown 2+ TDs in 6 of 9 games (66.7% hit rate)
- Has thrown 1 or fewer TDs in only 3 of 9 games (33.3%)
- 69.3% completion rate is elite - indicates high-quality passing
- Passer rating of 98.80 shows consistent efficiency

Performance vs Line:
- Season average (1.89) vs Line (1.5) → +0.39 TDs edge (26% above line)

🛡️ DEFENSIVE MATCHUP (55% Weight) ⭐ KEY FACTOR
Las Vegas Raiders Pass Defense:
- Pass Yards Allowed: 227.4 yds/game (League Avg: ~220)
- Pass TDs Allowed: 1.33 TDs/game (League Avg: ~1.6)
- Sacks Per Game: 1.89 (Below average)
- Defensive Ranking: Average to slightly below average

Key Defensive Factors:
- Raiders allow 7.4 more yards than league average (+3.4% vs avg)
- Allow 1.33 pass TDs/game (slightly below league average of 1.6)
- Below-average pass rush (1.89 sacks/game) - Prescott will have time
- Secondary is middle-of-the-pack - not elite, not terrible

Matchup Impact:
- Favorable matchup for Prescott
- Raiders' pass rush won't pressure him significantly
- Secondary is average - Prescott's accuracy (69.3%) will exploit it
- Raiders allow slightly fewer TDs than average, but not enough to worry
- Matchup Adjustment: +0.05 to +0.10 TDs

🎮 GAME ENVIRONMENT (10% Weight)
Vegas Lines:
- Spread: Dallas -3.5 (Cowboys favored at home)
- Total: ~48-50 points (estimated)
- Game Type: Non-divisional, Cowboys at home

Expected Game Flow:
- Cowboys are favored by 3.5 at home - expected to win
- Moderate-high total (~48-50) suggests scoring expected
- Cowboys will likely be ahead or competitive throughout
- When ahead, Cowboys still pass in red zone (positive for TDs)
- Home field advantage for Cowboys

Key Injuries:
- Dallas Cowboys: No major offensive injuries reported
- Las Vegas Raiders: No major defensive injuries that would significantly impact pass defense
- Net Injury Impact: Neutral - no significant injuries affecting this prop

📈 FINAL PREDICTION
Final Projection Calculation:
- Season Average: 1.89 TDs/game
- Defensive Matchup Adjustment: +0.05 to +0.10 TDs (favorable matchup)
- Game Script Adjustment: +0.10 to +0.15 TDs (favored, high total)
- Injury Adjustment: 0 TDs (neutral)
- Final Projection: 2.0-2.1 TDs

Expected Prediction: OVER 1.5
- Edge: +0.5 to +0.6 TDs
- Confidence: High (75-80%)

💰 WHY THIS WILL HIT
Prescott's season average (1.89 TDs) is significantly above the line, and he's hit 2+ TDs in 66.7% of games. The matchup is favorable (Raiders' average pass defense), and the game script is positive (Cowboys favored, high total). This is one of the strongest OVER plays in the set.`,

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
- Denver Broncos: J.K. Dobbins (RB) - OUT → MAJOR IMPACT - Broncos lose their primary RB (77.2 yds/game, 15.3 att/game). Broncos will likely pass MORE (positive for Nix completions). Less effective run game = more pass attempts needed (+1 to +2 completions)
- Denver Broncos: Trent Sherfield (WR) - OUT → Slight negative (one less target)
- Denver Broncos: Nate Adkins (TE) - OUT → Minimal impact
- Kansas City Chiefs: Isiah Pacheco (RB) - OUT → May affect game script slightly
- Net Injury Impact: +1 to +2 completions for Nix (Dobbins out forces more passing)

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

  5176: `📊 PLAYER STATS (35% Weight)
Season Performance (9 games):
- Rushing Yards: 704 total / 9 games = 78.2 yds/game
- Rush Attempts: 148 total / 9 games = 16.4 att/game
- Yards Per Attempt: 4.8 (above average)
- Success Rate: 52.7% (solid)
- Team: Baltimore Ravens

Consistency Analysis:
- Henry averages 78.2 yards, just 1.7 above the 76.5 line
- Has rushed for 77+ yards in 5 of 9 games (55.6% hit rate)
- 4.8 YPA is solid but not elite
- 52.7% success rate indicates consistent production
- Now with Ravens (better offense than Titans) = more scoring opportunities

Performance vs Line:
- Season average (78.2) vs Line (76.5) → +1.7 yards edge (minimal)

🛡️ DEFENSIVE MATCHUP (55% Weight) ⭐ KEY FACTOR
Cleveland Browns Run Defense:
- Rush Yards Allowed to RBs: 79.0 yds/game (League Avg: ~115)
- Rush TDs Allowed: 0.44 TDs/game (League Avg: ~1.0)
- Defensive Ranking: Top 3 run defense (ELITE)

Key Defensive Factors:
- Browns allow 36.0 fewer yards than league average (-31.3% vs avg)
- This is one of the best run defenses in the NFL
- Only allow 0.44 rush TDs/game (less than half league average)
- Browns' defensive line is elite at stopping the run

Matchup Impact:
- EXTREMELY TOUGH matchup for Henry
- Browns' run defense is elite - will limit Henry's production significantly
- Even elite RBs struggle against this defense
- Henry will face constant pressure in the backfield
- Matchup Adjustment: -12 to -15 yards

🎮 GAME ENVIRONMENT (10% Weight)
Vegas Lines:
- Spread: Baltimore -7.5 (Ravens heavily favored)
- Total: ~42-44 points (estimated - lower scoring)
- Game Type: Divisional matchup, Ravens on road

Expected Game Flow:
- Ravens are heavily favored by 7.5 - expected to win big
- Lower total (~42-44) suggests defensive game
- If Ravens get big lead, they'll run more to kill clock (positive for Henry)
- If game is close early, balanced attack
- Road game but Ravens are clearly better team

Key Injuries:
- Baltimore Ravens: Lamar Jackson (QB) - OUT → MAJOR IMPACT - Ravens lose their dual-threat QB. Ravens will rely MORE on run game (positive for Henry). Less effective passing = more rushing attempts. Backup QB = more conservative game plan (+3 to +5 rush attempts, but -0.5 to -1.0 YPA)
- Baltimore Ravens: Justice Hill (RB) - OUT → Positive (less competition for carries)
- Baltimore Ravens: Rashod Bateman (WR) - OUT → Slight positive (more run-heavy offense)
- Baltimore Ravens: Marlon Humphrey (CB) - OUT → Defensive impact (may need to score more)
- Cleveland Browns: Alex Wright (DE) - OUT → Slight positive for Henry (one less pass rusher)
- Net Injury Impact: +3 to +5 rush attempts for Henry, but -0.5 to -1.0 YPA (backup QB = less threat, defense focuses on run). Net: More attempts but lower efficiency = similar total yards

📈 FINAL PREDICTION
Final Projection Calculation:
- Season Average: 78.2 yards
- Defensive Matchup Adjustment: -12 to -15 yards (elite defense)
- Game Script Adjustment: +2 to +3 yards (more attempts if leading)
- Injury Adjustment: +2 to +4 yards (more attempts, but lower efficiency)
- Final Projection: 68-72 yards

Expected Prediction: UNDER 76.5
- Edge: -4 to -8 yards
- Confidence: High (75-80%)

💰 WHY THIS WILL HIT
Henry's season average (78.2) is just above the line, but Cleveland's run defense is elite (allows 79.0 yds/game vs 115 league avg). Even though Lamar Jackson being out means more rush attempts for Henry, the Browns' defense will limit his efficiency. The model predicts 68-72 yards, giving a clear edge to UNDER.`,

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
- Will be tested more with Broncos' RB1 out

Matchup Impact:
- Neutral to slightly favorable matchup
- Chiefs' run defense won't shut down Harvey
- But Harvey is backup-level talent, not elite
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

  5066: `📊 PLAYER STATS (35% Weight)
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
- Cincinnati Bengals: Joe Flacco (QB) - OUT → MAJOR IMPACT - Backup QB starting. Bengals may run MORE (positive for Brown). Less effective passing = more rushing attempts. Conservative game plan with backup QB (+1 to +2 rush attempts)
- Cincinnati Bengals: Samaje Perine (RB) - OUT → Positive (less competition)
- Cincinnati Bengals: Trey Hendrickson (DE) - OUT → Defensive impact (may need to score more)
- Pittsburgh Steelers: T.J. Watt (LB) - OUT → MAJOR IMPACT - Steelers lose their best defensive player. Slight positive for Brown (easier to run). But Steelers' run defense is still solid without Watt
- Pittsburgh Steelers: Alex Highsmith (LB) - OUT → Slight positive
- Pittsburgh Steelers: Cameron Heyward (DT) - OUT → Slight positive
- Pittsburgh Steelers: Multiple defensive injuries → Slight positive for Brown
- Net Injury Impact: +1 to +2 rush attempts for Brown (Flacco out = more runs, Steelers injuries help)

📈 FINAL PREDICTION
Final Projection Calculation:
- Season Average: 12.0 attempts
- Defensive Matchup Adjustment: -1.0 to -1.5 attempts (tough defense)
- Game Script Adjustment: -1.5 to -2.0 attempts (underdog, may trail)
- Injury Adjustment: +1.0 to +1.5 attempts (Flacco out = more runs, Steelers injuries)
- Final Projection: 10.5-11.5 attempts

Expected Prediction: UNDER 14.5
- Edge: -3 to -4 attempts
- Confidence: High (75-80%)

💰 WHY THIS WILL HIT
Brown's season average (12.0) is well below the line, and the game script is negative (5.5-point underdog, likely to trail and pass more). Even with injuries helping (Flacco out = more runs, Steelers defensive injuries), Brown projects to only 10.5-11.5 attempts. The line of 14.5 is too high given the game script and matchup.`,

  4417: `📊 PLAYER STATS (35% Weight)
Season Performance (9 games):
- Receiving Yards: 686 total / 9 games = 76.2 yds/game
- Receptions: 51 total / 9 games = 5.67 rec/game
- Targets: 84 total / 9 games = 9.33 tgts/game
- Catch %: 60.7% (51/84) - Above average
- Yards Per Target: 8.2 (above average)
- Team: Minnesota Vikings

Consistency Analysis:
- Jefferson averages 76.2 yards, 4.7 above the 71.5 line
- Has exceeded 72 yards in 6 of 9 games (66.7% hit rate)
- 8.2 yards per target is excellent - efficient usage
- 60.7% catch rate is solid
- 9.33 targets/game shows he's the focal point of the offense

Performance vs Line:
- Season average (76.2) vs Line (71.5) → +4.7 yards edge (6.6% above line)

🛡️ DEFENSIVE MATCHUP (55% Weight) ⭐ KEY FACTOR
Chicago Bears Pass Defense:
- Receiving Yards Allowed to WRs: 160.0 yds/game (League Avg: ~190)
- Receiving TDs Allowed: 1.44 TDs/game (League Avg: ~1.2)
- Defensive Ranking: Top 10 pass defense (strong)

Key Defensive Factors:
- Bears allow 30.0 fewer yards than league average (-15.8% vs avg)
- This is a strong pass defense - top 10 in the NFL
- Allow 1.44 TDs/game to WRs (slightly above average)
- Bears' secondary has been solid this season

Matchup Impact:
- Tough matchup for Jefferson
- Bears' pass defense is strong - will limit his production
- But Jefferson is elite - can still produce against good defenses
- Home game helps (familiarity, crowd support)
- Matchup Adjustment: -3 to -5 yards

🎮 GAME ENVIRONMENT (10% Weight)
Vegas Lines:
- Spread: Minnesota -3.0 (Vikings favored at home)
- Total: ~46-48 points (estimated)
- Game Type: Non-divisional, Vikings at home

Expected Game Flow:
- Vikings are favored by 3.0 at home - expected to win
- Moderate total suggests balanced game
- If Vikings lead, balanced attack (moderate pass volume)
- If game is close, Jefferson will be heavily targeted
- Home game = better execution, crowd support

Key Injuries:
- Minnesota Vikings: Jonathan Greenard (OLB) - OUT → Defensive impact (may need to score more)
- Chicago Bears: Tyrique Stevenson (DB) - OUT → POSITIVE IMPACT - Bears lose a key defensive back (+2 to +3 yards for Jefferson)
- Chicago Bears: Jaquan Brisker (DB) - OUT → POSITIVE IMPACT - Bears lose another defensive back (+1 to +2 yards for Jefferson)
- Chicago Bears: Kevin Byard (DB) - OUT → POSITIVE IMPACT - Bears lose experienced safety (+1 to +2 yards for Jefferson)
- Chicago Bears: D.J. Moore (WR) - OUT → Offensive impact (Bears may pass less)
- Chicago Bears: Rome Odunze (WR) - OUT → Offensive impact
- Chicago Bears: Jahdae Walker (WR) - OUT → Offensive impact
- Chicago Bears: Multiple defensive back injuries → Significant positive for Jefferson
- Net Injury Impact: +4 to +6 yards for Jefferson (multiple Bears DBs out)

📈 FINAL PREDICTION
Final Projection Calculation:
- Season Average: 76.2 yards
- Defensive Matchup Adjustment: -3 to -5 yards (strong defense)
- Game Script Adjustment: +1 to +2 yards (favored at home)
- Injury Adjustment: +4 to +6 yards (multiple Bears DBs out)
- Final Projection: 74-79 yards

Expected Prediction: OVER 71.5
- Edge: +2.5 to +7.5 yards
- Confidence: Medium-High (70-75%)

💰 WHY THIS WILL HIT
Jefferson's season average (76.2) is above the line, and he's an elite receiver. The Bears have a strong pass defense, but multiple defensive back injuries significantly weaken it. The home game and favorable game script (Vikings favored) add to the positive factors. The model predicts 74-79 yards, giving a clear edge to OVER.`,

  5270: `📊 PLAYER STATS (35% Weight)
Season Performance (9 games):
- Receiving Yards: 693 total / 9 games = 77.0 yds/game
- Receptions: 64 total / 9 games = 7.11 rec/game
- Targets: 82 total / 9 games = 9.11 tgts/game
- Catch %: 78.0% (64/82) - ELITE
- Yards Per Target: 8.5 (excellent)
- Team: Detroit Lions

Consistency Analysis:
- St. Brown averages 77.0 yards, just 1.5 above the 75.5 line
- Has exceeded 76 yards in 5 of 9 games (55.6% hit rate)
- 78.0% catch rate is ELITE - one of the best in NFL
- 8.5 yards per target is excellent
- 9.11 targets/game shows he's heavily targeted

Performance vs Line:
- Season average (77.0) vs Line (75.5) → +1.5 yards edge (minimal)

🛡️ DEFENSIVE MATCHUP (55% Weight) ⭐ KEY FACTOR
Philadelphia Eagles Pass Defense:
- Receiving Yards Allowed to WRs: 149.8 yds/game (League Avg: ~190)
- Receiving TDs Allowed: 0.44 TDs/game (League Avg: ~1.2)
- Defensive Ranking: Top 5 pass defense (ELITE)

Key Defensive Factors:
- Eagles allow 40.2 fewer yards than league average (-21.2% vs avg)
- This is one of the best pass defenses in the NFL
- Only allow 0.44 TDs/game to WRs (less than half league average)
- Eagles' secondary is elite - very difficult to pass against

Matchup Impact:
- EXTREMELY TOUGH matchup for St. Brown
- Eagles' pass defense is elite - will significantly limit his production
- Even elite receivers struggle against this defense
- Road game makes it even tougher
- Matchup Adjustment: -8 to -12 yards

🎮 GAME ENVIRONMENT (10% Weight)
Vegas Lines:
- Spread: Philadelphia -2.5 (Eagles favored at home)
- Total: ~48-50 points (estimated)
- Game Type: Non-divisional, Lions on road

Expected Game Flow:
- Lions are 2.5-point underdogs on the road
- Moderate-high total suggests scoring expected
- If Lions trail, they'll pass more (positive for St. Brown)
- If game is close, balanced attack
- Road game adds difficulty - crowd noise, unfamiliar environment

Key Injuries:
- Detroit Lions: Sam LaPorta (TE) - OUT → POSITIVE IMPACT - Lions lose their primary TE. More targets for St. Brown (targets redistribute to WRs) (+2 to +3 yards for St. Brown)
- Detroit Lions: Brock Wright (TE) - OUT → Slight positive (more targets for WRs)
- Detroit Lions: Sione Vaki (RB) - OUT → Minimal impact
- Detroit Lions: Terrion Arnold (CB) - OUT → Defensive impact
- Detroit Lions: Aidan Hutchinson (DE) - OUT → Defensive impact
- Detroit Lions: Kerby Joseph (S) - OUT → Defensive impact
- Detroit Lions: Penei Sewell (T) - OUT → Offensive line impact (may affect passing)
- Philadelphia Eagles: No major defensive injuries reported
- Net Injury Impact: +2 to +3 yards for St. Brown (LaPorta out = more targets). But Eagles' elite defense will still limit production.

📈 FINAL PREDICTION
Final Projection Calculation:
- Season Average: 77.0 yards
- Defensive Matchup Adjustment: -8 to -12 yards (elite defense)
- Game Script Adjustment: +1 to +2 yards (may trail, pass more)
- Injury Adjustment: +2 to +3 yards (LaPorta out = more targets)
- Final Projection: 68-74 yards

Expected Prediction: UNDER 75.5
- Edge: -1.5 to -7.5 yards
- Confidence: Medium-High (70-75%)

💰 WHY THIS WILL HIT
St. Brown's season average (77.0) matches the line, but Philadelphia's pass defense is elite (allows 149.8 yds/game vs 190 avg). Even with LaPorta being out (which gives St. Brown more targets), the Eagles' elite secondary will limit his production. The road game adds difficulty. The model predicts 68-74 yards, giving an edge to UNDER.`,

  5274: `📊 PLAYER STATS (35% Weight)
Season Performance (9 games):
- Receiving Yards: 474 total / 9 games = 52.7 yds/game
- Receptions: 27 total / 9 games = 3.0 rec/game
- Targets: 43 total / 9 games = 4.78 tgts/game
- Catch %: 62.8% (27/43) - Above average
- Yards Per Target: 11.0 (excellent - big play threat)
- Team: Detroit Lions

Consistency Analysis:
- Williams averages 52.7 yards, 4.2 above the 48.5 line
- Has exceeded 49 yards in 5 of 9 games (55.6% hit rate)
- 11.0 yards per target is excellent - big play ability
- 62.8% catch rate is solid
- 4.78 targets/game shows he's WR2/WR3 (not primary target)

Performance vs Line:
- Season average (52.7) vs Line (48.5) → +4.2 yards edge (8.7% above line)

🛡️ DEFENSIVE MATCHUP (55% Weight) ⭐ KEY FACTOR
Philadelphia Eagles Pass Defense:
- Receiving Yards Allowed to WRs: 149.8 yds/game (League Avg: ~190)
- Receiving TDs Allowed: 0.44 TDs/game (League Avg: ~1.2)
- Defensive Ranking: Top 5 pass defense (ELITE)

Key Defensive Factors:
- Eagles allow 40.2 fewer yards than league average (-21.2% vs avg)
- This is one of the best pass defenses in the NFL
- Only allow 0.44 TDs/game to WRs (less than half league average)
- Eagles' secondary is elite - very difficult to pass against

Matchup Impact:
- EXTREMELY TOUGH matchup for Williams
- Eagles' pass defense is elite - will significantly limit his production
- Williams is WR2/WR3, so he'll see fewer targets than St. Brown
- Road game makes it even tougher
- Matchup Adjustment: -6 to -8 yards

🎮 GAME ENVIRONMENT (10% Weight)
Vegas Lines:
- Spread: Philadelphia -2.5 (Eagles favored at home)
- Total: ~48-50 points (estimated)
- Game Type: Non-divisional, Lions on road

Expected Game Flow:
- Lions are 2.5-point underdogs on the road
- Moderate-high total suggests scoring expected
- If Lions trail, they'll pass more (positive for Williams)
- If game is close, balanced attack
- Road game adds difficulty

Key Injuries:
- Detroit Lions: Sam LaPorta (TE) - OUT → POSITIVE IMPACT - Lions lose their primary TE. More targets for Williams (targets redistribute to WRs, but St. Brown gets most) (+1 to +2 yards for Williams)
- Detroit Lions: Brock Wright (TE) - OUT → Slight positive
- Detroit Lions: Multiple offensive injuries → May affect passing game efficiency
- Philadelphia Eagles: No major defensive injuries reported
- Net Injury Impact: +1 to +2 yards for Williams (LaPorta out = more targets). But limited impact since he's WR2/WR3.

📈 FINAL PREDICTION
Final Projection Calculation:
- Season Average: 52.7 yards
- Defensive Matchup Adjustment: -6 to -8 yards (elite defense)
- Game Script Adjustment: +0.5 to +1.0 yards (may trail, pass more)
- Injury Adjustment: +1 to +2 yards (LaPorta out = more targets)
- Final Projection: 49-52 yards

Expected Prediction: OVER 48.5 (Slight)
- Edge: +0.5 to +3.5 yards
- Confidence: Low-Medium (60-65%)

💰 WHY THIS WILL HIT
Williams' season average (52.7) is above the line, and he has big-play ability (11.0 yards per target). However, the Eagles' elite pass defense will limit his production, and he's WR2/WR3 (fewer targets than St. Brown). The injury to LaPorta helps slightly, but the model predicts 49-52 yards, giving only a slight edge to OVER based on his season average.`,

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
- 5.89 targets/game shows he's Mahomes' favorite target

Performance vs Line:
- Season average (60.0) vs Line (44.5) → +15.5 yards edge (MASSIVE)

🛡️ DEFENSIVE MATCHUP (55% Weight) ⭐ KEY FACTOR
Denver Broncos TE Defense:
- Receiving Yards Allowed to TEs: 53.5 yds/game (League Avg: ~55)
- Receiving TDs Allowed: 0.30 TDs/game (League Avg: ~0.5)
- Defensive Ranking: Average TE defense

Key Defensive Factors:
- Broncos allow 1.5 more yards than league average (+2.7% vs avg)
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
Kelce's season average (60.0) is massively above the line (15.5 yards, 34.8% above). He's hit over 45 yards in 88.9% of games. The matchup is neutral (average TE defense), and multiple Broncos defensive injuries help. The line of 44.5 is way too low for an elite TE averaging 60.0 yards. This is the strongest OVER play in the entire set.`,
};

async function main() {
  console.log('\n🎯 UPDATING 10 PLAYER PROP PREDICTIONS WITH DETAILED ANALYSES\n');
  console.log('='.repeat(80));
  
  const weekNumber = 11;
  const season = 2025;
  let updated = 0;
  let created = 0;
  
  for (const [propId, detailedAnalysis] of Object.entries(detailedAnalyses)) {
    const id = parseInt(propId);
    
    try {
      // Check if prediction exists
      const { data: existing } = await supabase
        .from('player_prop_predictions')
        .select('id, reasoning')
        .eq('prop_id', id)
        .eq('week_number', weekNumber)
        .eq('season', season)
        .maybeSingle();
      
      if (existing) {
        // Update existing prediction with detailed analysis
        const { error: updateError } = await supabase
          .from('player_prop_predictions')
          .update({
            reasoning: detailedAnalysis,
          })
          .eq('id', existing.id);
        
        if (!updateError) {
          updated++;
          console.log(`✅ Updated prop_id ${id} with detailed analysis`);
        } else {
          console.log(`❌ Failed to update prop_id ${id}: ${updateError.message}`);
        }
      } else {
        // Need to generate prediction first, then update
        console.log(`⚠️  Prop ${id} prediction doesn't exist yet - will need to generate first`);
        // For now, just note it - the generate script will handle it
      }
    } catch (error) {
      console.error(`❌ Error processing prop_id ${id}:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 SUMMARY: Updated ${updated} predictions with detailed analyses\n`);
  console.log(`\n💡 Note: For props that don't exist yet, run generate-10-detailed-prop-predictions.ts first\n`);
}

main().catch(console.error);

