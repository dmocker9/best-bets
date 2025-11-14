/**
 * Scrape Defense vs Position stats from Pro Football Reference
 * Populates: defense_vs_rb, defense_vs_te, defense_vs_wr, defense_vs_qb
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const URLS = {
  rb: 'https://www.pro-football-reference.com/years/2025/fantasy-points-against-RB.htm',
  te: 'https://www.pro-football-reference.com/years/2025/fantasy-points-against-TE.htm',
  wr: 'https://www.pro-football-reference.com/years/2025/fantasy-points-against-WR.htm',
  qb: 'https://www.pro-football-reference.com/years/2025/fantasy-points-against-QB.htm'
};

const TEAM_ABBR_MAP: { [key: string]: string } = {
  'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF', 'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE', 'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC', 'Las Vegas Raiders': 'LV', 'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR', 'Miami Dolphins': 'MIA', 'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE', 'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
  'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF', 'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN', 'Washington Commanders': 'WAS'
};

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

function parseNumber(str: string): number {
  const num = parseFloat(str.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

async function scrapeDefenseVsRB() {
  console.log('🏃 Scraping Defense vs RB...\n');
  
  try {
    const response = await fetch(URLS.rb);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const records: any[] = [];
    
    // Find the stats table
    $('table#fantasy_def tbody tr').each((i, row) => {
      const $row = $(row);
      
      // Skip header rows
      if ($row.hasClass('thead')) return;
      
      const teamCell = $row.find('th[data-stat="team"]');
      if (teamCell.length === 0) {
        return;
      }
      
      const teamName = teamCell.find('a').text().trim();
      if (!teamName) {
        return;
      }
      
      const record = {
        team_name: teamName,
        team_abbr: TEAM_ABBR_MAP[teamName] || null,
        season: 2025,
        games_played: parseInt($row.find('td[data-stat="g"]').text()) || 0,
        rush_att: parseInt($row.find('td[data-stat="rush_att"]').text()) || 0,
        rush_yds: parseInt($row.find('td[data-stat="rush_yds"]').text()) || 0,
        rush_td: parseInt($row.find('td[data-stat="rush_td"]').text()) || 0,
        targets: parseInt($row.find('td[data-stat="targets"]').text()) || 0,
        receptions: parseInt($row.find('td[data-stat="rec"]').text()) || 0,
        rec_yds: parseInt($row.find('td[data-stat="rec_yds"]').text()) || 0,
        rec_td: parseInt($row.find('td[data-stat="rec_td"]').text()) || 0,
        fantasy_points: parseNumber($row.find('td[data-stat="fantasy_points"]').text()),
        dk_points: parseNumber($row.find('td[data-stat="draftkings_points"]').text()),
        fd_points: parseNumber($row.find('td[data-stat="fanduel_points"]').text()),
        fantasy_ppg: parseNumber($row.find('td[data-stat="fantasy_points_per_game"]').text()),
        dk_ppg: parseNumber($row.find('td[data-stat="draftkings_points_per_game"]').text()),
        fd_ppg: parseNumber($row.find('td[data-stat="fanduel_points_per_game"]').text())
      };
      
      records.push(record);
    });
    
    console.log(`   ✅ Parsed ${records.length} teams\n`);
    return records;
    
  } catch (error) {
    console.error('❌ Error scraping RB data:', error);
    return [];
  }
}

async function scrapeDefenseVsTE() {
  console.log('🏈 Scraping Defense vs TE...\n');
  
  try {
    const response = await fetch(URLS.te);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const records: any[] = [];
    
    $('table#fantasy_def tbody tr').each((i, row) => {
      const $row = $(row);
      if ($row.hasClass('thead')) return;
      
      const teamCell = $row.find('th[data-stat="team"]');
      if (teamCell.length === 0) return;
      
      const teamName = teamCell.find('a').text().trim();
      if (!teamName) return;
      
      const record = {
        team_name: teamName,
        team_abbr: TEAM_ABBR_MAP[teamName] || null,
        season: 2025,
        games_played: parseInt($row.find('td[data-stat="g"]').text()) || 0,
        targets: parseInt($row.find('td[data-stat="targets"]').text()) || 0,
        receptions: parseInt($row.find('td[data-stat="rec"]').text()) || 0,
        rec_yds: parseInt($row.find('td[data-stat="rec_yds"]').text()) || 0,
        rec_td: parseInt($row.find('td[data-stat="rec_td"]').text()) || 0,
        fantasy_points: parseNumber($row.find('td[data-stat="fantasy_points"]').text()),
        dk_points: parseNumber($row.find('td[data-stat="draftkings_points"]').text()),
        fd_points: parseNumber($row.find('td[data-stat="fanduel_points"]').text()),
        fantasy_ppg: parseNumber($row.find('td[data-stat="fantasy_points_per_game"]').text()),
        dk_ppg: parseNumber($row.find('td[data-stat="draftkings_points_per_game"]').text()),
        fd_ppg: parseNumber($row.find('td[data-stat="fanduel_points_per_game"]').text())
      };
      
      records.push(record);
    });
    
    console.log(`   ✅ Parsed ${records.length} teams\n`);
    return records;
    
  } catch (error) {
    console.error('❌ Error scraping TE data:', error);
    return [];
  }
}

async function scrapeDefenseVsWR() {
  console.log('📡 Scraping Defense vs WR...\n');
  
  try {
    const response = await fetch(URLS.wr);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const records: any[] = [];
    
    $('table#fantasy_def tbody tr').each((i, row) => {
      const $row = $(row);
      if ($row.hasClass('thead')) return;
      
      const teamCell = $row.find('th[data-stat="team"]');
      if (teamCell.length === 0) return;
      
      const teamName = teamCell.find('a').text().trim();
      if (!teamName) return;
      
      const record = {
        team_name: teamName,
        team_abbr: TEAM_ABBR_MAP[teamName] || null,
        season: 2025,
        games_played: parseInt($row.find('td[data-stat="g"]').text()) || 0,
        targets: parseInt($row.find('td[data-stat="targets"]').text()) || 0,
        receptions: parseInt($row.find('td[data-stat="rec"]').text()) || 0,
        rec_yds: parseInt($row.find('td[data-stat="rec_yds"]').text()) || 0,
        rec_td: parseInt($row.find('td[data-stat="rec_td"]').text()) || 0,
        fantasy_points: parseNumber($row.find('td[data-stat="fantasy_points"]').text()),
        dk_points: parseNumber($row.find('td[data-stat="draftkings_points"]').text()),
        fd_points: parseNumber($row.find('td[data-stat="fanduel_points"]').text()),
        fantasy_ppg: parseNumber($row.find('td[data-stat="fantasy_points_per_game"]').text()),
        dk_ppg: parseNumber($row.find('td[data-stat="draftkings_points_per_game"]').text()),
        fd_ppg: parseNumber($row.find('td[data-stat="fanduel_points_per_game"]').text())
      };
      
      records.push(record);
    });
    
    console.log(`   ✅ Parsed ${records.length} teams\n`);
    return records;
    
  } catch (error) {
    console.error('❌ Error scraping WR data:', error);
    return [];
  }
}

async function scrapeDefenseVsQB() {
  console.log('🎯 Scraping Defense vs QB...\n');
  
  try {
    const response = await fetch(URLS.qb);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const records: any[] = [];
    
    $('table#fantasy_def tbody tr').each((i, row) => {
      const $row = $(row);
      if ($row.hasClass('thead')) return;
      
      const teamCell = $row.find('th[data-stat="team"]');
      if (teamCell.length === 0) return;
      
      const teamName = teamCell.find('a').text().trim();
      if (!teamName) return;
      
      const record = {
        team_name: teamName,
        team_abbr: TEAM_ABBR_MAP[teamName] || null,
        season: 2025,
        games_played: parseInt($row.find('td[data-stat="g"]').text()) || 0,
        pass_cmp: parseInt($row.find('td[data-stat="pass_cmp"]').text()) || 0,
        pass_att: parseInt($row.find('td[data-stat="pass_att"]').text()) || 0,
        pass_yds: parseInt($row.find('td[data-stat="pass_yds"]').text()) || 0,
        pass_td: parseInt($row.find('td[data-stat="pass_td"]').text()) || 0,
        interceptions: parseInt($row.find('td[data-stat="pass_int"]').text()) || 0,
        rush_att: parseInt($row.find('td[data-stat="rush_att"]').text()) || 0,
        rush_yds: parseInt($row.find('td[data-stat="rush_yds"]').text()) || 0,
        rush_td: parseInt($row.find('td[data-stat="rush_td"]').text()) || 0,
        sacks: parseInt($row.find('td[data-stat="pass_sacked"]').text()) || 0,
        fantasy_points: parseNumber($row.find('td[data-stat="fantasy_points"]').text()),
        dk_points: parseNumber($row.find('td[data-stat="draftkings_points"]').text()),
        fd_points: parseNumber($row.find('td[data-stat="fanduel_points"]').text()),
        fantasy_ppg: parseNumber($row.find('td[data-stat="fantasy_points_per_game"]').text()),
        dk_ppg: parseNumber($row.find('td[data-stat="draftkings_points_per_game"]').text()),
        fd_ppg: parseNumber($row.find('td[data-stat="fanduel_points_per_game"]').text())
      };
      
      records.push(record);
    });
    
    console.log(`   ✅ Parsed ${records.length} teams\n`);
    return records;
    
  } catch (error) {
    console.error('❌ Error scraping QB data:', error);
    return [];
  }
}

async function main() {
  console.log('🏈 NFL Defense vs Position Scraper\n');
  console.log('================================================================================\n');
  
  const supabase = getSupabaseClient();
  console.log('✅ Connected to Supabase\n');
  
  // Scrape all positions
  const [rbData, teData, wrData, qbData] = await Promise.all([
    scrapeDefenseVsRB(),
    scrapeDefenseVsTE(),
    scrapeDefenseVsWR(),
    scrapeDefenseVsQB()
  ]);
  
  console.log('\n💾 Saving to database...\n');
  
  // Save RB data
  if (rbData.length > 0) {
    console.log('   Saving Defense vs RB...');
    const { error } = await supabase
      .from('defense_vs_rb')
      .upsert(rbData, { onConflict: 'team_name,season' });
    
    if (error) {
      console.error('   ❌ Error saving RB data:', error);
    } else {
      console.log(`   ✅ Saved ${rbData.length} RB records`);
    }
  }
  
  // Save TE data
  if (teData.length > 0) {
    console.log('   Saving Defense vs TE...');
    const { error } = await supabase
      .from('defense_vs_te')
      .upsert(teData, { onConflict: 'team_name,season' });
    
    if (error) {
      console.error('   ❌ Error saving TE data:', error);
    } else {
      console.log(`   ✅ Saved ${teData.length} TE records`);
    }
  }
  
  // Save WR data
  if (wrData.length > 0) {
    console.log('   Saving Defense vs WR...');
    const { error } = await supabase
      .from('defense_vs_wr')
      .upsert(wrData, { onConflict: 'team_name,season' });
    
    if (error) {
      console.error('   ❌ Error saving WR data:', error);
    } else {
      console.log(`   ✅ Saved ${wrData.length} WR records`);
    }
  }
  
  // Save QB data
  if (qbData.length > 0) {
    console.log('   Saving Defense vs QB...');
    const { error } = await supabase
      .from('defense_vs_qb')
      .upsert(qbData, { onConflict: 'team_name,season' });
    
    if (error) {
      console.error('   ❌ Error saving QB data:', error);
    } else {
      console.log(`   ✅ Saved ${qbData.length} QB records`);
    }
  }
  
  console.log('\n================================================================================');
  console.log('✅ All defense vs position data updated!\n');
  
  // Show summary
  console.log('📊 Summary:');
  console.log(`   Defense vs RB: ${rbData.length} teams`);
  console.log(`   Defense vs TE: ${teData.length} teams`);
  console.log(`   Defense vs WR: ${wrData.length} teams`);
  console.log(`   Defense vs QB: ${qbData.length} teams\n`);
}

main().catch(console.error);

