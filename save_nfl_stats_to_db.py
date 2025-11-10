"""
Scrape 2025 NFL Standings and save to Supabase auto_nfl_team_stats table
"""

import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_supabase_client():
    """Initialize Supabase client"""
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not key:
        raise Exception('Missing Supabase credentials in .env file')
    
    return create_client(url, key)

def scrape_nfl_standings(season=2025):
    """Scrape NFL standings from Pro Football Reference"""
    
    url = f"https://www.pro-football-reference.com/years/{season}/index.htm"
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
    
    print(f"\n{'='*80}")
    print(f"Scraping {season} NFL Standings from Pro Football Reference...")
    print(f"URL: {url}")
    print(f"{'='*80}\n")
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Helper functions
    def safe_int(val, default=0):
        try:
            return int(val) if val else default
        except (ValueError, TypeError):
            return default
    
    def safe_float(val, default=0.0):
        try:
            return float(val) if val else default
        except (ValueError, TypeError):
            return default
    
    def parse_conference(table, conference_name):
        teams = []
        tbody = table.find('tbody')
        if not tbody:
            return teams
        
        rows = tbody.find_all('tr')
        current_division = None
        
        for row in rows:
            # Check for division header
            row_classes = row.get('class', [])
            if 'thead' in row_classes and 'onecell' in row_classes:
                division_td = row.find('td', {'data-stat': 'onecell'})
                if division_td:
                    current_division = division_td.get_text(strip=True)
                continue
            
            # Get team data
            th = row.find('th', {'data-stat': 'team'})
            if not th:
                continue
            
            team_name = th.get_text(strip=True).rstrip('*+')
            is_div_leader = '*' in th.get_text(strip=True)
            is_wildcard = '+' in th.get_text(strip=True)
            
            stats = {}
            for td in row.find_all('td'):
                stat_name = td.get('data-stat', '')
                stat_value = td.get_text(strip=True)
                stats[stat_name] = stat_value
            
            team_data = {
                'team_name': team_name,
                'conference': conference_name,
                'division': current_division or '',
                'season': season,
                'is_division_leader': is_div_leader,
                'is_wildcard': is_wildcard,
                'wins': safe_int(stats.get('wins')),
                'losses': safe_int(stats.get('losses')),
                'ties': safe_int(stats.get('ties')),
                'win_percentage': safe_float(stats.get('win_loss_perc')),
                'points_for': safe_int(stats.get('points')),
                'points_against': safe_int(stats.get('points_opp')),
                'point_differential': safe_int(stats.get('points_diff')),
                'margin_of_victory': safe_float(stats.get('mov')),
                'strength_of_schedule': safe_float(stats.get('sos_total')),
                'srs': safe_float(stats.get('srs_total')),
                'offensive_srs': safe_float(stats.get('srs_offense')),
                'defensive_srs': safe_float(stats.get('srs_defense')),
            }
            
            teams.append(team_data)
            print(f"  ✓ {conference_name} - {current_division}: {team_name} ({team_data['wins']}-{team_data['losses']})")
        
        return teams
    
    # Parse both conferences
    afc_table = soup.find('table', {'id': 'AFC'})
    nfc_table = soup.find('table', {'id': 'NFC'})
    
    afc_teams = parse_conference(afc_table, 'AFC') if afc_table else []
    nfc_teams = parse_conference(nfc_table, 'NFC') if nfc_table else []
    
    all_teams = afc_teams + nfc_teams
    
    print(f"\n✅ Successfully scraped {len(all_teams)} teams")
    print(f"   AFC: {len(afc_teams)} teams")
    print(f"   NFC: {len(nfc_teams)} teams\n")
    
    return all_teams

def save_to_database(teams_data):
    """Save teams data to Supabase"""
    
    print(f"{'='*80}")
    print(f"Saving data to Supabase...")
    print(f"{'='*80}\n")
    
    supabase = get_supabase_client()
    
    saved = 0
    updated = 0
    failed = 0
    
    for team in teams_data:
        try:
            # Upsert: insert or update if team+season already exists
            result = supabase.table('auto_nfl_team_stats').upsert(
                team,
                on_conflict='team_name,season'
            ).execute()
            
            if result.data:
                # Check if it was an insert or update by querying
                existing = supabase.table('auto_nfl_team_stats')\
                    .select('created_at, updated_at')\
                    .eq('team_name', team['team_name'])\
                    .eq('season', team['season'])\
                    .single()\
                    .execute()
                
                if existing.data and existing.data['created_at'] != existing.data['updated_at']:
                    updated += 1
                    print(f"  🔄 Updated: {team['team_name']}")
                else:
                    saved += 1
                    print(f"  ✅ Saved: {team['team_name']}")
            
        except Exception as e:
            failed += 1
            print(f"  ❌ Failed to save {team['team_name']}: {str(e)}")
    
    print(f"\n{'='*80}")
    print(f"Database Save Complete")
    print(f"{'='*80}")
    print(f"  ✅ Saved: {saved} teams")
    print(f"  🔄 Updated: {updated} teams")
    print(f"  ❌ Failed: {failed} teams")
    print(f"  📊 Total: {len(teams_data)} teams")
    print(f"{'='*80}\n")

def main():
    """Main function"""
    try:
        # Scrape the data
        teams = scrape_nfl_standings(season=2025)
        
        if not teams:
            print("❌ No teams data scraped. Exiting.")
            return
        
        # Save to database
        save_to_database(teams)
        
        print("✅ All done!\n")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}\n")
        raise

if __name__ == "__main__":
    main()

