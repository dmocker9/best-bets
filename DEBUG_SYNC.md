# Debug Sync Function - Troubleshooting Guide

## 🐛 Current Debug Mode

The sync function is now in **DEBUG MODE** with extensive logging to help diagnose issues with:
1. Empty bookmakers arrays
2. Duplicate rows being created
3. Upsert logic not working correctly

## 🧪 Testing the Sync

### Step 1: Start Your Development Server
```bash
npm run dev
```

### Step 2: Trigger the Sync
Open your browser or use curl:

```bash
# Browser
http://localhost:3000/api/sync-odds

# Or curl
curl http://localhost:3000/api/sync-odds
```

### Step 3: Check the Console Output

The debug logs will show you:

#### 📦 **Raw API Data**
```
📦 RAW API DATA:
   Bookmakers array length: 15
   First bookmaker sample: {
     "key": "draftkings",
     "title": "DraftKings",
     "markets": [...]
   }
```

#### 🔍 **Flattening Process**
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
```

#### 💾 **Data Being Saved**
```
💾 DATA TO SAVE:
   Flattened bookmakers count: 15
   Flattened bookmakers: [
     {
       "bookmaker_name": "DraftKings",
       "home_team_price": -110,
       "away_team_price": -110,
       "home_team_line": 3,
       "away_team_line": -3
     },
     ...
   ]
```

#### 🔄 **Upsert Result**
```
🔄 Executing upsert...
✅ Upsert successful!
   Returned data: [
     {
       "id": "uuid-here",
       "api_id": "game_id",
       "bookmakers": [...]
     }
   ]
📊 Result: INSERTED new record
```

---

## 🔍 Common Issues and Solutions

### Issue 1: Empty Bookmakers Array

**Symptoms:**
```
⚠️  WARNING: No bookmakers after flattening!
```

**Possible Causes:**

1. **API has no spreads data**
   ```
   ⚠️  No spreads market found
   ```
   **Solution:** The API might not have spreads for this game. Check if it has other markets (h2h, totals).

2. **Team names don't match**
   ```
   ⚠️  No outcome found for home team: Buffalo Bills
   ```
   **Solution:** The team names in the API might be slightly different (e.g., "BUF" vs "Buffalo Bills"). Check the actual team names in the raw API data.

3. **Markets structure is different**
   ```
   Markets: 0
   ```
   **Solution:** The API response might have a different structure. Check the raw API sample.

### Issue 2: Duplicate Rows

**Symptoms:**
```
📊 Result: INSERTED new record
📊 Result: INSERTED new record  (should be UPDATED)
```

**Possible Causes:**

1. **No unique constraint on api_id**
   
   Check your database:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'odds_bets';
   ```
   
   You should see a UNIQUE constraint on `api_id`.

2. **api_id is changing**
   
   Check if the `api_id` from the API is the same on subsequent syncs:
   ```
   API ID: game_id_here
   ```

3. **onConflict not working**
   
   Make sure the table has:
   ```sql
   ALTER TABLE odds_bets ADD CONSTRAINT odds_bets_api_id_unique UNIQUE (api_id);
   ```

### Issue 3: Upsert Fails

**Symptoms:**
```
❌ Upsert error: { message: "...", code: "..." }
```

**Common Errors:**

- **Code 23505:** Unique violation - Check for existing duplicates
- **Code 42703:** Column doesn't exist - Check column names
- **Code 23503:** Foreign key violation - Check relationships

---

## 🔧 Quick Fixes

### Fix 1: Clear Duplicates

```sql
-- Find duplicates
SELECT api_id, COUNT(*) 
FROM odds_bets 
GROUP BY api_id 
HAVING COUNT(*) > 1;

-- Keep only the latest record for each api_id
DELETE FROM odds_bets a
USING odds_bets b
WHERE a.id < b.id 
AND a.api_id = b.api_id;
```

### Fix 2: Ensure Unique Constraint

```sql
-- Add unique constraint if missing
ALTER TABLE odds_bets 
ADD CONSTRAINT odds_bets_api_id_unique UNIQUE (api_id);
```

### Fix 3: Check Current Data

```sql
-- See what's in the database
SELECT 
  id,
  api_id,
  home_team,
  away_team,
  jsonb_array_length(bookmakers) as bookmaker_count,
  created_at,
  updated_at
FROM odds_bets
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 Debug Checklist

When testing, verify:

- [ ] **API is returning data**
  ```
  Fetched X games from The Odds API
  ```

- [ ] **Raw bookmakers exist**
  ```
  Bookmakers array length: > 0
  ```

- [ ] **Markets have spreads**
  ```
  ✓ Found spreads market with 2 outcomes
  ```

- [ ] **Team names match**
  ```
  ✓ Home: 3 (-110)
  ✓ Away: -3 (-110)
  ```

- [ ] **Flattened array has data**
  ```
  Flattened bookmakers count: > 0
  ```

- [ ] **Upsert succeeds**
  ```
  ✅ Upsert successful!
  ```

- [ ] **No duplicates on second run**
  ```
  🔄 Found existing record (ID: ...)
  📊 Result: UPDATED existing record
  ```

---

## 🚀 After Debugging

Once you've identified and fixed the issue:

### 1. Remove Debug Mode

In `src/app/api/sync-odds/route.ts`, change:

```typescript
// From
const gamesToProcess = games.slice(0, 1); // Only process first game

// To
const gamesToProcess = games; // Process all games
```

### 2. Reduce Logging

Remove or comment out excessive console.log statements:
```typescript
// Keep important logs
console.log(`Fetched ${games.length} games from The Odds API`);
console.log(`Successfully synced: ${game.home_team} vs ${game.away_team}`);

// Remove detailed debug logs
// console.log(`   First bookmaker sample:`, ...);
```

### 3. Test Full Sync

```bash
curl http://localhost:3000/api/sync-odds
```

Verify:
- No duplicates created
- Bookmakers arrays are populated
- Updates work on second run

---

## 📝 Sample Output (Good)

```
🧪 DEBUG MODE: Processing only first game for testing

============================================================
📋 Processing Game: Kansas City Chiefs @ Buffalo Bills
   API ID: 1234567890abcdef
   Sport: NFL (americanfootball_nfl)
   Start Time: 2025-11-04T16:00:00Z
============================================================

✨ No existing record found - will insert new

📦 RAW API DATA:
   Bookmakers array length: 15

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

💾 DATA TO SAVE:
   Flattened bookmakers count: 15

🔄 Executing upsert...
✅ Upsert successful!
📊 Result: INSERTED new record

✅ Successfully synced: Buffalo Bills vs Kansas City Chiefs
```

---

## 🆘 Still Having Issues?

Check the following:

1. **Environment Variables**
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   echo $ODDS_API_KEY
   ```

2. **Supabase Connection**
   ```typescript
   // Test in browser console
   console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
   ```

3. **API Key Validity**
   ```bash
   # Test the API directly
   curl "https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?regions=us&oddsFormat=american&apiKey=YOUR_KEY"
   ```

4. **Database Schema**
   ```sql
   \d odds_bets  -- In psql
   ```

---

**Good luck debugging! 🎯**

