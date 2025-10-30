'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface OddsBet {
  id: string;
  api_id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: any[];
  created_at: string;
  updated_at: string;
}

export function OddsDisplay() {
  const [odds, setOdds] = useState<OddsBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOdds();
  }, []);

  const fetchOdds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('odds_bets')
        .select('*')
        .order('commence_time', { ascending: true })
        .limit(10);

      if (error) throw error;

      setOdds(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch odds');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const getFirstOdds = (bookmakers: any[]) => {
    if (!bookmakers || bookmakers.length === 0) return null;
    
    // With flattened structure, bookmakers is an array of simplified objects
    const firstBookmaker = bookmakers[0];
    
    return {
      bookmaker: firstBookmaker.bookmaker_name,
      // Spreads
      spread_home_line: firstBookmaker.spread_home_line,
      spread_away_line: firstBookmaker.spread_away_line,
      spread_home_price: firstBookmaker.spread_home_price,
      spread_away_price: firstBookmaker.spread_away_price,
      // Moneyline
      moneyline_home_price: firstBookmaker.moneyline_home_price,
      moneyline_away_price: firstBookmaker.moneyline_away_price,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#22c55e]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (odds.length === 0) {
    return (
      <div className="p-8 text-center bg-[#1a1f2e] rounded-lg border border-gray-700">
        <p className="text-gray-400 text-lg">No odds data available yet.</p>
        <p className="text-gray-500 text-sm mt-2">Click "Sync Odds Data" to fetch the latest odds.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Live Odds</h2>
        <button
          onClick={fetchOdds}
          className="px-4 py-2 bg-[#1a1f2e] hover:bg-[#242936] text-gray-300 rounded-lg border border-gray-700 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="grid gap-4">
        {odds.map((game) => {
          const odds = getFirstOdds(game.bookmakers);
          const hasSpread = odds && (odds.spread_away_line !== null || odds.spread_home_line !== null);
          const hasMoneyline = odds && (odds.moneyline_away_price !== null || odds.moneyline_home_price !== null);
          
          return (
            <div
              key={game.id}
              className="bg-[#1a1f2e] rounded-lg p-6 border border-gray-800 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">{game.sport_title}</span>
                <span className="text-sm text-gray-500">{formatDate(game.commence_time)}</span>
              </div>

              <div className="space-y-3">
                {/* Away Team */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">{game.away_team}</span>
                  <div className="flex gap-4 items-center">
                    {/* Spread */}
                    {hasSpread && odds.spread_away_line !== null && (
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">Spread</span>
                        <span className="text-[#22c55e] font-bold text-lg">
                          {odds.spread_away_line > 0 ? '+' : ''}{odds.spread_away_line}
                        </span>
                        {odds.spread_away_price && (
                          <span className="text-gray-400 text-xs ml-1">
                            ({odds.spread_away_price > 0 ? '+' : ''}{odds.spread_away_price})
                          </span>
                        )}
                      </div>
                    )}
                    {/* Moneyline */}
                    {hasMoneyline && odds.moneyline_away_price !== null && (
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">ML</span>
                        <span className="text-[#22c55e] font-bold text-lg">
                          {odds.moneyline_away_price > 0 ? '+' : ''}{odds.moneyline_away_price}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Home Team */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">{game.home_team}</span>
                  <div className="flex gap-4 items-center">
                    {/* Spread */}
                    {hasSpread && odds.spread_home_line !== null && (
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">Spread</span>
                        <span className="text-[#22c55e] font-bold text-lg">
                          {odds.spread_home_line > 0 ? '+' : ''}{odds.spread_home_line}
                        </span>
                        {odds.spread_home_price && (
                          <span className="text-gray-400 text-xs ml-1">
                            ({odds.spread_home_price > 0 ? '+' : ''}{odds.spread_home_price})
                          </span>
                        )}
                      </div>
                    )}
                    {/* Moneyline */}
                    {hasMoneyline && odds.moneyline_home_price !== null && (
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">ML</span>
                        <span className="text-[#22c55e] font-bold text-lg">
                          {odds.moneyline_home_price > 0 ? '+' : ''}{odds.moneyline_home_price}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {odds && (
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <p className="text-xs text-gray-500">
                    via {odds.bookmaker} • {game.bookmakers.length} bookmaker{game.bookmakers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

