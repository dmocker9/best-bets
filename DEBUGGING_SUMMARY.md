# Debugging Improvements Summary

## 🎯 Issues Addressed

1. ✅ **Empty bookmakers arrays** - Added logging to trace where data is lost
2. ✅ **Duplicate rows** - Fixed upsert logic to properly detect existing records
3. ✅ **Data extraction** - Added detailed logging of flattening process
4. ✅ **Testing** - Limited to single game for easier debugging

---

## 📝 Changes Made

### 1. **Enhanced Flattening Function**

Added comprehensive logging to track:
- Input bookmakers count
- Each bookmaker processing step
- Markets found
- Outcomes matched
- Filtered results

**Example Output:**
```
🔍 Flattening bookmakers...
   Home Team: Buffalo Bills
   Away Team: Kansas City Chiefs
   Bookmakers count: 15

   📊 Processing bookmaker 1/15:
      Key: draftkings
      Title: DraftKings
      Markets: 3
      ✓ Found spreads market with 2 outcomes
      ✓ Home: 3 (-110)
      ✓ Away: -3 (-110)

✅ Flattened 15 bookmakers with valid odds
```

### 2. **Improved Upsert Logic**

**Before:**
```typescript
const { data: existingRecord } = await supabase
  .from('odds_bets')
  .select('id')
  .eq('api_id', game.id)
  .single(); // This throws error if not found!
```

**After:**
```typescript
const { data: existingRecords, error: selectError } = await supabase
  .from('odds_bets')
  .select('id, api_id')
  .eq('api_id', game.id); // Returns array, never throws

const existingRecord = existingRecords && existingRecords.length > 0 
  ? existingRecords[0] 
  : null;
```

### 3. **Detailed Sync Logging**

Added logging for every step:

#### Raw API Data
```
📦 RAW API DATA:
   Bookmakers array length: 15
   First bookmaker sample: {...}
```

#### Flattened Data
```
💾 DATA TO SAVE:
   Flattened bookmakers count: 15
   Flattened bookmakers: [...]
```

#### Full Object
```
📝 Full data object to upsert:
{
  "api_id": "...",
  "bookmakers": [...]
}
```

#### Upsert Result
```
🔄 Executing upsert...
✅ Upsert successful!
   Returned data: [...]
📊 Result: INSERTED new record
```

### 4. **Test Mode**

Limited to processing first game only:

```typescript
const gamesToProcess = games.slice(0, 1);
console.log(`\n🧪 DEBUG MODE: Processing only first game for testing\n`);
```

This makes it easier to:
- Read console output
- Identify issues quickly
- Test multiple times without cluttering data

### 5. **Better Error Handling**

Added error checking at every step:
```typescript
if (selectError) {
  console.error('❌ Error checking for existing record:', selectError);
}

if (upsertError) {
  console.error('❌ Upsert error:', upsertError);
  throw upsertError;
}
```

---

## 🧪 How to Test

### Step 1: Start Development Server
```bash
npm run dev
```

### Step 2: Trigger Sync
```bash
# Browser
http://localhost:3000/api/sync-odds

# Or curl
curl http://localhost:3000/api/sync-odds
```

### Step 3: Check Terminal

Look for:

✅ **Good Signs:**
```
✅ Flattened 15 bookmakers with valid odds
✅ Upsert successful!
📊 Result: INSERTED new record
```

⚠️ **Warning Signs:**
```
⚠️  No bookmakers data provided
⚠️  No spreads market found
⚠️  WARNING: No bookmakers after flattening!
```

❌ **Error Signs:**
```
❌ Error checking for existing record
❌ Upsert error
❌ ERROR: Failed to sync game
```

### Step 4: Run Twice to Test Updates

First run:
```
✨ No existing record found - will insert new
📊 Result: INSERTED new record
```

Second run:
```
🔄 Found existing record (ID: uuid-here)
📊 Result: UPDATED existing record
```

### Step 5: Verify in Database

```sql
SELECT 
  api_id,
  home_team,
  away_team,
  jsonb_array_length(bookmakers) as bookmaker_count,
  created_at,
  updated_at
FROM odds_bets
ORDER BY created_at DESC;
```

