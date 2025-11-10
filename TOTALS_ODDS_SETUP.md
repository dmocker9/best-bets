# Totals Odds Setup Guide

## Overview
This feature allows you to sync NFL game totals (over/under) odds from DraftKings into your Supabase database using the Odds API.

## Database Table

### Table: `totals_odds`
Stores over/under odds for NFL games from various bookmakers.

**Columns:**
- `id` (BIGSERIAL PRIMARY KEY) - Auto-incrementing unique identifier
- `game_id` (TEXT) - Unique game identifier from the Odds API
- `home_team` (TEXT) - Home team name
- `away_team` (TEXT) - Away team name
- `commence_time` (TIMESTAMPTZ) - Game start time
- `bookmaker` (TEXT) - Bookmaker name (DraftKings only)
- `over_line` (DECIMAL) - Point total for over bet
- `over_price` (INTEGER) - American odds for over bet (e.g., -110)
- `under_line` (DECIMAL) - Point total for under bet
- `under_price` (INTEGER) - American odds for under bet (e.g., -110)
- `week` (INTEGER) - NFL week number (1-18), automatically calculated from commence_time
- `last_update` (TIMESTAMPTZ) - When the bookmaker last updated these odds
- `created_at` (TIMESTAMPTZ) - When the record was created in our database

**Constraints:**
- Unique constraint on `(game_id, bookmaker)` - prevents duplicate odds from the same bookmaker for the same game

## API Endpoint

### Sync Totals Odds
**Endpoint:** `GET /api/sync-totals-odds`

This endpoint fetches the latest totals odds from the Odds API and stores them in the database.

**Response Example:**
```json
{
  "message": "Totals odds synced successfully",
  "gamesProcessed": 28,
  "recordsInserted": 215
}
```

## Usage

### 1. Sync Odds Data
Make a GET request to sync the latest odds:

```bash
curl http://localhost:3000/api/sync-totals-odds
```

Or visit in your browser:
```
http://localhost:3000/api/sync-totals-odds
```

### 2. Query the Data
You can query the database to get odds for specific games or bookmakers:

**Get all odds for a specific game:**
```sql
SELECT * FROM totals_odds 
WHERE game_id = 'your-game-id'
ORDER BY bookmaker;
```

**Get best over odds for a game:**
```sql
SELECT bookmaker, over_line, over_price
FROM totals_odds 
WHERE game_id = 'your-game-id'
ORDER BY over_price DESC
LIMIT 1;
```

**Get all odds for upcoming games:**
```sql
SELECT * FROM totals_odds 
WHERE commence_time > NOW()
ORDER BY commence_time, bookmaker;
```

**Get all odds for a specific week:**
```sql
SELECT * FROM totals_odds 
WHERE week = 10
ORDER BY commence_time;
```

**Get week breakdown:**
```sql
SELECT week, COUNT(*) as game_count
FROM totals_odds
GROUP BY week
ORDER BY week;
```

**Compare odds across bookmakers:**
```sql
SELECT 
  home_team,
  away_team,
  bookmaker,
  over_line,
  over_price,
  under_line,
  under_price
FROM totals_odds
WHERE home_team = 'Indianapolis Colts'
ORDER BY bookmaker;
```

## Data Source
The odds data comes from [The Odds API](https://the-odds-api.com/), specifically fetching DraftKings odds only. This provides consistent, high-quality odds from one of the most popular sportsbooks.

## Automation
You can automate the sync process by:
1. Setting up a cron job to call the endpoint periodically
2. Using a service like n8n to trigger the sync on a schedule
3. Adding a button in your UI to manually trigger syncs

## Notes
- The API uses upsert logic, so running the sync multiple times will update existing records rather than creating duplicates
- American odds format is used (e.g., -110, +150)
- All times are stored in UTC with timezone support
- The unique constraint ensures each bookmaker has only one record per game (the most recent)

