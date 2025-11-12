# 🏥 NFL Injury Data - Source & Usage

## Data Source

**All injury data comes from Pro Football Reference (PFR)**
- URL: https://www.pro-football-reference.com/players/injuries.htm
- Updated regularly by PFR (typically daily during the season)
- Includes official injury reports, practice status, and game availability

## How to Update Injury Data

To fetch the latest injury data and update your Supabase `injuries` table:

```bash
# Specify the week number (recommended)
npx tsx scrape-pfr-injuries-current.ts 10

# Or let it auto-calculate from date (may be inaccurate)
npx tsx scrape-pfr-injuries-current.ts
```

**Usage:**
- `npx tsx scrape-pfr-injuries-current.ts [week_number]`
- Week number must be between 1-18
- If not specified, it will try to calculate from the current date

This will:
1. ✅ Scrape the current injury report from Pro Football Reference
2. ✅ Parse player names, teams, positions, injuries, and practice status
3. ✅ Clear old data for the specified week
4. ✅ Insert fresh injury records into your `injuries` table with correct week/season
5. ✅ Display a summary report

## Data Fields

The `injuries` table contains:

| Field | Description |
|-------|-------------|
| `player_name` | Full player name |
| `team_abbr` | Team abbreviation (e.g., "ATL", "BUF") |
| `position` | Player position (e.g., "QB", "WR", "RB") |
| `game_status` | Out / Questionable / Doubtful / IR / null |
| `injury_comment` | Injury description (e.g., "Hamstring", "Knee") |
| `practice_status` | Full/Limited/Did Not Participate |
| `on_track_to_play` | Boolean - calculated from practice status |
| `week_number` | NFL week number |
| `season` | NFL season year |

## On Track to Play Logic

A player is considered "on track to play" if their practice status shows:
- ✅ **Full Participation** in Practice
- ✅ **Limited Participation** in Practice

A player is **NOT on track** if:
- ❌ **Did Not Participate** in Practice
- ❌ No practice status listed

## Automation

You can automate injury data updates using:
- **Cron jobs** - Run daily at 3 PM EST (when injury reports are typically finalized)
- **n8n workflows** - Schedule automated scraping
- **GitHub Actions** - CI/CD pipeline for regular updates

Example cron schedule (daily at 3 PM EST for Week 10):
```bash
# You'll need to update the week number manually each week
0 15 * * * cd /path/to/project && npx tsx scrape-pfr-injuries-current.ts 10
```

**Note:** Remember to update the week number parameter each week, or use a script to calculate it dynamically.

## Important Notes

⚠️ **Do NOT use ESPN API** for injury data - it's unreliable and often incomplete.

✅ **Pro Football Reference is the single source of truth** for injury data in this application.

## Sample Output

When you run the scraper, you'll see:
- Total injured players
- Breakdown by game status (Out/Questionable/Doubtful)
- Practice participation stats
- List of ruled-out players
- Teams with most injuries

## Integration with Prediction Models

The injury data is used by your prediction models to:
1. Adjust team strength ratings based on key player absences
2. Account for practice participation when predicting outcomes
3. Flag high-risk bets when star players are questionable

Key players (QB, RB, WR) have higher impact on predictions than others.

