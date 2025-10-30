# Odds Sync Guide

This guide explains how to use the odds synchronization functionality to fetch data from The Odds API and populate your Supabase `odds_bets` table.

## 📋 Overview

The odds sync system fetches real-time betting odds from [The Odds API](https://the-odds-api.com/) and stores them in your Supabase database. It supports:

- ✅ Automatic upsert (insert or update) based on `api_id`
- ✅ Error handling and detailed logging
- ✅ Support for multiple sports
- ✅ Manual or scheduled execution

## 🔧 Setup

### 1. Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# The Odds API Key
ODDS_API_KEY=d38b7f712b4ef276d719082f04a4c89e

# Optional: For securing the sync endpoint
CRON_SECRET=your-random-secret-key
```

### 2. Get Your API Keys

**Supabase:**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the `URL`, `anon/public` key, and `service_role` key

**The Odds API:**
1. Sign up at [The Odds API](https://the-odds-api.com/)
2. Get your free API key from the dashboard
3. Free tier includes 500 requests/month

## 🚀 Usage

### Method 1: Via API Endpoint (Recommended)

The sync functionality is exposed as a Next.js API route that can be called via HTTP:

```bash
# Trigger sync manually
curl http://localhost:3000/api/sync-odds

# Or use in your browser
http://localhost:3000/api/sync-odds
```

**Response Format:**
```json
{
  "success": true,
  "message": "Successfully synced 15 games (10 new, 5 updated)",
  "inserted": 10,
  "updated": 5,
  "failed": 0,
  "errors": [],
  "totalGames": 15
}
```

### Method 2: Using the Utility Function

Import and call the function directly in your code:

```typescript
import { syncOddsToDatabase } from '@/lib/syncOdds';

// Sync NFL odds
const result = await syncOddsToDatabase('americanfootball_nfl');
console.log(result.message);

// Sync NBA odds
const nbaResult = await syncOddsToDatabase('basketball_nba');

// Sync multiple sports
import { syncMultipleSports } from '@/lib/syncOdds';
const results = await syncMultipleSports([
  'americanfootball_nfl',
  'basketball_nba',
  'icehockey_nhl'
]);
```

### Method 3: Scheduled Sync with Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sync-odds",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This runs every 6 hours automatically.

### Method 4: Scheduled Sync with GitHub Actions

Create `.github/workflows/sync-odds.yml`:

```yaml
name: Sync Odds Data
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Sync
        run: |
          curl -X POST https://your-app.vercel.app/api/sync-odds \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## 📊 Database Schema

The `odds_bets` table stores the following data:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated primary key |
| `api_id` | TEXT | Unique ID from The Odds API |
| `sport_key` | TEXT | Sport identifier (e.g., "americanfootball_nfl") |
| `sport_title` | TEXT | Human-readable sport name (e.g., "NFL") |
| `commence_time` | TIMESTAMPTZ | When the game starts |
| `home_team` | TEXT | Home team name |
| `away_team` | TEXT | Away team name |
| `bookmakers` | JSONB | Array of bookmakers with markets and odds |
| `created_at` | TIMESTAMPTZ | When the record was created |
| `updated_at` | TIMESTAMPTZ | Auto-updated on changes |

## 🔍 Supported Sports

Common sport keys for The Odds API:

- `americanfootball_nfl` - NFL
- `basketball_nba` - NBA
- `icehockey_nhl` - NHL
- `baseball_mlb` - MLB
- `soccer_epl` - English Premier League
- `americanfootball_ncaaf` - College Football
- `basketball_ncaab` - College Basketball

[View all sports](https://the-odds-api.com/sports-odds-data/sports-apis.html)

## 🛡️ Security

### Securing the Endpoint

Add authentication to prevent unauthorized access:

```typescript
// In src/app/api/sync-odds/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // ... rest of the code
}
```

Then call with:
```bash
curl -H "Authorization: Bearer your-secret" http://localhost:3000/api/sync-odds
```

## 📝 Example Queries

### Query all NFL games
```sql
SELECT * FROM odds_bets 
WHERE sport_key = 'americanfootball_nfl' 
ORDER BY commence_time ASC;
```

### Get games happening today
```sql
SELECT * FROM odds_bets 
WHERE commence_time::date = CURRENT_DATE
ORDER BY commence_time;
```

### Extract specific bookmaker odds
```sql
SELECT 
  home_team,
  away_team,
  commence_time,
  bookmakers -> 0 -> 'title' as bookmaker,
  bookmakers -> 0 -> 'markets' -> 0 -> 'outcomes' as odds
FROM odds_bets
WHERE sport_key = 'americanfootball_nfl';
```

### Find games with DraftKings odds
```sql
SELECT 
  home_team,
  away_team,
  commence_time
FROM odds_bets
WHERE bookmakers @> '[{"key": "draftkings"}]'::jsonb;
```

## 🐛 Troubleshooting

### API Rate Limits
- Free tier: 500 requests/month
- Each sync uses 1 request
- Monitor usage in The Odds API dashboard

### Common Errors

**"Missing Supabase environment variables"**
- Ensure all environment variables are set in `.env.local`
- Restart your development server after adding variables

**"API request failed with status 401"**
- Your Odds API key is invalid or expired
- Get a new key from The Odds API dashboard

**"Upsert failed"**
- Check that the `api_id` column has a UNIQUE constraint
- Verify your Supabase service role key has write permissions

## 📚 Additional Resources

- [The Odds API Documentation](https://the-odds-api.com/liveapi/guides/v4/)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

