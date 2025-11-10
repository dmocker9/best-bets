"""
Display 2025 NFL Standings in clean table format
"""

import requests
from bs4 import BeautifulSoup

def scrape_and_display():
    url = "https://www.pro-football-reference.com/years/2025/index.htm"
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
    
    response = requests.get(url, headers=headers)
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
            
            teams.append({
                'Division': current_division or '',
                'Team': team_name,
                'PO': '*' if is_div_leader else ('+' if is_wildcard else ''),
                'W': safe_int(stats.get('wins')),
                'L': safe_int(stats.get('losses')),
                'T': safe_int(stats.get('ties')),
                'Pct': safe_float(stats.get('win_loss_perc')),
                'PF': safe_int(stats.get('points')),
                'PA': safe_int(stats.get('points_opp')),
                'PD': safe_int(stats.get('points_diff')),
                'MoV': safe_float(stats.get('mov')),
                'SoS': safe_float(stats.get('sos_total')),
                'SRS': safe_float(stats.get('srs_total')),
                'OSRS': safe_float(stats.get('srs_offense')),
                'DSRS': safe_float(stats.get('srs_defense')),
            })
        
        return teams
    
    # Parse both conferences
    afc_table = soup.find('table', {'id': 'AFC'})
    nfc_table = soup.find('table', {'id': 'NFC'})
    
    afc_teams = parse_conference(afc_table, 'AFC') if afc_table else []
    nfc_teams = parse_conference(nfc_table, 'NFC') if nfc_table else []
    
    # Display AFC
    print("\n" + "="*150)
    print("2025 AFC STANDINGS")
    print("="*150)
    print(f"{'Division':<15} {'Team':<28} {'PO':>2} {'W':>3} {'L':>3} {'T':>3} {'Pct':>6} {'PF':>4} {'PA':>4} {'PD':>5} {'MoV':>6} {'SoS':>6} {'SRS':>6} {'OSRS':>6} {'DSRS':>6}")
    print("-"*150)
    
    for team in afc_teams:
        print(f"{team['Division']:<15} {team['Team']:<28} {team['PO']:>2} "
              f"{team['W']:>3} {team['L']:>3} {team['T']:>3} "
              f"{team['Pct']:>6.3f} {team['PF']:>4} {team['PA']:>4} "
              f"{team['PD']:>5} {team['MoV']:>6.1f} {team['SoS']:>6.1f} "
              f"{team['SRS']:>6.1f} {team['OSRS']:>6.1f} {team['DSRS']:>6.1f}")
    
    # Display NFC
    print("\n" + "="*150)
    print("2025 NFC STANDINGS")
    print("="*150)
    print(f"{'Division':<15} {'Team':<28} {'PO':>2} {'W':>3} {'L':>3} {'T':>3} {'Pct':>6} {'PF':>4} {'PA':>4} {'PD':>5} {'MoV':>6} {'SoS':>6} {'SRS':>6} {'OSRS':>6} {'DSRS':>6}")
    print("-"*150)
    
    for team in nfc_teams:
        print(f"{team['Division']:<15} {team['Team']:<28} {team['PO']:>2} "
              f"{team['W']:>3} {team['L']:>3} {team['T']:>3} "
              f"{team['Pct']:>6.3f} {team['PF']:>4} {team['PA']:>4} "
              f"{team['PD']:>5} {team['MoV']:>6.1f} {team['SoS']:>6.1f} "
              f"{team['SRS']:>6.1f} {team['OSRS']:>6.1f} {team['DSRS']:>6.1f}")
    
    print("\n" + "="*150)
    print("LEGEND: PO = Playoff Position (* = Division Leader, + = Wild Card)")
    print("        W/L/T = Wins/Losses/Ties | Pct = Win Percentage")
    print("        PF/PA = Points For/Against | PD = Point Differential | MoV = Margin of Victory")
    print("        SoS = Strength of Schedule | SRS = Simple Rating System")
    print("        OSRS = Offensive SRS | DSRS = Defensive SRS")
    print("="*150 + "\n")

if __name__ == "__main__":
    scrape_and_display()

