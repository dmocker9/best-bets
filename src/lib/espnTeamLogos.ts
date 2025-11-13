/**
 * ESPN Team Logo Helper
 * 
 * ESPN provides team logos via CDN:
 * https://a.espncdn.com/i/teamlogos/nfl/500/{TEAM_ABBR}.png
 */

// NFL Team Name to Abbreviation Mapping
const TEAM_ABBR_MAP: Record<string, string> = {
  'Arizona Cardinals': 'ari',
  'Atlanta Falcons': 'atl',
  'Baltimore Ravens': 'bal',
  'Buffalo Bills': 'buf',
  'Carolina Panthers': 'car',
  'Chicago Bears': 'chi',
  'Cincinnati Bengals': 'cin',
  'Cleveland Browns': 'cle',
  'Dallas Cowboys': 'dal',
  'Denver Broncos': 'den',
  'Detroit Lions': 'det',
  'Green Bay Packers': 'gb',
  'Houston Texans': 'hou',
  'Indianapolis Colts': 'ind',
  'Jacksonville Jaguars': 'jax',
  'Kansas City Chiefs': 'kc',
  'Las Vegas Raiders': 'lv',
  'Los Angeles Chargers': 'lac',
  'Los Angeles Rams': 'lar',
  'Miami Dolphins': 'mia',
  'Minnesota Vikings': 'min',
  'New England Patriots': 'ne',
  'New Orleans Saints': 'no',
  'New York Giants': 'nyg',
  'New York Jets': 'nyj',
  'Philadelphia Eagles': 'phi',
  'Pittsburgh Steelers': 'pit',
  'San Francisco 49ers': 'sf',
  'Seattle Seahawks': 'sea',
  'Tampa Bay Buccaneers': 'tb',
  'Tennessee Titans': 'ten',
  'Washington Commanders': 'wsh',
};

// Team abbreviation mapping (reverse lookup and direct abbr)
const ABBR_TO_ESPN: Record<string, string> = {
  'ARI': 'ari', 'ATL': 'atl', 'BAL': 'bal', 'BUF': 'buf',
  'CAR': 'car', 'CHI': 'chi', 'CIN': 'cin', 'CLE': 'cle',
  'DAL': 'dal', 'DEN': 'den', 'DET': 'det', 'GNB': 'gb', 'GB': 'gb',
  'HOU': 'hou', 'IND': 'ind', 'JAX': 'jax', 'KAN': 'kc', 'KC': 'kc',
  'LVR': 'lv', 'LV': 'lv', 'LAC': 'lac', 'LAR': 'lar',
  'MIA': 'mia', 'MIN': 'min', 'NWE': 'ne', 'NE': 'ne',
  'NOR': 'no', 'NO': 'no', 'NYG': 'nyg', 'NYJ': 'nyj',
  'PHI': 'phi', 'PIT': 'pit', 'SFO': 'sf', 'SF': 'sf',
  'SEA': 'sea', 'TAM': 'tb', 'TB': 'tb', 'TEN': 'ten',
  'WAS': 'wsh', 'WSH': 'wsh',
};

/**
 * Get ESPN team logo URL
 * Accepts either full team name or abbreviation
 */
export function getTeamLogo(team: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  // Check if it's an abbreviation (2-3 letters)
  let espnAbbr: string | undefined;
  
  if (team.length <= 3) {
    espnAbbr = ABBR_TO_ESPN[team.toUpperCase()];
  } else {
    espnAbbr = TEAM_ABBR_MAP[team];
  }
  
  if (!espnAbbr) {
    console.warn(`Unknown team: ${team}`);
    return getPlaceholderLogo();
  }
  
  const sizeMap = {
    'small': '500',   // 500x500
    'medium': '500',  // 500x500 (same as small)
    'large': '500',   // 500x500
  };
  
  return `https://a.espncdn.com/i/teamlogos/nfl/${sizeMap[size]}/${espnAbbr}.png`;
}

/**
 * Get placeholder logo for unknown teams
 */
function getPlaceholderLogo(): string {
  // NFL shield logo
  return 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png';
}

