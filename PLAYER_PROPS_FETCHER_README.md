# Player Props Fetcher Script

This script fetches NFL player props data from The Odds API and stores it in your Supabase `player_props` table.

## Setup

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `dotenv` - For environment variable management
- `node-fetch` - For making HTTP requests
- `@supabase/supabase-js` - For Supabase database operations

### 2. Configure Environment Variables

Copy the example environment file and add your credentials:

```bash
cp env.example.txt .env
```

Edit `.env` and add your Supabase credentials:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these values:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy the "Project URL" and "anon public" key

## Usage

### Run the Script

```bash
npm run fetch-props
```

Or directly with Node:

```bash
node fetch-ravens-dolphins-props.js
```

## What the Script Does

1. **Fetches Player Props** from The Odds API for Ravens vs. Dolphins
   - 7 different prop markets:
     - Passing Yards
     - Passing TDs
     - Rushing Yards
     - Rush Attempts
     - Receptions
     - Receiving Yards
     - Anytime TD

2. **Parses the Data** into structured rows with:
   - Event details (teams, time, etc.)
   - Player name
   - Prop market type
   - Bookmaker information
   - Betting lines and odds
   - Over/Under selections

3. **Inserts into Supabase** using batch upsert
   - Handles duplicates automatically
   - Uses unique constraint on: event_id, player_name, bookmaker_key, bet_type, line

4. **Logs Statistics**:
   - Total number of props inserted
   - Breakdown by prop market type
   - Breakdown by bookmaker
   - Any errors encountered

## Example Output

```
🏈 Fetching Ravens vs. Dolphins Player Props...

✅ API Response received
📊 Event: Baltimore Ravens @ Miami Dolphins
📅 Game Time: 11/10/2024, 1:00:00 PM
🏢 Bookmakers: 8

🔄 Parsing player props data...
✅ Parsed 456 player prop entries

📤 Inserting 456 rows into Supabase...
✅ Data successfully inserted into Supabase

📊 STATISTICS
══════════════════════════════════════════════════
Total Props Inserted: 456

By Prop Market:
  Pass Yards: 72
  Pass TDs: 48
  Rush Yards: 88
  Rush Attempts: 64
  Receptions: 72
  Reception Yards: 88
  Anytime TD: 24

By Bookmaker:
  draftkings: 63
  fanduel: 63
  betmgm: 63
  pointsbetus: 63
  mybookieag: 63
  bovada: 63
  betonlineag: 63
  williamhill_us: 63
══════════════════════════════════════════════════

✅ Script completed successfully in 3.45s
```

## Database Schema

The script inserts data into the `player_props` table with this structure:

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Auto-generated primary key |
| event_id | TEXT | Unique game identifier |
| sport_key | TEXT | Sport identifier (e.g., "americanfootball_nfl") |
| sport_title | TEXT | Sport name (e.g., "NFL") |
| commence_time | TIMESTAMP | Game start time |
| home_team | TEXT | Home team name |
| away_team | TEXT | Away team name |
| player_name | TEXT | Player's full name |
| prop_market | TEXT | Type of prop (e.g., "player_pass_yds") |
| bookmaker_key | TEXT | Bookmaker identifier |
| bookmaker_title | TEXT | Bookmaker display name |
| bet_type | TEXT | "Over", "Under", or player name for TDs |
| line | DECIMAL | The prop line (e.g., 275.5 yards), null for TDs |
| odds | INTEGER | American odds format (e.g., -110, +150) |
| last_update | TIMESTAMP | When the odds were last updated |
| created_at | TIMESTAMP | When the row was created |

## API Details

- **Endpoint**: `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/{event_id}/odds`
- **Event ID**: `677dbbb6ad96fc5f5b36bb20b43139dd` (Ravens vs. Dolphins)
- **Markets**: 7 different player prop markets
- **Regions**: US bookmakers
- **Odds Format**: American

## Error Handling

The script includes comprehensive error handling:

- ✅ Validates API responses
- ✅ Checks for missing environment variables
- ✅ Validates required fields before insertion
- ✅ Provides detailed error messages
- ✅ Handles duplicate entries gracefully
- ✅ Logs warnings for incomplete data

## Troubleshooting

### Missing environment variables
```
❌ Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables
```
**Solution**: Make sure you have a `.env` file with your Supabase credentials.

### API request failed
```
❌ API request failed: 401 Unauthorized
```
**Solution**: Check if your API key is valid and has remaining requests.

### Supabase insertion error
```
❌ Error inserting data into Supabase
```
**Solution**: Verify your Supabase credentials and check that the `player_props` table exists.

## Customization

To fetch props for a different game:

1. Find the event ID from The Odds API
2. Update the `EVENT_ID` constant in the script:
   ```javascript
   const EVENT_ID = 'your-new-event-id';
   ```

To add more prop markets:

1. Update the `markets` parameter in the API URL
2. Add the new market to the `PROP_MARKET_LABELS` object for better logging

## Notes

- The script uses upsert to handle duplicate entries
- Duplicate detection is based on: event_id, player_name, bookmaker_key, bet_type, and line
- Some props (like anytime TD) don't have a line value, so it's stored as NULL
- The script handles all 7 major NFL player prop markets

