### NFL Player Stats Loader (2025)

This utility fetches weekly NFL player data using `nfl_data_py` for the 2025 season only, aggregates season totals, filters to a Top 100 cohort by position criteria, computes per-game and last-3-game averages, and upserts into Supabase.

### Prerequisites
- Python 3.10+
- A Supabase project with API URL and anon/service key

### Setup
1. Create and activate a virtual environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file in the project root with:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_service_or_anon_key
   # Optional: override table name (defaults to player_stats_2025)
   # PLAYER_STATS_TABLE=player_stats_2024
   ```

### Database
Run the SQL to create the destination table and indexes:
```sql
\i create_table.sql
```

This creates `public.player_stats_2025` and indexes on `player_name`, `position`, `team`.

### Running the Loader
```bash
python player_stats_loader.py
```

You should see progress logs:
- "Fetching data..."
- "Processing X players..."
- "Uploaded to Supabase"

### Notes
- Source: `nfl_data_py.import_weekly_data([2025])` (no fallback).
- If 2025 data isn't published yet by the source, the script will exit with a clear message. Try again later when the 2025 feed is available.
- Table name defaults to `player_stats_2025` to match the provided schema. If you need an alternate table, set `PLAYER_STATS_TABLE` in `.env`.
- Upsert uses `on_conflict='player_id'`.



