# 🔬 Debug Guide: Pro Football Reference Scraping

## What Was Added

I've added **extensive debugging** to the scraping function to diagnose the Cardinals 400+ PPG issue.

---

## 🧪 Test Now

### Run This:
```bash
curl http://localhost:3000/api/sync-nfl-stats?week=9&season=2025
```

Or visit in browser:
```
http://localhost:3000/api/sync-nfl-stats?week=9&season=2025
```

---

## 📊 What You'll See

The terminal will now show **detailed debugging** for the Cardinals:

### 1. Table Headers
```
🔬 DEBUG: AFC Table Headers:
[0] "Tm" (data-stat="team")
[1] "G" (data-stat="g")
[2] "PF" (data-stat="points")           ← TOTAL Points
[3] "Yds" (data-stat="total_yards")
[4] "Ply" (data-stat="plays_offense")
[5] "Y/P" (data-stat="yards_per_play")  ← This is pre-calculated!
[6] "TO" (data-stat="turnovers")
...
```

**Key Finding**: The table might have a pre-calculated Y/P column!

### 2. Row Data for Cardinals
```
🔬 DEBUG: Row data for Arizona Cardinals:
[0] data-stat="wins" = "6"
[1] data-stat="losses" = "4"
[2] data-stat="g" = "10"
[3] data-stat="points" = "234"          ← TOTAL points, not PPG!
[4] data-stat="total_yards" = "3521"
[5] data-stat="plays_offense" = "605"
[6] data-stat="turnovers" = "12"
```

### 3. Raw Values Extracted
```
📝 Raw values extracted:
   points (total): "234"        ← This is TOTAL points
   games: "10"
   total_yards: "3521"
   plays_offense: "605"
   turnovers: "12"
```

### 4. Calculations
```
🧮 Calculations:
   234 points ÷ 10 games = 23.40 PPG    ← CORRECT!
   3521 yards ÷ 605 plays = 5.82 Y/P
```

### 5. Final Stats
```
📊 FINAL STATS SUMMARY:
   Points Per Game: 23.40       ← Should be ~20-25, not 400+
   Points Allowed: 25.10
   Yards/Play Off: 5.82
   Yards/Play Def: 5.45
   Turnover Diff: -3
```

### 6. Sanity Check
```
⚠️  WARNING: PPG seems too high (400.00) - might be reading total points!
```
This will only show if PPG > 50, indicating we're reading the wrong column.

---

## 🐛 Diagnosing the Issue

### Expected Output (Correct):
```
234 points ÷ 10 games = 23.40 PPG ✅
```

### If You See (Wrong):
```
234 points ÷ 1 games = 234.00 PPG ❌
```
**Problem**: `gamesPlayed` is 1 (default value), meaning we didn't find the "g" column.

### If You See (Wrong):
```
400 points ÷ 10 games = 40.00 PPG ❌
```
**Problem**: Reading wrong "points" column (maybe cumulative season total?).

---

## 🔍 What the Debug Shows

### 1. Table Structure
The debug will show you **exactly** which columns exist and their `data-stat` attributes.

**Look for:**
- `data-stat="points"` - Should be total points for the season
- `data-stat="g"` - Should be games played
- `data-stat="points_per_game"` - If this exists, we should use it directly!

### 2. Raw Values
Shows the **exact text** extracted from each cell before parsing.

**Look for:**
- Empty strings `""` - Column not found
- Wrong numbers - Wrong column index
- Non-numeric text - Parsing HTML incorrectly

### 3. Calculations
Shows the **math** being performed.

**Verify:**
- Total points is reasonable (200-350 for 10 games)
- Games played matches reality (should be 10-11 in Week 9)
- Division produces sensible PPG (20-35)

### 4. Final Values
Shows what will be saved to database.

**Check:**
- PPG is 15-35 (realistic NFL range)
- Not 100+ (total points)
- Not 400+ (cumulative or wrong column)

---

## 🔧 Possible Issues & Solutions

### Issue 1: Games Played = 1
**Symptom:**
```
games: "1"  (should be "10")
234 points ÷ 1 games = 234.00 PPG
```

**Cause**: Can't find `data-stat="g"` column.

**Fix**: Table structure changed. Update code to use correct column:
```typescript
// Try alternative column names
const gamesPlayedRaw = 
  teamRow.find('td[data-stat="g"]').text().trim() ||
  teamRow.find('td[data-stat="games"]').text().trim() ||
  teamRow.find('td[data-stat="gp"]').text().trim();
```

### Issue 2: Reading Wrong Points Column
**Symptom:**
```
points (total): "400"  (should be ~234)
```

**Cause**: Multiple "points" columns exist (season total vs per game).