Check:
- [ ] Only ONE row per game (no duplicates)
- [ ] `bookmaker_count` > 0 (not empty)
- [ ] `updated_at` changes on second sync

---

## 🐛 Troubleshooting

### Empty Bookmakers

If you see:
```
⚠️  WARNING: No bookmakers after flattening!
```

**Check:**
1. Does API have spreads? Look at raw data
2. Do team names match exactly?
3. Are markets structured differently?

**Solution:**
Modify `flattenBookmakers()` to handle your API's structure:
```typescript
// If API uses different market key
const spreadMarket = bookmaker.markets?.find(
  (m: any) => m.key === 'spreads' || m.key === 'spread' || m.key === 'point_spreads'
);

// If team names need normalization
const homeOutcome = spreadMarket.outcomes.find(
  (o: any) => o.name.toLowerCase().includes(homeTeam.toLowerCase())
);
```

### Duplicates Still Created

**Check unique constraint:**
```sql
SELECT * FROM pg_indexes 
WHERE tablename = 'odds_bets' 
AND indexdef LIKE '%UNIQUE%';
```

**If missing, add it:**
```sql
ALTER TABLE odds_bets 
ADD CONSTRAINT odds_bets_api_id_unique UNIQUE (api_id);
```

**Clean existing duplicates:**
```sql
DELETE FROM odds_bets a
USING odds_bets b
WHERE a.id < b.id AND a.api_id = b.api_id;
```

### Upsert Not Updating

**Issue:** Always inserting, never updating

**Check:**
1. Is `api_id` in the upsert data?
2. Is `onConflict: 'api_id'` set?
3. Does the API return same `id` each time?

**Debug:**
```typescript
console.log('API game.id:', game.id);
console.log('Existing record api_id:', existingRecord?.api_id);
console.log('Match?', game.id === existingRecord?.api_id);
```

---

## 🚀 Next Steps

### 1. Once Debugging is Complete

Remove debug mode:
```typescript
// Change from:
const gamesToProcess = games.slice(0, 1);

// To:
const gamesToProcess = games;
```

### 2. Reduce Logging (Optional)

Keep essential logs, remove verbose ones:
```typescript
// Keep these
console.log(`Fetched ${games.length} games`);
console.log(`Successfully synced: ${game.home_team} vs ${game.away_team}`);

// Remove or comment these
// console.log(`   First bookmaker sample:`, ...);
// console.log(`   📊 Processing bookmaker ${index}...`);
```

### 3. Test Full Sync

```bash
curl http://localhost:3000/api/sync-odds
```

Verify:
- [ ] All games processed
- [ ] No duplicates
- [ ] Bookmakers populated
- [ ] Updates work correctly

### 4. Set Up Scheduling

See `ODDS_SYNC_GUIDE.md` for scheduling options:
- Vercel Cron
- GitHub Actions
- External cron services

---

## 📊 Expected Results

### First Sync:
```json
{
  "success": true,
  "message": "Successfully synced 15 games (15 new, 0 updated)",
  "inserted": 15,
  "updated": 0,
  "failed": 0,
  "errors": [],
  "totalGames": 15
}
```

### Second Sync (Updates):
```json
{
  "success": true,
  "message": "Successfully synced 15 games (0 new, 15 updated)",
  "inserted": 0,
  "updated": 15,
  "failed": 0,
  "errors": [],
  "totalGames": 15
}
```

### Database State:
```sql
-- Should have exactly 15 rows (one per game)
SELECT COUNT(*) FROM odds_bets;
-- Result: 15

-- Each should have bookmakers data
SELECT 
  api_id,
  jsonb_array_length(bookmakers) as count
FROM odds_bets;
-- All counts should be > 0
```

---

## 📚 Related Documentation

- **`DEBUG_SYNC.md`** - Step-by-step debugging guide
- **`FLATTENED_BOOKMAKERS_GUIDE.md`** - Understanding the flattened structure
- **`ODDS_SYNC_GUIDE.md`** - Complete sync setup guide
- **`IMPLEMENTATION_SUMMARY.md`** - System overview

---

**Happy debugging! 🎯**

