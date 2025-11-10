# N8N Automation Guide for NFL Stats Syncing

This guide explains how to automate the Pro Football Reference data scraping using n8n workflow automation.

## Overview

We have multiple methods to sync NFL team stats from Pro Football Reference to your Supabase `auto_nfl_team_stats` table:

1. **Python Script**: `save_nfl_stats_to_db.py`
2. **TypeScript API**: `/api/sync-nfl-stats`
3. **n8n Workflow**: Automated scheduling and monitoring

---

## Option 1: Simple API Call (Recommended)

This is the easiest approach using your existing Next.js API.

### n8n Nodes Required:

1. **Cron Trigger** or **Webhook Trigger**
2. **HTTP Request Node**
3. **IF Node** (conditional logic)
4. **Notification Node** (Slack/Email/Discord)

### Setup Steps:

#### 1. Import Workflow

1. Open n8n
2. Click "Import from File"
3. Select `n8n-workflow-nfl-stats.json`
4. Configure credentials and environment variables

#### 2. Configure Environment Variables

In n8n, go to Settings → Environments and add:

```
APP_URL=https://your-app-domain.com
```

#### 3. Set Up Cron Schedule

The workflow includes a cron trigger set to:
- **Every Tuesday at 3 AM**: `0 3 * * 2`

This runs after Monday Night Football completes.

**Alternative schedules:**
```
0 0 * * *        # Daily at midnight
0 */6 * * *      # Every 6 hours
0 9 * * 1        # Monday at 9 AM
0 3 * * 0,4      # Sunday and Thursday at 3 AM (game days)
```

#### 4. Test Manual Trigger

The workflow also includes a webhook for manual triggering:

```bash
curl https://your-n8n-instance.com/webhook/nfl-stats-sync
```

---

## Option 2: Direct Python Script Execution

Run the Python script directly from n8n.

### n8n Workflow:

```
[Cron] → [Execute Command] → [Parse Results] → [Notify]
```

### Execute Command Node Configuration:

**Command:**
```bash
cd /Applications/Cursor\ :\ Supabase/Test\ 2 && \
source .venv/bin/activate && \
python save_nfl_stats_to_db.py
```

**Working Directory:**
```
/Applications/Cursor : Supabase/Test 2
```

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Option 3: Custom Scraping in n8n

For maximum control, scrape directly in n8n using a Code node.

### Code Node (JavaScript):

```javascript
// Install dependencies in n8n: axios, cheerio
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapePFR(season = 2025) {
  const url = `https://www.pro-football-reference.com/years/${season}/`;
  
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  
  const $ = cheerio.load(response.data);
  const teams = [];
  
  // Parse AFC and NFC tables
  ['AFC', 'NFC'].forEach(conference => {
    const divisionMap = {};
    
    $(`table#${conference} tbody tr`).each((i, row) => {
      const $row = $(row);
      
      // Check for division header
      if ($row.hasClass('thead')) {
        const divisionName = $row.find('td').text().trim();
        divisionMap.current = divisionName;
        return;
      }
      
      const teamName = $row.find('th[data-stat="team"] a').text().trim();
      if (!teamName) return;
      
      const wins = parseInt($row.find('td[data-stat="wins"]').text()) || 0;
      const losses = parseInt($row.find('td[data-stat="losses"]').text()) || 0;
      const ties = parseInt($row.find('td[data-stat="ties"]').text()) || 0;
      
      teams.push({
        team_name: teamName.replace(/[*+]/g, ''),
        conference: conference,
        division: divisionMap.current || '',
        season: season,
        wins: wins,
        losses: losses,
        ties: ties,
        win_percentage: parseFloat($row.find('td[data-stat="win_loss_perc"]').text()) || 0,
        points_for: parseInt($row.find('td[data-stat="points"]').text()) || 0,
        points_against: parseInt($row.find('td[data-stat="points_opp"]').text()) || 0,
        point_differential: parseInt($row.find('td[data-stat="points_diff"]').text()) || 0,
        margin_of_victory: parseFloat($row.find('td[data-stat="mov"]').text()) || 0,
        strength_of_schedule: parseFloat($row.find('td[data-stat="sos_total"]').text()) || 0,
        srs: parseFloat($row.find('td[data-stat="srs_total"]').text()) || 0,
        offensive_srs: parseFloat($row.find('td[data-stat="srs_offense"]').text()) || 0,
        defensive_srs: parseFloat($row.find('td[data-stat="srs_defense"]').text()) || 0,
        is_division_leader: teamName.includes('*'),
        is_wildcard: teamName.includes('+')
      });
    });
  });
  
  return teams;
}

