# 🏈 NFL Snap Counts Data

## Overview

Snap counts track how many offensive, defensive, and special teams snaps each player participates in. This is **crucial data** for betting models as it shows:
- Player usage and importance to the team
- Who's actually on the field vs. who's on the roster
- Workload distribution (especially for RBs and WRs)
- Which players are truly "starters" vs backups

## Data Source

**Pro Football Reference** - Team-by-team snap count pages:
- URL Pattern: `https://www.pro-football-reference.com/teams/[TEAM]/2025-snap-counts.htm`
- Example: https://www.pro-football-reference.com/teams/nwe/2025-snap-counts.htm
- Updated weekly during the NFL season

## Database Structure

The `snap_counts` table contains:

| Column | Description |
|--------|-------------|
| `player_name` | Full player name |
| `team_abbr` | Team abbreviation (ARI, ATL, BAL, etc.) |
| `position` | Player position |
| `offensive_snaps` | Total offensive snaps played |
| `offensive_snap_pct` | Percentage of team's offensive snaps |
| `defensive_snaps` | Total defensive snaps played |
| `defensive_snap_pct` | Percentage of team's defensive snaps |
| `special_teams_snaps` | Total special teams snaps played |
| `special_teams_snap_pct` | Percentage of ST snaps |
| `week_number` | NFL week (1-18) |
| `season` | Season year (2025) |

## How to Scrape Snap Counts

```bash
# Scrape all 32 teams for a specific week
npx tsx scrape-snap-counts.ts 10

# The week parameter is required
npx tsx scrape-snap-counts.ts [week_number]
```

### ⚠️ Important Notes:

1. **Rate Limiting**: Pro Football Reference will rate-limit you (429 errors) if you scrape too frequently
   - Allow 24+ hours between full 32-team scrapes
   - The scraper already includes 1-second delays between teams
   - Retries failed requests once automatically

2. **Timing**: Best time to scrape snap counts:
   - **Tuesday/Wednesday** after the previous week's games complete
   - Data is cumulative for the season through that week

3. **Season-Long Data**: Snap counts on PFR are cumulative (total for all games played so far)
   - Week 10 data = total snaps from Weeks 1-10
   - Not per-game snapcounts

## Using Snap Counts in Predictions

### Player Props
Snap count percentage is one of the **best predictors** of player performance:

- **80%+ offensive snaps** = True workhorse (RBs) or WR1
- **60-79% snaps** = Significant role, good prop targets
- **40-59% snaps** = Situational player, risky props
- **<40% snaps** = Backup/specialist, avoid props

### Injury Impact
Cross-reference with injury data:
```sql
SELECT 
  s.player_name,
  s.position,
  s.offensive_snap_pct,
  i.game_status,
  i.on_track_to_play
FROM snap_counts s
LEFT JOIN injuries i ON s.player_name = i.player_name 
  AND s.team_abbr = i.team_abbr
WHERE s.season = 2025 
  AND s.offensive_snap_pct > 60
  AND i.game_status IS NOT NULL;
```

This shows key players (high snap %) who are injured.

### Game Totals
Teams missing high-snap players (especially QB, WR1, RB1) tend to score fewer points:

```sql
-- Find teams with injured high-usage players
SELECT 
  i.team_abbr,
  COUNT(*) as injured_key_players,
  AVG(s.offensive_snap_pct) as avg_snap_pct_lost
FROM injuries i
JOIN snap_counts s ON i.player_name = s.player_name 
  AND i.team_abbr = s.team_abbr
WHERE i.game_status = 'Out'
  AND s.offensive_snap_pct > 50
  AND s.season = 2025
GROUP BY i.team_abbr;
```

### Workload Analysis
Identify RB committees vs. workhorse backs:

```sql
SELECT 
  team_abbr,
  player_name,
  offensive_snap_pct as snap_pct,
  position
FROM snap_counts
WHERE position = 'RB' 
  AND season = 2025
  AND offensive_snap_pct > 20
ORDER BY team_abbr, offensive_snap_pct DESC;
```

- **Single RB >60% snaps** = Workhorse (more predictable for props)
- **Multiple RBs 30-50% snaps** = Committee (less predictable)

## Example Queries

### Top Offensive Players by Usage
```sql
SELECT 
  player_name,
  team_abbr,
  position,
  offensive_snaps,
  offensive_snap_pct
FROM snap_counts
WHERE season = 2025 
  AND week_number = 10
  AND offensive_snap_pct > 80
ORDER BY offensive_snap_pct DESC
LIMIT 20;
```

### Find Emerging Players (Increasing Snap %)
Compare week-over-week to find trending players:
```sql
SELECT 
  curr.player_name,
  curr.team_abbr,
  curr.position,
  prev.offensive_snap_pct as prev_week_pct,
  curr.offensive_snap_pct as curr_week_pct,
  (curr.offensive_snap_pct - prev.offensive_snap_pct) as snap_pct_change
FROM snap_counts curr
JOIN snap_counts prev ON curr.player_name = prev.player_name 
  AND curr.team_abbr = prev.team_abbr
WHERE curr.week_number = 10 
  AND prev.week_number = 9
  AND curr.season = 2025
  AND (curr.offensive_snap_pct - prev.offensive_snap_pct) > 15
ORDER BY snap_pct_change DESC;
```

## Integration with Other Tables

### Combine with Player Stats
```sql
SELECT 
  s.player_name,
  s.team_abbr,
  s.offensive_snap_pct,
  r.rushing_yards,
  r.rushing_attempts,
  ROUND(r.rushing_yards::numeric / NULLIF(r.rushing_attempts, 0), 2) as yards_per_carry
FROM snap_counts s
JOIN player_rushing_stats r ON s.player_name = r.player_name 
  AND s.team_abbr = r.team_abbr
WHERE s.season = 2025 
  AND s.position = 'RB'
  AND s.offensive_snap_pct > 40
ORDER BY s.offensive_snap_pct DESC;
```

### Game-by-Game Player Usage (Future Enhancement)
Currently, snap counts are cumulative. To get per-game data, you'd need to:
1. Scrape after each week
2. Calculate the difference from previous week
3. Store in a separate `snap_counts_weekly` table

## Troubleshooting

### Rate Limiting (429 Errors)
If you see many 429 errors:
- Wait 24 hours before trying again
- Consider scraping only a few teams at a time
- PFR may temporarily block your IP if you scrape too aggressively

### Missing Data
Some players may not appear if they:
- Haven't played any snaps yet this season
- Are on IR or practice squad
- Haven't been active for games

### Data Accuracy
- Snap counts are "unofficial" per PFR
- Small discrepancies (<1%) may occur compared to official NFL data
- Good enough for betting analysis

## Future Enhancements

1. **Per-Game Snap Counts**: Track week-by-week instead of cumulative
2. **Snap Count Trends**: Automatic calculation of snap % changes
3. **Alert System**: Notify when key players' snap counts drop (potential injury)
4. **Target Share**: Combine WR snap counts with targets/receptions for efficiency metrics

## References

- [Pro Football Reference Snap Counts](https://www.pro-football-reference.com/players/)
- NFL teams use snap counts internally for workload management
- Fantasy analysts rely heavily on snap % for projections

