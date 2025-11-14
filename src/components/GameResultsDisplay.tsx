'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTeamLogo } from '@/lib/espnTeamLogos';

interface GameResult {
  id: string;
  game_id?: string; // Foreign key to odds_bets
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  winner: string;
  week_number: number;
  season: number;
  game_date: string;
  game_status: string;
  prediction: {
    predicted_winner: string;
    predicted_spread: number;
    confidence_score: number;
    recommended_bet: string;
    reasoning: string;
    correct: boolean;
  } | null;
  recommendation_result: string | null; // 'win', 'loss', 'push'
  spread_covered: string | null;
  odds_bets: {
    home_spread: number;
    away_spread: number;
    home_price: string;
    away_price: string;
  } | null;
}

interface GameResultsResponse {
  success: boolean;
  results: GameResult[];
  record: {
    wins: number;
    losses: number;
    pushes: number;
  };
  total: number;
}

export function GameResultsDisplay() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<GameResultsResponse | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>(10);
  const [selectedSeason, setSelectedSeason] = useState<number>(2025);
  const [topPickGameIds, setTopPickGameIds] = useState<Set<string>>(new Set());

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ season: selectedSeason.toString() });
      if (selectedWeek !== 'all') {
        params.append('week', selectedWeek.toString());
      }
      
      const response = await fetch(`/api/game-results?${params.toString()}`);
      const data = await response.json();
      setResult(data);
      
      // Fetch top picks to identify "Bet of the Week" games
      const topPickParams = new URLSearchParams({ season: selectedSeason.toString() });
      if (selectedWeek !== 'all') {
        topPickParams.append('week', selectedWeek.toString());
      }
      
      const topPicksResponse = await fetch(`/api/top-picks?${topPickParams.toString()}`);
      const topPicksData = await topPicksResponse.json();
      
      console.log('Top Picks Data:', topPicksData);
      console.log('Top Pick Game IDs:', topPicksData.topPickGameIds);
      
      if (topPicksData.success && topPicksData.topPickGameIds) {
        setTopPickGameIds(new Set(topPicksData.topPickGameIds));
        console.log('Set topPickGameIds:', topPicksData.topPickGameIds);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      setResult({
        success: false,
        results: [],
        record: { wins: 0, losses: 0, pushes: 0 },
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedWeek, selectedSeason]);

  // Auto-fetch results when component mounts or filters change
  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const getResultColor = (result: string | null) => {
    if (result === 'win') return 'text-green-400 bg-green-900/30 border-green-700';
    if (result === 'loss') return 'text-red-400 bg-red-900/30 border-red-700';
    if (result === 'push') return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
    return 'text-gray-400 bg-gray-900/30 border-gray-700';
  };

  const getResultIcon = (result: string | null) => {
    if (result === 'win') return '✓';
    if (result === 'loss') return '✗';
    if (result === 'push') return '=';
    return '?';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">📊 Past Results</h2>
        <div className="flex items-center gap-4">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="bg-[#1a1f2e] text-white px-4 py-2 rounded-lg border border-gray-700"
          >
            <option value="all">All Weeks</option>
            {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Record Display */}
      {result && result.results && (
        (() => {
          // Calculate record from filtered results (only our recommendations)
          const filteredGames = result.results.filter((game) => 
            game.prediction && game.prediction.recommended_bet && game.prediction.recommended_bet !== 'none'
          );
          
          const calculatedRecord = filteredGames.reduce((acc, game) => {
            if (game.recommendation_result === 'win') acc.wins++;
            else if (game.recommendation_result === 'loss') acc.losses++;
            else if (game.recommendation_result === 'push') acc.pushes++;
            return acc;
          }, { wins: 0, losses: 0, pushes: 0 });
          
          return (
            <div className="bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-blue-900/20 rounded-lg p-4 border border-blue-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">
                    {selectedWeek === 'all' ? 'Overall Record' : `Week ${selectedWeek} Record`}
                  </h3>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400">{calculatedRecord.wins}</div>
                      <div className="text-xs text-gray-400">Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-400">{calculatedRecord.losses}</div>
                      <div className="text-xs text-gray-400">Losses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-400">{calculatedRecord.pushes}</div>
                      <div className="text-xs text-gray-400">Pushes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">
                        {calculatedRecord.wins + calculatedRecord.losses > 0
                          ? ((calculatedRecord.wins / (calculatedRecord.wins + calculatedRecord.losses)) * 100).toFixed(1)
                          : '0.0'}%
                      </div>
                      <div className="text-xs text-gray-400">Win Rate</div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Total Picks</div>
                  <div className="text-2xl font-bold text-white">{filteredGames.length}</div>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading results...</span>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-3">
          {result.results.length > 0 ? (
            // Filter to only games we made recommendations for, then sort: Bet of the Week first, then by date
            [...result.results]
              .filter((game) => {
                // Only show games where we made a recommendation
                return game.prediction && game.prediction.recommended_bet && game.prediction.recommended_bet !== 'none';
              })
              .sort((a, b) => {
                const aIsBetOfWeek = topPickGameIds.has(a.game_id || a.id);
                const bIsBetOfWeek = topPickGameIds.has(b.game_id || b.id);
                if (aIsBetOfWeek && !bIsBetOfWeek) return -1;
                if (!aIsBetOfWeek && bIsBetOfWeek) return 1;
                return new Date(b.game_date).getTime() - new Date(a.game_date).getTime();
              })
              .map((game) => {
              const isBetOfWeek = topPickGameIds.has(game.game_id || game.id);
              console.log(`Game ${game.home_team}: game_id=${game.game_id}, id=${game.id}, isBetOfWeek=${isBetOfWeek}, topPickIds:`, Array.from(topPickGameIds));
              
              return (
                <div
                  key={game.id}
                  className={`bg-gray-800 rounded-lg p-4 transition-all ${
                    isBetOfWeek 
                      ? 'border-2 border-yellow-500 shadow-lg shadow-yellow-500/20' 
                      : 'border border-gray-700 hover:border-blue-500'
                  }`}
                >
                  {/* Game Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-lg">
                          <img src={getTeamLogo(game.away_team)} alt={game.away_team} className="w-6 h-6 object-contain" />
                          <span className={`font-bold ${isBetOfWeek ? 'text-yellow-400' : 'text-white'}`}>
                            {game.away_team}
                          </span>
                          <span className="text-gray-500 text-base">@</span>
                          <span className={`font-bold ${isBetOfWeek ? 'text-yellow-400' : 'text-white'}`}>
                            {game.home_team}
                          </span>
                          <img src={getTeamLogo(game.home_team)} alt={game.home_team} className="w-6 h-6 object-contain" />
                        </div>
                        <span className="text-xs text-gray-400">Week {game.week_number}</span>
                        {isBetOfWeek && (
                          <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black text-xs font-bold rounded-md shadow-lg">
                            ⭐ BET OF THE WEEK
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(game.game_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    {game.recommendation_result && (
                      <div
                        className={`px-3 py-1 rounded-lg border font-bold text-sm ${getResultColor(
                          game.recommendation_result
                        )}`}
                      >
                        {getResultIcon(game.recommendation_result)} {game.recommendation_result.toUpperCase()}
                      </div>
                    )}
                  </div>

                {/* Score */}
                <div className="bg-gray-900/50 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={getTeamLogo(game.away_team)} alt={game.away_team} className="w-8 h-8 object-contain" />
                      <span
                        className={`text-xl font-bold ${
                          game.winner === game.away_team ? 'text-green-400' : 'text-gray-400'
                        }`}
                      >
                        {game.away_team}
                      </span>
                      <span className="text-3xl font-bold text-white">{game.away_score}</span>
                    </div>
                    <span className="text-gray-500 text-xl">-</span>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-white">{game.home_score}</span>
                      <span
                        className={`text-xl font-bold ${
                          game.winner === game.home_team ? 'text-green-400' : 'text-gray-400'
                        }`}
                      >
                        {game.home_team}
                      </span>
                      <img src={getTeamLogo(game.home_team)} alt={game.home_team} className="w-8 h-8 object-contain" />
                    </div>
                  </div>
                  <div className="text-center mt-3">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm text-gray-400">Winner:</span>
                      <img src={getTeamLogo(game.winner)} alt={game.winner} className="w-6 h-6 object-contain" />
                      <span className="text-green-400 font-semibold text-base">{game.winner}</span>
                    </div>
                  </div>
                </div>

                {/* Prediction Comparison */}
                {game.prediction && (
                  <div className="border-t border-gray-700 pt-3 space-y-2">
                    <h4 className="text-sm font-semibold text-blue-300">Our Prediction:</h4>
                    <div className="bg-blue-900/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Predicted Winner:</span>
                        <span
                          className={`font-semibold ${
                            game.prediction.correct ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {game.prediction.predicted_winner}
                          {game.prediction.correct ? ' ✓' : ' ✗'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Predicted Margin:</span>
                        <span className="text-white font-semibold">
                          {(() => {
                            const spread = typeof game.prediction.predicted_spread === 'number' 
                              ? game.prediction.predicted_spread 
                              : parseFloat(String(game.prediction.predicted_spread));
                            return (spread > 0 ? '+' : '') + spread.toFixed(1);
                          })()} pts
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Actual Margin:</span>
                        <span className="text-white font-semibold">
                          {game.home_score - game.away_score > 0 ? '+' : ''}
                          {(game.home_score - game.away_score)} pts
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Confidence:</span>
                        <span className="text-yellow-400 font-semibold">
                          {(() => {
                            const confidence = typeof game.prediction.confidence_score === 'number' 
                              ? game.prediction.confidence_score 
                              : parseFloat(String(game.prediction.confidence_score));
                            return confidence.toFixed(0);
                          })()}%
                        </span>
                      </div>
                      
                      {/* Recommended Bet with Result */}
                      {game.recommendation_result && game.odds_bets && (
                        <div className="pt-2 border-t border-blue-700/30 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Recommended Bet:</span>
                            <span className="text-blue-400 font-semibold">
                              {(() => {
                                const bet = game.prediction.recommended_bet;
                                if (bet === 'home_spread') {
                                  return `${game.home_team} ${game.odds_bets.home_spread}`;
                                } else if (bet === 'away_spread') {
                                  return `${game.away_team} ${game.odds_bets.away_spread}`;
                                } else if (bet === 'home_ml') {
                                  return `${game.home_team} ML (${game.odds_bets.home_price})`;
                                } else if (bet === 'away_ml') {
                                  return `${game.away_team} ML (${game.odds_bets.away_price})`;
                                }
                                return bet;
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Bet Result:</span>
                            <div className={`px-3 py-1 rounded-lg border font-bold text-xs ${getResultColor(game.recommendation_result)}`}>
                              {getResultIcon(game.recommendation_result)} {game.recommendation_result.toUpperCase()}
                            </div>
                          </div>
                          {game.recommendation_result === 'win' && (
                            <div className="text-xs text-green-400 mt-1 bg-green-900/20 p-2 rounded">
                              <div className="font-semibold">✓ Bet Hit!</div>
                              <div className="mt-1">
                                {(() => {
                                  const actualMargin = game.home_score - game.away_score;
                                  const bet = game.prediction.recommended_bet;
                                  if (bet === 'home_spread') {
                                    const spreadStr = game.odds_bets.home_spread || '0';
                                    const spread = parseFloat(spreadStr.replace(/[^\d.-]/g, '') || '0');
                                    if (spread < 0) {
                                      // Home favored
                                      return `${game.home_team} won by ${actualMargin} pts, covering the ${Math.abs(spread)}-point spread (needed to win by more than ${Math.abs(spread)})`;
                                    } else {
                                      // Home underdog
                                      return `${game.home_team} ${game.home_score > game.away_score ? 'won' : 'covered'} with the ${spread}-point spread`;
                                    }
                                  } else if (bet === 'away_spread') {
                                    const spreadStr = game.odds_bets.away_spread || '0';
                                    const spread = parseFloat(spreadStr.replace(/[^\d.-]/g, '') || '0');
                                    if (game.away_score > game.home_score) {
                                      if (spread < 0) {
                                        return `${game.away_team} won by ${Math.abs(actualMargin)} pts, covering the ${Math.abs(spread)}-point spread`;
                                      } else {
                                        return `${game.away_team} won by ${Math.abs(actualMargin)} pts`;
                                      }
                                    } else {
                                      if (spread > 0) {
                                        return `${game.away_team} lost by ${Math.abs(actualMargin)} pts but covered the ${spread}-point spread`;
                                      } else {
                                        return `${game.away_team} covered with the spread`;
                                      }
                                    }
                                  } else if (bet === 'home_ml' || bet === 'away_ml') {
                                    const team = bet === 'home_ml' ? game.home_team : game.away_team;
                                    return `${team} won the game`;
                                  }
                                  return '';
                                })()}
                              </div>
                            </div>
                          )}
                          {game.recommendation_result === 'loss' && (
                            <div className="text-xs text-red-400 mt-1 bg-red-900/20 p-2 rounded">
                              <div className="font-semibold">✗ Bet Did Not Hit</div>
                              <div className="mt-1">
                                {(() => {
                                  const actualMargin = game.home_score - game.away_score;
                                  const bet = game.prediction.recommended_bet;
                                  if (bet === 'home_spread') {
                                    const spreadStr = game.odds_bets.home_spread || '0';
                                    const spread = parseFloat(spreadStr.replace(/[^\d.-]/g, '') || '0');
                                    if (spread < 0) {
                                      // Home favored but didn't cover
                                      return `${game.home_team} won by ${actualMargin} pts but needed to win by more than ${Math.abs(spread)} pts to cover`;
                                    } else {
                                      // Home underdog didn't cover
                                      return `${game.home_team} lost by ${Math.abs(actualMargin)} pts and did not cover the ${spread}-point spread`;
                                    }
                                  } else if (bet === 'away_spread') {
                                    const spreadStr = game.odds_bets.away_spread || '0';
                                    const spread = parseFloat(spreadStr.replace(/[^\d.-]/g, '') || '0');
                                    if (spread < 0) {
                                      // Away favored but didn't cover
                                      return `${game.away_team} ${game.away_score > game.home_score ? `won by ${Math.abs(actualMargin)} pts but needed to win by more than ${Math.abs(spread)} pts` : 'lost and did not cover'}`;
                                    } else {
                                      // Away underdog didn't cover
                                      return `${game.away_team} lost by ${Math.abs(actualMargin)} pts and did not cover the ${spread}-point spread`;
                                    }
                                  } else if (bet === 'home_ml' || bet === 'away_ml') {
                                    const team = bet === 'home_ml' ? game.home_team : game.away_team;
                                    return `${team} did not win the game`;
                                  }
                                  return '';
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* No Prediction */}
                {!game.prediction && (
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-sm text-gray-500 italic">
                      No prediction was made for this game
                    </p>
                  </div>
                )}
              </div>
            );
          })
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
              <p className="text-gray-400 text-lg">
                {selectedWeek === 'all' 
                  ? 'No recommended bets with results found.'
                  : `No recommended bets with results found for Week ${selectedWeek}.`}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {selectedWeek === 'all'
                  ? 'Select a specific week to view results, or sync game results using the API endpoint.'
                  : 'Game results may not be synced yet, or no recommendations were made for this week.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


