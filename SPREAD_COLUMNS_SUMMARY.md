# ✅ Spread Columns Implementation - Complete

## What Was Done

### ✅ Database Changes
1. **Added two new columns** to the `odds_bets` table:
   - `away_spread` (DECIMAL 4,1) - Stores away team spread points
   - `home_spread` (DECIMAL 4,1) - Stores home team spread points

2. **Created indexes** for fast querying:
   - `idx_odds_bets_away_spread`
   - `idx_odds_bets_home_spread`

3. **Added trigger function** `update_spread_values()`:
   - Automatically extracts spread values from bookmakers JSON
   - Populates spread columns on INSERT/UPDATE

### ✅ Code Updates
1. **Updated API sync function** (`src/lib/syncOdds.ts`):
   - Added `markets=h2h,spreads` to API URL
   - Now fetches both moneyline AND spread data

2. **Updated API route** (`src/app/api/sync-odds/route.ts`):
   - Added `markets=h2h,spreads` to API URL
   - Ensures spread data is included in sync

3. **Updated recreate script** (`recreate_odds_bets_table.sql`):
   - Added spread columns
   - Added trigger function
   - Future-proofed for table recreation

## 🎯 Next Steps: Populate the Spread Data

Your existing 28 games in the database have **NULL spread values** because they were synced before this update. To populate the spread columns:

### Option 1: Use the UI (Easiest) ✨
1. Open your application in a browser
2. Click the **"🔄 Sync Odds Data"** button
3. Wait for the sync to complete
4. Check the results - all 28 games should be **updated** with spread data

### Option 2: Use the Terminal
```bash
# Make sure your dev server is running
npm run dev

# In another terminal, trigger the sync:
curl http://localhost:3000/api/sync-odds
```

### Option 3: Manual SQL Update (Testing)
If you want to test the trigger without a full sync:
```sql
-- This will trigger the function to extract spread values from existing data
UPDATE odds_bets 
SET bookmakers = bookmakers 
WHERE id IN (SELECT id FROM odds_bets LIMIT 1);
```

However, this won't work because the **existing bookmakers data doesn't have spread values yet**. You need to do a fresh sync from the API.

## 📊 Verify It Worked

After syncing, run this query to check the spread values:

```sql
SELECT 
  home_team,
  away_team,
  home_spread,
  away_spread,
  commence_time
FROM odds_bets
WHERE home_spread IS NOT NULL
ORDER BY commence_time
LIMIT 10;
```

You should see something like:
```
home_team         | away_team          | home_spread | away_spread | commence_time
------------------+-------------------+-------------+-------------+------------------
Miami Dolphins    | Baltimore Ravens   |     7.5     |    -7.5     | 2025-10-31 00:15
New England Pat.. | Atlanta Falcons    |    -5.5     |     5.5     | 2025-11-02 18:00
...
```

## 🎉 Understanding the Results

### Spread Values Explained
- **Negative spread** (e.g., -7.5) = Favored team (expected to win by that margin)
- **Positive spread** (e.g., +7.5) = Underdog team (can lose by that margin and still "cover")

### Example from Your API Data:
```json
Baltimore Ravens @ Miami Dolphins

Spread: Ravens -7.5 / Dolphins +7.5
```

This means:
- Ravens are **7.5-point favorites** (need to win by 8+ to cover)
- Dolphins are **7.5-point underdogs** (can lose by 7 or less and still cover)

After sync, your database will have:
- `away_spread: -7.5` (Ravens)
- `home_spread: 7.5` (Dolphins)

## 📝 Files Changed

| File | Change |
|------|--------|
| Migration: `20251029_add_spread_columns.sql` | ✅ Applied |
| `src/lib/syncOdds.ts` | ✅ Updated API URL |
| `src/app/api/sync-odds/route.ts` | ✅ Updated API URL |
| `recreate_odds_bets_table.sql` | ✅ Updated for reference |

## 🔧 Current Status

| Component | Status |
|-----------|--------|
| Database columns | ✅ Created |
| Indexes | ✅ Created |
| Trigger function | ✅ Active |
| API sync code | ✅ Updated |
| Existing data | ⏳ **Needs sync** |

## ⚠️ Important Notes

1. **The existing 28 games have NULL spreads** - this is expected! They were synced before the update.

2. **After you sync**, all 28 games should update with the latest spread data from The Odds API.

3. **The trigger automatically populates** `away_spread` and `home_spread` from the first bookmaker's data whenever:
   - New games are inserted
   - Existing games are updated
   - Bookmakers data changes

4. **Multiple bookmakers** - While the dedicated columns store the first bookmaker's spread, all bookmaker spreads are still available in the `bookmakers` JSONB column.

## 🚀 Ready to Go!

Everything is set up and ready. Just click the **"Sync Odds Data"** button in your app to populate the spread columns!

---

For detailed documentation, see: `SPREAD_COLUMNS_GUIDE.md`


