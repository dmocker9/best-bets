/**
 * ESPN Player Headshot API Integration
 * 
 * ESPN API endpoint for searching players:
 * https://site.api.espn.com/apis/common/v3/search?query={PLAYER_NAME}&region=us&lang=en&type=player&limit=1
 * 
 * This returns player data including headshot URLs in various sizes
 */

interface ESPNPlayerResult {
  id: string;
  uid: string;
  name: string;
  href: string;
  image: string;
  headshot?: string;
}

// Cache player headshots to avoid repeated API calls
const headshotCache = new Map<string, string>();

/**
 * Fetch player headshot from ESPN API
 * 
 * API Response Structure:
 * {
 *   items: [{
 *     id: "4362628",
 *     displayName: "Ja'Marr Chase",
 *     headshot: {
 *       href: "https://a.espncdn.com/i/headshots/nfl/players/full/4362628.png"
 *     }
 *   }]
 * }
 */
export async function fetchESPNHeadshot(playerName: string): Promise<string | null> {
  try {
    // Check cache first
    if (headshotCache.has(playerName)) {
      return headshotCache.get(playerName)!;
    }

    // ESPN API expects the exact player name (keep apostrophes but trim)
    const searchName = playerName.trim();
    
    const response = await fetch(
      `https://site.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(searchName)}&region=us&lang=en&type=player&limit=1`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.warn(`ESPN API error for ${playerName}:`, response.status);
      return null;
    }

    const data = await response.json();
    
    // Check if we have results
    if (!data.items || data.items.length === 0) {
      console.warn(`No ESPN results for ${playerName}`);
      return null;
    }

    // Get first result (should be the player)
    const player = data.items[0];
    
    // Check for headshot in response
    if (player.headshot?.href) {
      const headshotUrl = player.headshot.href;
      console.log(`✅ Found ESPN headshot for ${playerName}:`, headshotUrl);
      headshotCache.set(playerName, headshotUrl);
      return headshotUrl;
    }

    // Fallback: construct URL from player ID if headshot not in response
    if (player.id) {
      const headshotUrl = `https://a.espncdn.com/i/headshots/nfl/players/full/${player.id}.png`;
      console.log(`⚠️ Using fallback headshot URL for ${playerName}:`, headshotUrl);
      headshotCache.set(playerName, headshotUrl);
      return headshotUrl;
    }

    console.warn(`No headshot found for ${playerName}`);
    return null;
  } catch (error) {
    console.error(`Error fetching ESPN headshot for ${playerName}:`, error);
    return null;
  }
}

/**
 * Get player headshot (synchronous with fallback)
 * For client components, this returns a placeholder first,
 * then you should use the usePlayerHeadshot hook to load the real image
 */
export function getPlayerHeadshot(playerName: string, position: string = 'RB'): string {
  // Check cache for already-fetched headshots
  if (headshotCache.has(playerName)) {
    return headshotCache.get(playerName)!;
  }
  
  // Return placeholder while loading
  return getPlaceholderAvatar(playerName, position);
}

/**
 * Generate initials from player name
 */
function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Get color based on position
 */
function getPositionColor(position: string): { bg: string; text: string } {
  switch (position) {
    case 'QB':
      return { bg: '#dc2626', text: '#ffffff' }; // Red
    case 'RB':
      return { bg: '#2563eb', text: '#ffffff' }; // Blue
    case 'WR':
      return { bg: '#16a34a', text: '#ffffff' }; // Green
    case 'TE':
      return { bg: '#9333ea', text: '#ffffff' }; // Purple
    default:
      return { bg: '#6b7280', text: '#ffffff' }; // Gray
  }
}

/**
 * Generate placeholder avatar with initials
 */
function getPlaceholderAvatar(playerName: string, position: string): string {
  const initials = getInitials(playerName);
  const colors = getPositionColor(position);
  
  const svg = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="${colors.bg}"/><text x="50" y="58" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="${colors.text}">${initials}</text></svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Get placeholder image for unknown players
 */
export function getPlaceholderImage(): string {
  // Generic NFL helmet SVG
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMWExZjJlIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzRhNWU3YSI+8J+PiDwvdGV4dD4KPC9zdmc+';
}

