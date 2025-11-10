"""
Debug scraper to see ALL stats in the HTML structure
"""

import requests
from bs4 import BeautifulSoup

url = "https://www.pro-football-reference.com/years/2025/index.htm"

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
}

response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.content, 'html.parser')

# Find AFC table
afc_table = soup.find('table', {'id': 'AFC'})

if afc_table:
    tbody = afc_table.find('tbody')
    if tbody:
        rows = tbody.find_all('tr')
        print(f"Found {len(rows)} rows in AFC table\n")
        
        # Find first team row (not division header)
        for row in rows:
            th = row.find('th', {'data-stat': 'team'})
            if th:
                print(f"Team: {th.get_text(strip=True)}\n")
                
                tds = row.find_all('td')
                print(f"Found {len(tds)} TD cells with stats:\n")
                
                # Print ALL TDs with their data-stat and values
                for i, td in enumerate(tds):
                    stat_name = td.get('data-stat', 'unknown')
                    stat_value = td.get_text(strip=True)
                    print(f"  {i+1:2}. {stat_name:20} = {stat_value}")
                
                break  # Only show first team
            
        print()

