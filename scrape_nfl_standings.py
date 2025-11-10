"""
Scrape 2025 NFL Standings from Pro Football Reference
Shows the complete AFC and NFC standings tables
"""

import requests
from bs4 import BeautifulSoup

def scrape_nfl_standings():
    """Scrape current NFL standings from Pro Football Reference"""
    
    url = "https://www.pro-football-reference.com/years/2025/index.htm"
    
    print(f"\n{'='*80}")
    print(f"Fetching 2025 NFL Standings from Pro Football Reference...")
    print(f"URL: {url}")
    print(f"{'='*80}\n")
    
    # Set headers to mimic a browser request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
    }
    
    try:
        # Fetch the page
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        print("✅ Successfully fetched page\n")
        
        # Parse with BeautifulSoup
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find the AFC and NFC standings tables
        # The tables have specific IDs: AFC and NFC
        afc_table = soup.find('table', {'id': 'AFC'})
        nfc_table = soup.find('table', {'id': 'NFC'})
        
        standings = {}
        
        # Parse AFC standings
        if afc_table:
            print("📊 AFC STANDINGS")
            print("="*80)
            afc_data = parse_standings_table(afc_table, 'AFC')
            standings['AFC'] = afc_data
            display_standings(afc_data)
        else:
            print("⚠️  AFC table not found")
        
        print("\n")
        
        # Parse NFC standings
        if nfc_table:
            print("📊 NFC STANDINGS")
            print("="*80)
            nfc_data = parse_standings_table(nfc_table, 'NFC')
            standings['NFC'] = nfc_data
            display_standings(nfc_data)
        else:
            print("⚠️  NFC table not found")
        
        return standings
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching data: {e}")
        return None
    except Exception as e:
        print(f"❌ Error parsing data: {e}")
        return None

def parse_standings_table(table, conference):
    """Parse a standings table into structured data"""
    
    teams_data = []
    current_division = None
    
    # Find all rows in the table body
    tbody = table.find('tbody')
    if not tbody:
        return teams_data
    
    rows = tbody.find_all('tr')
    
    for row in rows:
        # Check if this is a division header row
        row_classes = row.get('class', [])
        if 'thead' in row_classes and 'onecell' in row_classes:
            # This is a division header
            division_td = row.find('td', {'data-stat': 'onecell'})
            if division_td:
                current_division = division_td.get_text(strip=True)
            continue
        
        # Skip rows without team data
        if not row.find('th', {'data-stat': 'team'}):
            continue
        
        # Extract team data
        team_cell = row.find('th', {'data-stat': 'team'})
        team_name = team_cell.get_text(strip=True) if team_cell else ''
        
        # Remove asterisks and plus signs (playoff indicators)
        team_name_clean = team_name.rstrip('*+')
        is_division_leader = '*' in team_name
        is_wildcard = '+' in team_name
        
        # Extract all statistics
        stats = {}
        for td in row.find_all('td'):
            stat_name = td.get('data-stat', '')
            stat_value = td.get_text(strip=True)
            stats[stat_name] = stat_value
        
        # Helper to safely convert to number
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
        
        team_data = {
            'conference': conference,
            'division': current_division or 'Unknown',
            'team': team_name_clean,
            'division_leader': is_division_leader,
            'wildcard': is_wildcard,
            'wins': safe_int(stats.get('wins')),
            'losses': safe_int(stats.get('losses')),
            'ties': safe_int(stats.get('ties')),
            'win_pct': safe_float(stats.get('win_loss_perc')),
            'points_for': safe_int(stats.get('points')),
            'points_against': safe_int(stats.get('points_opp')),
            'point_diff': safe_int(stats.get('points_diff')),
            'margin_of_victory': safe_float(stats.get('mov')),
            'strength_of_schedule': safe_float(stats.get('sos_total')),
            'srs': safe_float(stats.get('srs_total')),
            'osrs': safe_float(stats.get('srs_offense')),
            'dsrs': safe_float(stats.get('srs_defense')),
        }
        
        teams_data.append(team_data)
    
    return teams_data

def display_standings(teams_data):
    """Display standings in a formatted table"""
    
    if not teams_data:
        print("No data to display")
        return
    
    # Group by division
    divisions = {}
    for team in teams_data:
        div = team['division']
        if div not in divisions:
            divisions[div] = []
        divisions[div].append(team)
    
    # Display each division
    for division, teams in divisions.items():
        print(f"\n{division}")
        print("-" * 80)
        
        # Print header
        print(f"{'Team':<30} {'W':>3} {'L':>3} {'T':>3} {'Pct':>6} {'PF':>4} {'PA':>4} {'PD':>5} {'MoV':>6} {'SoS':>6} {'SRS':>6} {'OSRS':>6} {'DSRS':>6}")
        print("-" * 115)
        
        # Print each team
        for team in teams:
            playoff_indicator = ''
            if team['division_leader']:
                playoff_indicator = '*'
            elif team['wildcard']:
                playoff_indicator = '+'
            
            team_name = team['team'][:28]  # Truncate if too long
            
            print(f"{team_name:<28}{playoff_indicator:>2} "
                  f"{team['wins']:>3} "
                  f"{team['losses']:>3} "
                  f"{team['ties']:>3} "
                  f"{team['win_pct']:>6.3f} "
                  f"{team['points_for']:>4} "
                  f"{team['points_against']:>4} "
                  f"{team['point_diff']:>5} "
                  f"{team['margin_of_victory']:>6.1f} "
                  f"{team['strength_of_schedule']:>6.1f} "
                  f"{team['srs']:>6.1f} "
                  f"{team['osrs']:>6.1f} "
                  f"{team['dsrs']:>6.1f}")

if __name__ == "__main__":
    print("\n🏈 NFL STANDINGS SCRAPER")
    print("="*80)
    
    standings = scrape_nfl_standings()
    
    if standings:
        print("\n" + "="*80)
        print("✅ SCRAPING COMPLETE")
        print("="*80)
        print(f"\nTotal AFC teams: {len(standings.get('AFC', []))}")
        print(f"Total NFC teams: {len(standings.get('NFC', []))}")
        print("\n* = Division Leader")
        print("+ = Wild Card")
        print("\nLegend:")
        print("  W/L/T   = Wins/Losses/Ties")
        print("  Pct     = Win Percentage")
        print("  PF      = Points For")
        print("  PA      = Points Against")
        print("  PD      = Point Differential")
        print("  MoV     = Margin of Victory")
        print("  SoS     = Strength of Schedule")
        print("  SRS     = Simple Rating System (overall)")
        print("  OSRS    = Offensive Simple Rating System")
        print("  DSRS    = Defensive Simple Rating System")
        print("="*80 + "\n")
    else:
        print("\n❌ Failed to scrape standings")

