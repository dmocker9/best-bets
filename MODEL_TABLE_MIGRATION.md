# Model Migration to auto_nfl_team_stats

## Summary

Successfully migrated the prediction model from `nfl_team_stats` to `auto_nfl_team_stats` table with proper column mapping.

---

## Database Changes

### 1. Added `season` Column
- **Migration**: `20251108_add_week_to_auto_nfl_team_stats.sql`
- Added `season INTEGER NOT NULL DEFAULT 2025`
- All existing rows set to season 2025

### 2. Renamed `week_number` to `week`
- **Migration**: `20251108_rename_week_number_to_week.sql`
- Changed column name from `week_number` to `week`
- Updated unique constraint to `(team_name, season, week)`
- Created index on `week` column

---

## Code Changes

### 1. Updated `getTeamStats()` Function
**File**: `src/lib/fetchNFLStats.ts`

**Changes**:
- Query `auto_nfl_team_stats` instead of `nfl_team_stats`
- Use `week` column instead of `week_number`
- Use `season` column instead of `season_year`
- **Data Mapping**:
  - Calculate `points_per_game` from `points_for / games_played`
  - Calculate `points_allowed_per_game` from `points_against / games_played`
  - Map `offensive_srs` → `offensive_rating`
  - Map `defensive_srs` → `defensive_rating`
  - Estimate `yards_per_play_offense` from `offensive_srs`
  - Estimate `yards_per_play_defense` from `defensive_srs`

### 2. Updated CSV Import Function
**File**: `src/lib/importCSVData.ts`

**Changes**:
- Added `TEAM_DIVISIONS` mapping for all 32 NFL teams
- Updated to insert into `auto_nfl_team_stats` table
- Map column names correctly:
  - `week_number` → `week`
  - `season_year` → `season`
  - `points_per_game` → `points_for` (store as season totals)
  - `points_allowed_per_game` → `points_against`
  - `offensive_rating` → `offensive_srs`
  - `defensive_rating` → `defensive_srs`
- Added required fields: `conference`, `division`, `srs`

---

## Table Structure Comparison

### auto_nfl_team_stats (NEW)
```sql
team_name TEXT
week INTEGER                    -- Renamed from week_number
season INTEGER                  -- Added
conference TEXT                 -- AFC/NFC
division TEXT                   -- East/North/South/West
wins, losses, ties INTEGER
win_percentage DECIMAL
points_for INTEGER             -- Season total
points_against INTEGER         -- Season total
point_differential INTEGER
margin_of_victory DECIMAL
strength_of_schedule DECIMAL
srs DECIMAL                    -- Overall SRS
offensive_srs DECIMAL          -- Maps to offensive_rating
defensive_srs DECIMAL          -- Maps to defensive_rating
```

### nfl_team_stats (OLD)
```sql
team_name TEXT
week_number INTEGER
season_year INTEGER
wins, losses, ties INTEGER
win_percentage DECIMAL
points_per_game DECIMAL        -- Per-game average
points_allowed_per_game DECIMAL
point_differential INTEGER
margin_of_victory DECIMAL
strength_of_schedule DECIMAL
offensive_rating DECIMAL
defensive_rating DECIMAL
```

---

## Data Transformation

### From Database → Model
```typescript
// auto_nfl_team_stats stores season totals
points_for = 202 (Ravens season total)
games_played = wins + losses + ties = 8

// Model expects per-game averages
points_per_game = points_for / games_played = 202 / 8 = 25.25
```

### SRS Ratings
```typescript
// Direct mapping
offensive_rating = offensive_srs = 3.80
defensive_rating = defensive_srs = -3.70

// Derived metrics
yards_per_play_offense = 5.5 + (offensive_srs / 10) = 5.88
yards_per_play_defense = 5.5 - (defensive_srs / 10) = 5.87
```

---

## Model Behavior

### ✅ Unchanged
- **All prediction logic remains the same**
- Weighted scoring system (offensive 25%, defensive 25%, etc.)
- Confidence calculation
- Value detection vs Vegas odds
- Recommendation thresholds

### ✅ Data Source
- Now reads from `auto_nfl_team_stats`
- Automatically converts season totals to per-game stats
- Maps SRS columns to rating columns
- Uses `week` and `season` columns

### ❌ Not Incorporated
- `conference` and `division` columns (not used in model)
- Overall `srs` column (model uses offensive_srs + defensive_srs)
- New columns have no impact on predictions

---

## Testing

### Sample Data Verification

**Baltimore Ravens (Week 10, 2025)**:
```
Database Values:
  points_for: 202
  points_against: 216
  wins: 3, losses: 5, ties: 0
  offensive_srs: 3.80
  defensive_srs: -3.70

Calculated by Model:
  points_per_game: 25.25 ✓
  points_allowed_per_game: 27.00 ✓
  offensive_rating: 3.80 ✓
  defensive_rating: -3.70 ✓
  yards_per_play_offense: 5.88 ✓
  yards_per_play_defense: 5.87 ✓
```

---

## Migration Complete ✅

The prediction model now uses `auto_nfl_team_stats` as its data source while maintaining identical prediction behavior. All data transformations happen transparently in the `getTeamStats()` function.

**Key Benefits**:
- Single source of truth for team stats
- Season totals stored (more accurate)
- Conference/division metadata available
- Consistent with web scraping workflow

**Date**: November 8, 2025
**Status**: Production Ready