**Fix**: Use more specific selector:
```typescript
// If PFR has a PPG column, use it directly
const ppgRaw = teamRow.find('td[data-stat="points_per_game"]').text().trim();
if (ppgRaw) {
  stats.points_per_game = parseFloat(ppgRaw);
} else {
  // Fall back to calculation
  const pointsFor = parseFloat(pointsForRaw) || 0;
  const gamesPlayed = parseFloat(gamesPlayedRaw) || 1;
  stats.points_per_game = pointsFor / gamesPlayed;
}
```

### Issue 3: Cardinals Not Found
**Symptom:**
```
⚠️  Could not find Arizona Cardinals in offensive stats
```

**Cause**: Team name mismatch.

**Fix**: Check exact spelling on PFR website and update `TEAM_NAME_MAP`:
```typescript
'Arizona Cardinals': 'Arizona Cardinals',  // Exact match
// OR if PFR uses abbreviation:
'Arizona Cardinals': 'ARI',
```

### Issue 4: Table ID Changed
**Symptom:**
```
(empty headers array)
```

**Cause**: Table ID is not `#AFC` anymore.

**Fix**: Inspect PFR HTML and update table selector:
```typescript
// Try different table IDs
$('table#AFC') 
$('table#team_stats')
$('table.stats_table')
```

---

## 📋 Debug Checklist

After running the test, verify:

- [ ] See "🔬 DEBUG: AFC Table Headers"
- [ ] Headers show correct columns (points, g, total_yards, etc.)
- [ ] See "🔬 DEBUG: Row data for Arizona Cardinals"
- [ ] Row data has realistic values (234 points, not 400+)
- [ ] See "📝 Raw values extracted"
- [ ] Raw points = 200-300 (not 400+)
- [ ] Raw games = 10-11 (not 1)
- [ ] See "🧮 Calculations"
- [ ] Math looks correct (234 ÷ 10 = 23.4)
- [ ] See "📊 FINAL STATS SUMMARY"
- [ ] PPG is 20-30 (not 100+)
- [ ] No WARNING about PPG being too high

---

## 📊 Expected Terminal Output

### Good Output (Correct):
```
🏈 Processing: Arizona Cardinals
   📊 Record: 6-4
   🕷️  Scraping Pro Football Reference for Arizona Cardinals...
   📍 URL: https://www.pro-football-reference.com/years/2025/

   🔬 DEBUG: AFC Table Headers:
   [0] "Tm" (data-stat="team")
   [1] "G" (data-stat="g")
   [2] "W" (data-stat="wins")
   [3] "L" (data-stat="losses")
   [4] "PF" (data-stat="points")
   ...

   ✅ Found Arizona Cardinals in offensive stats table

   🔬 DEBUG: Row data for Arizona Cardinals:
   [0] data-stat="wins" = "6"
   [1] data-stat="losses" = "4"
   [2] data-stat="g" = "10"
   [3] data-stat="points" = "234"
   [4] data-stat="total_yards" = "3521"
   [5] data-stat="plays_offense" = "605"
   ...

   📝 Raw values extracted:
      points (total): "234"
      games: "10"
      total_yards: "3521"
      plays_offense: "605"
      turnovers: "12"

   🧮 Calculations:
      234 points ÷ 10 games = 23.40 PPG
      3521 yards ÷ 605 plays = 5.82 Y/P

   📊 Final Offensive Stats: 23.4 PPG, 5.82 Y/P

   ✅ Found Arizona Cardinals in defensive stats table
   ... (defensive stats)

   ✅ SUCCESS: Scraped REAL data from Pro Football Reference!

   📊 FINAL STATS SUMMARY:
      Points Per Game: 23.40      ✅ Correct!
      Points Allowed: 25.10
      Yards/Play Off: 5.82
      Yards/Play Def: 5.45
      Turnover Diff: -3
```

### Bad Output (Wrong):
```
   📝 Raw values extracted:
      points (total): "400"      ❌ Wrong!
      games: "1"                 ❌ Wrong!

   🧮 Calculations:
      400 points ÷ 1 games = 400.00 PPG  ❌ Wrong!

   ⚠️  WARNING: PPG seems too high (400.00) - might be reading total points!
```

---

## 🎯 Next Steps

1. **Run the test** with Cardinals
2. **Copy the terminal output** here
3. **Look for the issues:**
   - Is `points` = 234 or 400+?
   - Is `games` = 10 or 1?
   - Is final PPG = 23.4 or 400+?
4. **Share the debug output** so we can fix the exact issue

---

## 🔍 Manual Verification

Visit PFR directly: https://www.pro-football-reference.com/years/2025/

Find Cardinals row and verify:
- **Total Points (PF)**: Should be ~234 for 10 games
- **Points Per Game**: Should be ~23.4
- **Games Played**: Should be 10

Compare with what the scraper found!

---

**Run the test now and let's see exactly what's being scraped!** 🔬


