# ✅ Formatted Values with +/- Signs - Complete

## What Was Done

### Database Changes Applied

**1. Column Type Conversion**
All four columns were converted from numeric types to TEXT to support the '+' prefix:
- `home_price`: INTEGER → TEXT
- `away_price`: INTEGER → TEXT  
- `home_spread`: DECIMAL(4,1) → TEXT
- `home_spread`: DECIMAL(4,1) → TEXT

**2. Automatic Backfill During Conversion**
The migration automatically formatted all existing 28 games during the type conversion:
- Positive values got '+' prefix: `340` → `+340`, `7.5` → `+7.5`
- Negative values kept '-' prefix: `-440` → `-440`, `-7.5` → `-7.5`

**3. Updated Trigger Functions**
Both trigger functions now format values automatically:

**`update_moneyline_prices()`** - Formats price columns:
```sql
IF price >= 0 THEN
  NEW.home_price := '+' || price::TEXT;
ELSE
  NEW.home_price := price::TEXT;
END IF;
```

**`update_spread_values()`** - Formats spread columns:
```sql
IF spread >= 0 THEN
  NEW.home_spread := '+' || spread::TEXT;
ELSE
  NEW.home_spread := spread::TEXT;
END IF;
```

## Examples of Formatted Values

### Before vs After

| Column | Old Value | New Value |
|--------|-----------|-----------|
| `home_price` | `340` | `+340` |
| `away_price` | `-440` | `-440` |
| `home_spread` | `7.5` | `+7.5` |
| `away_spread` | `-7.5` | `-7.5` |

### Real Data from Your Database

```
Miami Dolphins vs Baltimore Ravens
├─ home_price:   +340   (Dolphins underdog moneyline)
├─ away_price:   -440   (Ravens favorite moneyline)
├─ home_spread:  +7.5   (Dolphins get 7.5 points)
└─ away_spread:  -7.5   (Ravens give 7.5 points)

New England Patriots vs Atlanta Falcons
├─ home_price:   -258   (Patriots favorite moneyline)
├─ away_price:   +210   (Falcons underdog moneyline)
├─ home_spread:  -5.5   (Patriots give 5.5 points)
└─ away_spread:  +5.5   (Falcons get 5.5 points)

Green Bay Packers vs Carolina Panthers
├─ home_price:   -1000  (Packers heavy favorite)
├─ away_price:   +650   (Panthers big underdog)
├─ home_spread:  -13.5  (Packers give 13.5 points)
└─ away_spread:  +13.5  (Panthers get 13.5 points)
```

## Verification Results ✅

All 28 games are properly formatted:
- ✅ 28 games with prices (all formatted with +/-)
- ✅ 28 games with spreads (all formatted with +/-)
- ✅ 100% properly formatted prices
- ✅ 100% properly formatted spreads

## How It Works Now

### On Data Sync
When you sync odds from the API:
1. API returns raw numeric values (e.g., `340`, `-440`)
2. Values stored in `bookmakers` JSONB as numbers
3. Triggers automatically format them with +/- when extracting to columns
4. Result: `+340`, `-440` stored in TEXT columns

### Query Examples

```sql
-- Get all games with formatted values
SELECT 
  home_team,
  away_team,
  home_price,
  away_price,
  home_spread,
  away_spread
FROM odds_bets
ORDER BY commence_time;

-- Find big underdogs (positive spreads > +7)
SELECT 
  home_team,
  away_team,
  home_spread,
  home_price
FROM odds_bets
WHERE home_spread LIKE '+%'
  AND CAST(REPLACE(home_spread, '+', '') AS DECIMAL) > 7.0
ORDER BY CAST(REPLACE(home_spread, '+', '') AS DECIMAL) DESC;

-- Find big favorites (negative spreads < -7)  
SELECT 
  home_team,
  away_team,
  home_spread,
  home_price
FROM odds_bets
WHERE home_spread LIKE '-%'
  AND CAST(REPLACE(home_spread, '-', '') AS DECIMAL) > 7.0
ORDER BY CAST(REPLACE(home_spread, '-', '') AS DECIMAL) DESC;
```

## Understanding the Format

### Why +/- Signs Matter in Betting

**Moneyline Prices:**
- `-440` = Favorite (bet $440 to win $100)
- `+340` = Underdog (bet $100 to win $340)

**Point Spreads:**
- `-7.5` = Favorite (must win by 8+ points to cover)
- `+7.5` = Underdog (can lose by 7 or win outright to cover)

The explicit `+` sign makes it immediately clear which team is the underdog, which is standard in sports betting displays.

## Benefits

### Before (without + signs)
```
home_price: 340    ← Is this positive or just missing the sign?
away_price: -440   ← Clearly negative
```

### After (with + signs)
```
home_price: +340   ← Explicitly positive (underdog)
away_price: -440   ← Explicitly negative (favorite)
```

### Display Improvements
- ✅ **Clarity**: No ambiguity about positive vs negative values
- ✅ **Standard Format**: Matches industry betting display standards
- ✅ **Better UX**: Users immediately recognize favorites (+) vs underdogs (-)
- ✅ **Consistency**: All values explicitly show their sign

## Future Syncs

All future data syncs will automatically:
1. Fetch odds from The Odds API
2. Extract numeric values from bookmakers
3. Format with +/- signs via triggers
4. Store formatted strings in TEXT columns

**No additional action needed** - it's fully automated! 🎉

## Files Modified

| File | Change |
|------|--------|
| Migration: `20251029_format_prices_and_spreads_with_signs.sql` | ✅ Applied |
| `recreate_odds_bets_table.sql` | ✅ Updated column types and triggers |
| Database columns | ✅ Converted to TEXT with formatting |
| Trigger functions | ✅ Updated to format with +/- |
| Existing data | ✅ Backfilled with formatting |

## Current Status

| Item | Status |
|------|--------|
| Column types | ✅ TEXT (was numeric) |
| Trigger functions | ✅ Format with +/- |
| Existing 28 games | ✅ All formatted |
| Future syncs | ✅ Will auto-format |

## Notes

### Sorting Considerations
Since values are now TEXT instead of numeric, SQL sorting will be alphabetical, not numeric:
- Alphabetical: "-100", "-200", "-440", "+100", "+340"
- Numeric order would be: "-440", "-200", "-100", "+100", "+340"

To sort numerically, cast back to numeric:
```sql
ORDER BY CAST(REPLACE(REPLACE(home_price, '+', ''), '-', '') AS INTEGER)
```

Or simpler, if you want signed sorting:
```sql
ORDER BY CAST(REPLACE(home_price, '+', '') AS INTEGER)
```

### Querying Positive vs Negative
```sql
-- Find all underdogs (positive values)
WHERE home_price LIKE '+%'

-- Find all favorites (negative values)  
WHERE home_price LIKE '-%'

-- Convert back to number for calculations
CAST(REPLACE(home_price, '+', '') AS INTEGER)
```

## All Set! 🎉

Your betting odds now display with proper +/- formatting, making it crystal clear which teams are favorites and underdogs at a glance!


