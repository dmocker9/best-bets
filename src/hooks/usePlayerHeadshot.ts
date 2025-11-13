import { useState, useEffect } from 'react';
import { fetchESPNHeadshot, getPlayerHeadshot } from '@/lib/espnHeadshots';

/**
 * React hook to load ESPN player headshots
 * Shows placeholder with initials first, then loads real headshot from ESPN API
 */
export function usePlayerHeadshot(playerName: string, position: string) {
  const [headshot, setHeadshot] = useState<string>(
    getPlayerHeadshot(playerName, position) // Initials placeholder
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadHeadshot = async () => {
      try {
        const espnHeadshot = await fetchESPNHeadshot(playerName);
        
        if (mounted && espnHeadshot) {
          setHeadshot(espnHeadshot);
          setIsLoading(false);
        } else if (mounted) {
          // Keep placeholder if ESPN headshot not found
          setIsLoading(false);
        }
      } catch (error) {
        console.error(`Failed to load headshot for ${playerName}:`, error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadHeadshot();

    return () => {
      mounted = false;
    };
  }, [playerName, position]);

  return { headshot, isLoading };
}

