'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTeamLogo } from '@/lib/espnTeamLogos';

interface TeamStats {
  team_name: string;
  wins: number;
  losses: number;
  ties: number;
  win_loss_record: string;
  win_percentage: number;
  points_per_game: number;
  points_allowed_per_game: number;
  point_differential: number;
  margin_of_victory: number;
  strength_of_schedule: number;
  offensive_rating: number;
  defensive_rating: number;
}

interface GamePrediction {
  game_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  predicted_winner: string;
  confidence_score: number;
  predicted_margin: number;
  current_spread: string; // Already formatted with +/- prefix
  home_moneyline: string;
  away_moneyline: string;
  home_team_strength: number;
  away_team_strength: number;
  value_score: number;
  recommended_bet: string | null;
  bet_type: 'home_spread' | 'away_spread' | 'home_ml' | 'away_ml' | 'none' | null;
  bet_strength?: 'strong' | 'good' | 'value' | 'insight';
  quality_score?: number;
  reasoning: string;
  home_stats?: TeamStats;
  away_stats?: TeamStats;
}

interface BestBetsResponse {
  success: boolean;
  message: string;
  predictions: GamePrediction[];
  analyzed: number;
  recommendations: number;
  generated_at: string;
}

export function BestBetsDisplay() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<BestBetsResponse | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showGlossary, setShowGlossary] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number>(11);
  const [selectedSeason, setSelectedSeason] = useState<number>(2025);

  const fetchBestBets = useCallback(async () => {
    setLoading(true);
    setResult(null);

    try {
      const params = new URLSearchParams({ 
        limit: '5', 
        week: selectedWeek.toString(), 
        season: selectedSeason.toString(), 
        type: 'spreads' 
      });
      const response = await fetch(`/api/best-bets?${params.toString()}`);
      const data = await response.json();
      console.log('Fetched predictions:', data.predictions);
      console.log('First prediction has stats?', data.predictions[0]?.home_stats ? 'Yes' : 'No');
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        predictions: [],
        analyzed: 0,
        recommendations: 0,
        generated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [selectedWeek, selectedSeason]);

  // Automatically fetch best bets on component mount or when filters change
  useEffect(() => {
    fetchBestBets();
  }, [fetchBestBets]);

  const toggleExpanded = (gameId: string) => {
    console.log('Toggling expansion for game:', gameId);
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
        console.log('Collapsed');
      } else {
        newSet.add(gameId);
        console.log('Expanded');
      }
      console.log('Expanded cards:', Array.from(newSet));
      return newSet;
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-400';
    if (confidence >= 50) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 70) return 'bg-green-900/30 border-green-700';
    if (confidence >= 50) return 'bg-yellow-900/30 border-yellow-700';
    return 'bg-orange-900/30 border-orange-700';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">🎯 Best Bets NFL Week {selectedWeek}</h2>
        <div className="flex items-center gap-4">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            className="bg-[#1a1f2e] text-white px-4 py-2 rounded-lg border border-gray-700"
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
          {loading && (
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Decorative Banner */}
      <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 via-pink-500 to-blue-500 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={`p-4 rounded-lg border ${
            result.success ? 'bg-blue-900/20 border-blue-700' : 'bg-red-900/20 border-red-700'
          }`}>
            <p className="text-sm text-gray-300">
              {result.message} • Analyzed {result.analyzed} games • Generated {new Date(result.generated_at).toLocaleString()}
            </p>
          </div>

          {/* Predictions */}
          {result.predictions.length > 0 ? (
            <div className="space-y-3">
              {result.predictions.map((prediction, index) => (
                <div
                  key={prediction.game_id}
                  className={`bg-gray-800 rounded-lg p-4 border transition-colors ${
                    index === 0 
                      ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' 
                      : 'border-gray-700 hover:border-blue-500'
                  }`}
                >
                  {/* Best Bet of the Week Badge - Only for #1 */}
                  {index === 0 && (
                    <div className="mb-3 -mt-1 -mx-1">
                      <div className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 text-gray-900 font-black text-sm px-4 py-2 rounded-t-lg text-center uppercase tracking-wider shadow-lg">
                        ⭐ Best Bet of the Week! ⭐
                      </div>
                    </div>
                  )}
                  
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${index === 0 ? 'text-yellow-400' : 'text-blue-400'}`}>
                          #{index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 text-xl font-semibold text-white">
                            <img src={getTeamLogo(prediction.away_team)} alt={prediction.away_team} className="w-7 h-7 object-contain" />
                            <span>{prediction.away_team}</span>
                            <span className="text-gray-500 text-base">@</span>
                            <span>{prediction.home_team}</span>
                            <img src={getTeamLogo(prediction.home_team)} alt={prediction.home_team} className="w-7 h-7 object-contain" />
                          </div>
                          <p className="text-xs text-gray-400">
                            {(() => {
                              const date = new Date(prediction.commence_time);
                              const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
                              const month = date.toLocaleDateString('en-US', { month: 'long' });
                              const day = date.getDate();
                              const suffix = day === 1 || day === 21 || day === 31 ? 'st' : 
                                           day === 2 || day === 22 ? 'nd' : 
                                           day === 3 || day === 23 ? 'rd' : 'th';
                              const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                              return `${dayOfWeek}, ${month} ${day}${suffix} at ${time}`;
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Confidence Ring */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative w-14 h-14">
                        <svg className="w-14 h-14 transform -rotate-90">
                          {/* Background circle */}
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="none"
                            className="text-gray-700"
                          />
                          {/* Progress circle */}
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 24}`}
                            strokeDashoffset={`${2 * Math.PI * 24 * (1 - prediction.confidence_score / 100)}`}
                            className={prediction.confidence_score >= 70 ? 'text-green-400' : 
                                      prediction.confidence_score >= 50 ? 'text-yellow-400' : 'text-orange-400'}
                            strokeLinecap="round"
                          />
                        </svg>
                        {/* Center percentage */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-lg font-bold ${getConfidenceColor(prediction.confidence_score)}`}>
                            {prediction.confidence_score.toFixed(0)}
                          </span>
                        </div>
                      </div>
                      {/* Label below ring */}
                      <span className="text-xs text-gray-400 font-medium">Confidence</span>
                    </div>
                  </div>

                  {/* Recommended Bet */}
                  <div className={`border rounded-lg p-3 mb-3 ${
                    prediction.bet_strength === 'strong' ? 'bg-green-900/20 border-green-700' :
                    prediction.bet_strength === 'good' ? 'bg-blue-900/20 border-blue-700' :
                    prediction.bet_strength === 'value' ? 'bg-yellow-900/20 border-yellow-700' :
                    'bg-gray-900/20 border-gray-600'
                  }`}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`text-sm font-semibold uppercase ${
                        prediction.bet_strength === 'strong' ? 'text-green-400' :
                        prediction.bet_strength === 'good' ? 'text-blue-400' :
                        prediction.bet_strength === 'value' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {prediction.bet_strength === 'insight' ? 'Model Pick' : 
                         `${prediction.bet_strength} Bet`} - {prediction.bet_type?.includes('_ml') ? 'Moneyline' : 'Spread'}
                      </span>
                      {prediction.bet_strength === 'strong' && <span className="text-xs bg-green-500 text-black px-2 py-0.5 rounded font-bold">⭐ TOP PICK</span>}
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      {(() => {
                        // Extract team name from recommended bet (e.g., "New York Giants +7" or "Bills -3.5")
                        const bet = prediction.recommended_bet || '';
                        let teamName = '';
                        
                        // Try to match team name (everything before +/- or "Moneyline")
                        if (bet.includes('Moneyline')) {
                          teamName = bet.replace('Moneyline', '').trim();
                        } else {
                          // Match everything before the last +/- sign
                          const match = bet.match(/^(.+?)(?:\s+[-+]\d)/);
                          teamName = match ? match[1].trim() : bet;
                        }
                        
                        return (
                          <>
                            <img src={getTeamLogo(teamName)} alt={teamName} className="w-10 h-10 object-contain" />
                            <p className="text-2xl font-bold text-white">{bet}</p>
                          </>
                        );
                      })()}
                    </div>
                    
                    {/* Simple one-sentence summary */}
                    <p className="text-sm text-gray-300 mb-3">
                      Our model predicts {prediction.predicted_winner} by {Math.abs(prediction.predicted_margin).toFixed(1)} points with {prediction.confidence_score.toFixed(0)}% confidence, giving us a {Math.abs(Math.abs(prediction.predicted_margin) - Math.abs(parseFloat(prediction.current_spread.replace(/[^\d.-]/g, '')))).toFixed(1)}-point edge over the Vegas line.
                    </p>
                    
                    {/* Expandable Detailed Analysis */}
                    <button
                      onClick={() => toggleExpanded(prediction.game_id)}
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                    >
                      {expandedCards.has(prediction.game_id) ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          Hide Detailed Analysis
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          Show Detailed Analysis
                        </>
                      )}
                    </button>

                    {/* Detailed Explanation - Expanded */}
                    {expandedCards.has(prediction.game_id) && prediction.home_stats && prediction.away_stats && (
                      <div className="mt-4 pt-4 border-t border-blue-700/50 space-y-4 text-sm">
                        {/* Detailed Bet Breakdown */}
                        <div className="space-y-2 mb-4 bg-gray-900/30 p-3 rounded border border-blue-700/30">
                          <h4 className="font-bold text-blue-300 mb-3">Betting Breakdown:</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-start gap-2">
                              <span className="text-blue-400 font-semibold min-w-[140px]">Our Model Predicts:</span>
                              <span className="text-white">{prediction.predicted_winner} by {Math.abs(prediction.predicted_margin).toFixed(1)} points</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-gray-400 font-semibold min-w-[140px]">Vegas Spread:</span>
                              <span className="text-white">{prediction.current_spread} <span className="text-gray-500 text-xs">(betting line)</span></span>
                            </div>
                            <div className="flex items-start gap-2 bg-green-900/20 -mx-2 px-2 py-1.5 rounded">
                              <span className="text-green-400 font-semibold min-w-[140px]">Betting Edge:</span>
                              <span className="text-green-300">
                                {Math.abs(Math.abs(prediction.predicted_margin) - Math.abs(parseFloat(prediction.current_spread.replace(/[^\d.-]/g, '')))).toFixed(1)} points
                                <span className="text-green-500 text-xs ml-1">(difference between our prediction and Vegas)</span>
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-purple-400 font-semibold min-w-[140px]">Confidence Level:</span>
                              <span className={`font-bold ${
                                prediction.confidence_score >= 70 ? 'text-green-400' : 
                                prediction.confidence_score >= 50 ? 'text-yellow-400' : 'text-orange-400'
                              }`}>
                                {prediction.confidence_score.toFixed(0)}%
                                {prediction.confidence_score >= 70 && <span className="text-green-400 ml-1">(STRONG BET)</span>}
                                {prediction.confidence_score >= 50 && prediction.confidence_score < 70 && <span className="text-yellow-400 ml-1">(GOOD BET)</span>}
                                {prediction.confidence_score < 50 && <span className="text-orange-400 ml-1">(VALUE BET)</span>}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 italic border-t border-blue-700/30 pt-2 mt-2">
                            💡 The larger the edge, the more our model disagrees with Vegas, creating a potential betting opportunity.
                          </p>
                        </div>
                        
                        {/* Team Statistics Comparison */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Home Team */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <img src={getTeamLogo(prediction.home_team)} alt={prediction.home_team} className="w-7 h-7 object-contain" />
                              <h4 className="font-bold text-blue-300 text-lg">{prediction.home_team}</h4>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="bg-gray-900/50 p-2 rounded">
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-400">Record:</span>
                                  <span className="text-white font-medium">{prediction.home_stats.win_loss_record}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Win %:</span>
                                  <span className="text-white font-medium">{(prediction.home_stats.win_percentage * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                              
                              <div className="bg-gray-900/50 p-2 rounded">
                                <div className="font-semibold text-gray-300 mb-1">Offense</div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-400">PPG:</span>
                                  <span className="text-white font-medium">{prediction.home_stats.points_per_game.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Off. Rating (OSRS):</span>
                                  <span className="text-white font-medium">{prediction.home_stats.offensive_rating.toFixed(1)}</span>
                                </div>
                              </div>
                              
                              <div className="bg-gray-900/50 p-2 rounded">
                                <div className="font-semibold text-gray-300 mb-1">Defense</div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-400">PA/G:</span>
                                  <span className="text-white font-medium">{prediction.home_stats.points_allowed_per_game.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Def. Rating (DSRS):</span>
                                  <span className="text-white font-medium">{prediction.home_stats.defensive_rating.toFixed(1)}</span>
                                </div>
                              </div>
                              
                              <div className="bg-gray-900/50 p-2 rounded">
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-400">Total SRS:</span>
                                  <span className="text-white font-medium">{(prediction.home_stats.offensive_rating + prediction.home_stats.defensive_rating).toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-400">Margin of Victory:</span>
                                  <span className="text-white font-medium">{prediction.home_stats.margin_of_victory.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">SOS:</span>
                                  <span className="text-white font-medium">{prediction.home_stats.strength_of_schedule.toFixed(1)}</span>
                                </div>
                              </div>
                              
                              <div className="bg-blue-900/30 p-2 rounded border border-blue-700/50">
                                <div className="flex justify-between">
                                  <span className="text-blue-300 font-semibold">Overall Strength:</span>
                                  <span className="text-blue-200 font-bold">{prediction.home_team_strength.toFixed(1)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Away Team */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <img src={getTeamLogo(prediction.away_team)} alt={prediction.away_team} className="w-7 h-7 object-contain" />
                              <h4 className="font-bold text-blue-300 text-lg">{prediction.away_team}</h4>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="bg-gray-900/50 p-2 rounded">
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-400">Record:</span>
                                  <span className="text-white font-medium">{prediction.away_stats.win_loss_record}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Win %:</span>
                                  <span className="text-white font-medium">{(prediction.away_stats.win_percentage * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                              
                              <div className="bg-gray-900/50 p-2 rounded">
                                <div className="font-semibold text-gray-300 mb-1">Offense</div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-400">PPG:</span>
                                  <span className="text-white font-medium">{prediction.away_stats.points_per_game.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Off. Rating (OSRS):</span>
                                  <span className="text-white font-medium">{prediction.away_stats.offensive_rating.toFixed(1)}</span>
                                </div>
                              </div>
                              
                              <div className="bg-gray-900/50 p-2 rounded">
                                <div className="font-semibold text-gray-300 mb-1">Defense</div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-400">PA/G:</span>
                                  <span className="text-white font-medium">{prediction.away_stats.points_allowed_per_game.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Def. Rating (DSRS):</span>
                                  <span className="text-white font-medium">{prediction.away_stats.defensive_rating.toFixed(1)}</span>
                                </div>
                              </div>
                              
                              <div className="bg-gray-900/50 p-2 rounded">
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-400">Total SRS:</span>
                                  <span className="text-white font-medium">{(prediction.away_stats.offensive_rating + prediction.away_stats.defensive_rating).toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-400">Margin of Victory:</span>
                                  <span className="text-white font-medium">{prediction.away_stats.margin_of_victory.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">SOS:</span>
                                  <span className="text-white font-medium">{prediction.away_stats.strength_of_schedule.toFixed(1)}</span>
                                </div>
                              </div>
                              
                              <div className="bg-blue-900/30 p-2 rounded border border-blue-700/50">
                                <div className="flex justify-between">
                                  <span className="text-blue-300 font-semibold">Overall Strength:</span>
                                  <span className="text-blue-200 font-bold">{prediction.away_team_strength.toFixed(1)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Key Insight */}
                        <div className="pt-3 border-t border-blue-700/30">
                          <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-indigo-900/40 p-4 rounded-lg border border-indigo-700/50">
                            <h4 className="font-bold text-indigo-300 mb-2 flex items-center gap-2">
                              <span className="text-lg">💡</span>
                              <span>Key Insight</span>
                            </h4>
                            <p className="text-xs text-gray-300 leading-relaxed">
                              The {Math.abs(prediction.predicted_margin).toFixed(1)}-point predicted margin is driven by a{' '}
                              <span className="text-white font-semibold">
                                {Math.abs(prediction.home_team_strength - prediction.away_team_strength).toFixed(1)}-point strength gap
                              </span>{' '}
                              between the two teams' season-long performance metrics. The model calculates{' '}
                              <span className="text-indigo-300 font-semibold">{prediction.predicted_winner}</span>{' '}
                              has significantly {prediction.home_team_strength > prediction.away_team_strength ? 'stronger' : 'better'} combined 
                              offensive and defensive ratings (SRS: {' '}
                              <span className="text-white font-medium">
                                {((prediction.home_stats?.offensive_rating || 0) + (prediction.home_stats?.defensive_rating || 0)).toFixed(1)} vs{' '}
                                {((prediction.away_stats?.offensive_rating || 0) + (prediction.away_stats?.defensive_rating || 0)).toFixed(1)}
                              </span>
                              ), giving them a substantial edge. After applying conservative dampening (0.70×), home field advantage 
                              (+1.5 pts), and injury adjustments, the model projects a {Math.abs(prediction.predicted_margin).toFixed(1)}-point margin, creating a{' '}
                              <span className="text-green-400 font-semibold">
                                {Math.abs(Math.abs(prediction.predicted_margin) - Math.abs(parseFloat(prediction.current_spread.replace(/[^\d.-]/g, '')))).toFixed(1)}-point edge
                              </span>{' '}
                              over Vegas's {prediction.current_spread} line.
                            </p>
                          </div>
                        </div>

                        {/* Bottom Note */}
                        <div className="pt-2 text-xs text-gray-400 italic border-t border-blue-700/30 mt-3">
                          📊 Analysis based on 2025 season data including SRS (Simple Rating System), strength of schedule, and performance metrics.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-900 rounded p-2">
                      <p className="text-gray-400 text-xs mb-1">Predicted Winner</p>
                      <p className="text-white font-semibold">{prediction.predicted_winner}</p>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <p className="text-gray-400 text-xs mb-1">Predicted Margin</p>
                      <p className="text-white font-semibold">
                        {prediction.predicted_margin > 0 ? '+' : ''}{prediction.predicted_margin.toFixed(1)} pts
                      </p>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <p className="text-gray-400 text-xs mb-1">Current Spread</p>
                      <p className="text-white font-semibold">
                        {prediction.current_spread}
                      </p>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <p className="text-gray-400 text-xs mb-1">Moneylines</p>
                      <div className="text-white font-semibold text-sm space-y-1.5">
                        <div className="flex items-center gap-2">
                          <img src={getTeamLogo(prediction.away_team)} alt={prediction.away_team} className="w-5 h-5 object-contain" />
                          <span>{prediction.away_team} {prediction.away_moneyline}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <img src={getTeamLogo(prediction.home_team)} alt={prediction.home_team} className="w-5 h-5 object-contain" />
                          <span>{prediction.home_team} {prediction.home_moneyline}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
              <p className="text-gray-400 text-lg">
                No strong betting opportunities found at this time.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                The model requires at least 3 points of disagreement with Vegas odds and 60% confidence to recommend a bet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Statistical Terms Glossary - Dropdown */}
      <div className="mt-8 pt-6 border-t border-gray-700">
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <button
            onClick={() => setShowGlossary(!showGlossary)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-base font-semibold text-white">Statistical Terms Reference</h3>
              <span className="text-xs text-gray-400">(Click to {showGlossary ? 'hide' : 'show'})</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${showGlossary ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showGlossary && (
            <div className="px-4 pb-4 border-t border-gray-700/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1">PPG (Points Per Game)</h4>
                    <p className="text-gray-400 text-xs">Average points scored by a team per game. Higher is better for offense.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1">PA/G (Points Allowed Per Game)</h4>
                    <p className="text-gray-400 text-xs">Average points allowed by a team per game. Lower is better for defense.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1">OSRS (Offensive Simple Rating System)</h4>
                    <p className="text-gray-400 text-xs">Measures offensive efficiency relative to league average. Positive values indicate above-average offense.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1">DSRS (Defensive Simple Rating System)</h4>
                    <p className="text-gray-400 text-xs">Measures defensive efficiency relative to league average. Positive values indicate above-average defense.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1">SRS (Simple Rating System)</h4>
                    <p className="text-gray-400 text-xs">Combined offensive and defensive rating (OSRS + DSRS). Indicates overall team strength relative to average.</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1">SOS (Strength of Schedule)</h4>
                    <p className="text-gray-400 text-xs">Measures difficulty of opponents faced. Positive means harder schedule, negative means easier.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1">Margin of Victory</h4>
                    <p className="text-gray-400 text-xs">Average point differential per game (positive = winning by more, negative = losing by more).</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1">Overall Strength</h4>
                    <p className="text-gray-400 text-xs">Model's composite rating combining offensive/defensive metrics, record quality, and consistency (0-100 scale).</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1">Edge/Value</h4>
                    <p className="text-gray-400 text-xs">Point difference between model's prediction and Vegas spread. Higher edge = bigger betting opportunity.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1">Confidence Score</h4>
                    <p className="text-gray-400 text-xs">Model's certainty in the prediction (0-100%). 75%+ = Strong Bet, 65-74% = Good Bet, 60-64% = Value Bet.</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <p className="text-xs text-gray-500 italic">
                  💡 <strong>Tip:</strong> The model only recommends bets with 2.5-7.5 points of edge AND 60%+ confidence. 
                  This filters out both low-value bets and likely model errors.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

