# 🛡️ Defense vs Position Stats

## Overview

Successfully created and populated 4 new tables tracking how NFL defenses perform against specific positions. Data sourced from [Pro Football Reference](https://www.pro-football-reference.com/).

---

## ✅ Tables Created

### 1. **defense_vs_rb** - Defense vs Running Backs
Tracks fantasy points and stats allowed to RBs (rushing + receiving)

**Top 5 Worst Defenses (Most Fantasy Points Allowed to RBs):**
1. Cincinnati Bengals - 28.4 PPG
2. Tennessee Titans - 22.7 PPG
3. New York Giants - 22.2 PPG
4. Dallas Cowboys - 22.0 PPG
5. Atlanta Falcons - 22.0 PPG

### 2. **defense_vs_te** - Defense vs Tight Ends
Tracks fantasy points and receiving stats allowed to TEs

**Top 5 Worst Defenses (Most Fantasy Points Allowed to TEs):**
1. Cincinnati Bengals - 16.1 PPG
2. Jacksonville Jaguars - 11.8 PPG
3. Miami Dolphins - 11.2 PPG
4. Pittsburgh Steelers - 10.8 PPG
5. Washington Commanders - 10.4 PPG

### 3. **defense_vs_wr** - Defense vs Wide Receivers
Tracks fantasy points and receiving stats allowed to WRs

**Top 5 Worst Defenses (Most Fantasy Points Allowed to WRs):**
1. Dallas Cowboys - 28.7 PPG
2. Washington Commanders - 26.5 PPG
3. Chicago Bears - 25.7 PPG
4. Pittsburgh Steelers - 24.8 PPG
5. Baltimore Ravens - 24.2 PPG

### 4. **defense_vs_qb** - Defense vs Quarterbacks
Tracks passing, rushing, sacks, and fantasy points allowed to QBs

**Top 5 Worst Defenses (Most Fantasy Points Allowed to QBs):**
1. Dallas Cowboys - 25.0 PPG
2. Washington Commanders - 21.2 PPG
3. Cincinnati Bengals - 21.1 PPG
4. New York Giants - 21.0 PPG
5. Jacksonville Jaguars - 21.0 PPG

---

## 📊 Table Schemas

### defense_vs_rb
```sql
- team_name TEXT
- team_abbr TEXT (KC, SF, NE, etc.)
- season INTEGER
- games_played INTEGER
- rush_att, rush_yds, rush_td INTEGER (rushing stats allowed)
- targets, receptions, rec_yds, rec_td INTEGER (receiving stats allowed)
- fantasy_points, dk_points, fd_points NUMERIC (total fantasy points)
- fantasy_ppg, dk_ppg, fd_ppg NUMERIC (points per game)
```

### defense_vs_te / defense_vs_wr
```sql
- team_name TEXT
- team_abbr TEXT
- season INTEGER
- games_played INTEGER
- targets, receptions, rec_yds, rec_td INTEGER
- fantasy_points, dk_points, fd_points NUMERIC
- fantasy_ppg, dk_ppg, fd_ppg NUMERIC
```

### defense_vs_qb
```sql
- team_name TEXT
- team_abbr TEXT
- season INTEGER
- games_played INTEGER
- pass_cmp, pass_att, pass_yds, pass_td, interceptions INTEGER
- rush_att, rush_yds, rush_td INTEGER (QB rushing)
- sacks INTEGER
- fantasy_points, dk_points, fd_points NUMERIC
- fantasy_ppg, dk_ppg, fd_ppg NUMERIC
```

---

## 🎯 Use Cases

### 1. **Prop Betting Analysis**
```sql
-- Find defenses that give up most receiving yards to TEs
SELECT team_name, rec_yds, rec_td, fantasy_ppg
FROM defense_vs_te
ORDER BY rec_yds DESC
LIMIT 10;
```

### 2. **Identify Favorable Matchups**
```sql
-- Which defense allows the most QB fantasy points?
SELECT team_name, pass_yds, pass_td, sacks, fantasy_ppg
FROM defense_vs_qb
WHERE fantasy_ppg > 20
ORDER BY fantasy_ppg DESC;
```

### 3. **DFS Lineup Optimization**
```sql
-- Best RB matchups (defenses allowing most DraftKings points)
SELECT team_name, dk_ppg, rush_yds, rec_yds
FROM defense_vs_rb
ORDER BY dk_ppg DESC
LIMIT 5;
```

### 4. **Game Stacking Strategy**
```sql
-- Find teams weak against both WRs and TEs (pass-funnel defenses)
SELECT 
  wr.team_name,
  wr.fantasy_ppg as wr_ppg,
  te.fantasy_ppg as te_ppg,
  (wr.fantasy_ppg + te.fantasy_ppg) as total_pass_ppg
FROM defense_vs_wr wr
JOIN defense_vs_te te ON wr.team_name = te.team_name
ORDER BY total_pass_ppg DESC
LIMIT 10;
```

---

## 🔄 Updating Data

To refresh the data with current week stats:

```bash
npx tsx scrape-defense-vs-position.ts
```

This will:
- ✅ Scrape all 4 position pages from Pro Football Reference
- ✅ Upsert data (update existing, insert new)
- ✅ Update all 32 NFL teams
- ⏱️ Takes ~5-10 seconds total

---

## 📈 Fantasy Points Explained

**Standard Scoring:**
- Passing TD: 4 pts
- Rushing/Receiving TD: 6 pts
- Yards: 1 pt per 10 yards (pass/rec), 1 pt per 10 yards (rush)

**DraftKings (dk_ppg):**
- Full PPR (1 point per reception)
- Bonus for 300+ yard games
- Bonus for 100+ yard games

**FanDuel (fd_ppg):**
- 0.5 PPR (half point per reception)
- Different bonus structure

---

## 🎯 Key Insights

### Cincinnati Bengals are a matchup dream:
- **Worst vs RBs:** 28.4 PPG allowed
- **Worst vs TEs:** 16.1 PPG allowed
- **Bad vs QBs:** 21.1 PPG allowed

### Dallas Cowboys are exploitable:
- **Worst vs QBs:** 25.0 PPG allowed
- **Worst vs WRs:** 28.7 PPG allowed
- **Bad vs RBs:** 22.0 PPG allowed

### Cleveland Browns and Detroit Lions = Tough matchups:
- Both in bottom 5 for fantasy points allowed to RBs
- Strong defensive units across the board

---

## 📁 Files

**Migration:** `supabase/migrations/20251113_create_defense_vs_position_tables.sql`  
**Scraper:** `scrape-defense-vs-position.ts`  
**Data Source:** [Pro Football Reference](https://www.pro-football-reference.com/)

---

## ✅ Status

- ✅ 4 tables created
- ✅ 32 teams per table (128 total records)
- ✅ All positions covered (RB, TE, WR, QB)
- ✅ Fantasy PPG rankings available
- ✅ Season 2025 data current through Week 10

**Last Updated:** November 13, 2025