// Execute
const teams = await scrapePFR(2025);
return teams.map(team => ({ json: team }));
```

### Then connect to Supabase Node:

- **Operation**: Insert/Update (Upsert)
- **Table**: `auto_nfl_team_stats`
- **Match Columns**: `team_name, season`

---

## Option 4: Event-Driven Automation

Trigger sync based on real events.

### Workflow Ideas:

#### A. When Games Finish

```
[ESPN API Poll] → [Detect Game Complete] → [Wait 1 hour] → [Sync Stats]
```

#### B. Discord/Slack Command

```
[Discord Webhook] → [Parse Command] → [Sync Stats] → [Reply to User]
```

**Discord Command:**
```
/sync-nfl-stats week=10
```

#### C. GitHub Actions + n8n Webhook

```yaml
# .github/workflows/sync-nfl-stats.yml
name: Sync NFL Stats
on:
  schedule:
    - cron: '0 3 * * 2'  # Tuesday 3 AM
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger n8n Webhook
        run: |
          curl -X POST ${{ secrets.N8N_WEBHOOK_URL }}
```

---

## Monitoring & Alerts

### Add Notification Nodes

#### Slack Notification:

```
IF Success:
  ✅ NFL Stats Synced!
  • Teams: {{ $json.synced }}
  • Real Data: {{ $json.realDataCount }}
  • Estimated: {{ $json.estimatedCount }}

IF Failure:
  ❌ NFL Stats Sync Failed!
  • Error: {{ $json.message }}
  • Check logs immediately
```

#### Email Notification:

Use the Email node with HTML template:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .success { color: #28a745; }
    .error { color: #dc3545; }
  </style>
</head>
<body>
  <h2 class="{{ $json.success ? 'success' : 'error' }}">
    NFL Stats Sync {{ $json.success ? 'Successful' : 'Failed' }}
  </h2>
  <p><strong>Teams Synced:</strong> {{ $json.synced }}</p>
  <p><strong>Real Data:</strong> {{ $json.realDataCount }}</p>
  <p><strong>Time:</strong> {{ $now.format('MMM dd, yyyy HH:mm') }}</p>
</body>
</html>
```

---

## Best Practices

### 1. Rate Limiting

Pro Football Reference may block excessive requests. Add delays:

```javascript
// In Code node
await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
```

### 2. Error Handling

Always wrap in try-catch:

```javascript
try {
  const teams = await scrapePFR(2025);
  return teams;
} catch (error) {
  return [{
    json: {
      success: false,
      error: error.message
    }
  }];
}
```

### 3. Data Validation

Check scraped data before inserting:

```javascript
if (teams.length < 30) {
  throw new Error('Incomplete data - expected 32 teams');
}
```

### 4. Backup Before Update

```sql
-- Run this in a Supabase node before sync
CREATE TABLE auto_nfl_team_stats_backup AS 
SELECT * FROM auto_nfl_team_stats 
WHERE season = 2025;
```

---

## Troubleshooting

### Issue: Scraping Blocked

**Solution 1**: Rotate User-Agent headers
```javascript
const userAgents = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
  'Mozilla/5.0 (X11; Linux x86_64)...'
];
const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
```

**Solution 2**: Use proxy service
```javascript
axios.get(url, {
  proxy: {
    host: 'proxy.example.com',
    port: 8080
  }
})
```

### Issue: Timeout

Increase timeout in HTTP Request node:
- **Timeout**: 120000 (2 minutes)

### Issue: Memory Limit

Process teams in batches:
```javascript
const batchSize = 8;
for (let i = 0; i < teams.length; i += batchSize) {
  const batch = teams.slice(i, i + batchSize);
  // Process batch
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

---

## Advanced: Multi-Stage Pipeline

For production-grade automation:

```
┌──────────────┐
│ Stage 1:     │
│ Scrape Data  │──┐
└──────────────┘  │
                  │
┌──────────────┐  │
│ Stage 2:     │  │
│ Validate     │◄─┘
└──────────────┘  │
                  │
┌──────────────┐  │
│ Stage 3:     │  │
│ Transform    │◄─┘
└──────────────┘  │
                  │
┌──────────────┐  │
│ Stage 4:     │  │
│ Backup Old   │◄─┘
└──────────────┘  │
                  │
┌──────────────┐  │
│ Stage 5:     │  │
│ Upsert New   │◄─┘
└──────────────┘  │
                  │
┌──────────────┐  │
│ Stage 6:     │  │
│ Verify       │◄─┘
└──────────────┘  │
                  │
┌──────────────┐  │
│ Stage 7:     │  │
│ Notify       │◄─┘
└──────────────┘
```

---

## Quick Start

1. **Import workflow**: `n8n-workflow-nfl-stats.json`
2. **Set environment**: `APP_URL` in n8n settings
3. **Configure Supabase credentials** in n8n
4. **Test manual trigger**: Visit webhook URL
5. **Activate workflow**: Toggle on
6. **Monitor**: Check execution history

---

## Resources

- [n8n Documentation](https://docs.n8n.io/)
- [n8n Code Node](https://docs.n8n.io/code-examples/)
- [Supabase n8n Integration](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase/)
- [Cron Expression Generator](https://crontab.guru/)

---

## Next Steps

1. Set up n8n instance (cloud or self-hosted)
2. Import and test the workflow
3. Configure notifications (Slack/Email)
4. Add monitoring dashboard
5. Set up alerts for failures

Need help? Check the logs in n8n's execution history!

