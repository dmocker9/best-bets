'use client';

import { useState, useEffect, useCallback } from 'react';

interface TeamStats {
  team_name: string;
  wins: number;
  losses: number;
  ties: number;
  win_percentage: number;
  points_per_game: number;
  points_allowed_per_game: number;
  point_differential: number;
  margin_of_victory: number;
  srs: number;
  offensive_srs: number;
  defensive_srs: number;
}

interface TotalsPrediction {
  id: string;
  game_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  predicted_total: number;
  confidence_score: number;
  vegas_total: number;
  over_price: number;
  under_price: number;
  value_score: number;
  recommended_bet: 'OVER' | 'UNDER' | null;
  reasoning: string;
  breakdown: {
    base_total: number;
    offensive_matchup_adjustment: number;
    defensive_matchup_adjustment: number;
    pace_adjustment: number;
    competitiveness_adjustment: number;
    srs_adjustment: number;
  };
  week_number: number;
  season: number;
  home_stats?: TeamStats;
  away_stats?: TeamStats;
}

interface TotalsResponse {
  success: boolean;
  message: string;
  predictions: TotalsPrediction[];
  count: number;
  generated_at: string;
}

export function TotalsDisplay() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<TotalsResponse | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showGlossary, setShowGlossary] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number>(10);
  const [selectedSeason, setSelectedSeason] = useState<number>(2025);

  const fetchBestTotals = useCallback(async () => {
    setLoading(true);
    setResult(null);

    try {
      const params = new URLSearchParams({ 
        limit: '5', 
        week: selectedWeek.toString(), 
        season: selectedSeason.toString()
      });
      const response = await fetch(`/api/best-totals-bets?${params.toString()}`);
      const data = await response.json();
      
      // Fetch team stats for each prediction
      if (data.success && data.predictions) {
        const predictionsWithStats = await Promise.all(
          data.predictions.map(async (pred: TotalsPrediction) => {
            try {
              const [homeResponse, awayResponse] = await Promise.all([
                fetch(`/api/team-stats?team=${encodeURIComponent(pred.home_team)}&week=${selectedWeek}`),
                fetch(`/api/team-stats?team=${encodeURIComponent(pred.away_team)}&week=${selectedWeek}`)
              ]);
              
              const homeData = await homeResponse.json();
              const awayData = await awayResponse.json();
              
              return {
                ...pred,
                home_stats: homeData.success ? homeData.stats : undefined,
                away_stats: awayData.success ? awayData.stats : undefined,
              };
            } catch (error) {
              console.error('Error fetching team stats:', error);
              return pred;
            }
          })
        );
        
        setResult({
          ...data,
          predictions: predictionsWithStats,
        });
      } else {
        setResult(data);
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        predictions: [],
        count: 0,
        generated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [selectedWeek, selectedSeason]);

  useEffect(() => {
    fetchBestTotals();
  }, [fetchBestTotals]);

  const toggleExpanded = (gameId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
      } else {
        newSet.add(gameId);
      }
      return newSet;
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-400';
    if (confidence >= 50) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">🎲 Best Over/Under Bets NFL Week {selectedWeek}</h2>
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
      <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 via-purple-500 to-blue-500 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={`p-4 rounded-lg border ${
            result.success ? 'bg-purple-900/20 border-purple-700' : 'bg-red-900/20 border-red-700'
          }`}>
            <p className="text-sm text-gray-300">
              {result.message} • Generated {new Date(result.generated_at).toLocaleString()}
            </p>
          </div>

          {/* Predictions */}
          {result.predictions.length > 0 ? (
            <div className="space-y-3">
              {result.predictions.map((prediction, index) => (
                <div
                  key={prediction.id}
                  className={`bg-gray-800 rounded-lg p-4 border transition-colors ${
                    index === 0 
                      ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' 
                      : 'border-gray-700 hover:border-purple-500'
                  }`}
                >
                  {/* Best Bet of the Week Badge - Only for #1 */}
                  {index === 0 && (
                    <div className="mb-3 -mt-1 -mx-1">
                      <div className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 text-gray-900 font-black text-sm px-4 py-2 rounded-t-lg text-center uppercase tracking-wider shadow-lg">
                        ⭐ Best Totals Bet of the Week! ⭐
                      </div>
                    </div>
                  )}
                  
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${index === 0 ? 'text-yellow-400' : 'text-purple-400'}`}>
                          #{index + 1}
                        </span>
                        <div>
                          <p className="text-lg font-semibold text-white">
                            {prediction.away_team} @ {prediction.home_team}
                          </p>
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
                          <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="5" fill="none" className="text-gray-700" />
                          <circle
                            cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="5" fill="none"
                            strokeDasharray={`${2 * Math.PI * 24}`}
                            strokeDashoffset={`${2 * Math.PI * 24 * (1 - prediction.confidence_score / 100)}`}
                            className={prediction.confidence_score >= 70 ? 'text-green-400' : 
                                      prediction.confidence_score >= 50 ? 'text-yellow-400' : 'text-orange-400'}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-lg font-bold ${getConfidenceColor(prediction.confidence_score)}`}>
                            {prediction.confidence_score.toFixed(0)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">Confidence</span>
                    </div>
                  </div>

                  {/* Recommended Bet */}
                  <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3 mb-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm font-semibold text-purple-400 uppercase">
                        Recommended Totals Bet
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        prediction.recommended_bet === 'OVER' 
                          ? 'bg-red-500/20 text-red-300 border border-red-500/50' 
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                      }`}>
                        {prediction.recommended_bet}
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white mb-2">
                      {prediction.recommended_bet} {prediction.vegas_total}
                      <span className="text-sm ml-2 text-gray-400">
                        ({prediction.recommended_bet === 'OVER' 
                          ? formatOdds(prediction.over_price)
                          : formatOdds(prediction.under_price)})
                      </span>
                    </p>
                    
                    {/* Simple one-sentence summary */}
                    <p className="text-sm text-gray-300 mb-3">
                      Our model predicts a total of {prediction.predicted_total.toFixed(1)} points ({prediction.predicted_total > prediction.vegas_total ? 'above' : 'below'} Vegas line of {prediction.vegas_total}), giving us a {prediction.value_score.toFixed(1)}-point edge with {prediction.confidence_score.toFixed(0)}% confidence.
                    </p>
                    
                    {/* Expandable Detailed Analysis */}
                    <button
                      onClick={() => toggleExpanded(prediction.game_id)}
                      className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
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
                    {expandedCards.has(prediction.game_id) && (
                      <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-4 text-sm">
                        {/* Detailed Bet Breakdown */}
                        <div className="space-y-2 mb-4 bg-gray-900/30 p-3 rounded border border-purple-700/30">
                          <h4 className="font-bold text-purple-300 mb-3">Betting Breakdown:</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-start gap-2">
                              <span className="text-purple-400 font-semibold min-w-[140px]">Our Model Predicts:</span>
                              <span className="text-white">{prediction.predicted_total.toFixed(1)} total points</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-gray-400 font-semibold min-w-[140px]">Vegas Total:</span>
                              <span className="text-white">{prediction.vegas_total} <span className="text-gray-500 text-xs">(O/U line)</span></span>
                            </div>
                            <div className="flex items-start gap-2 bg-green-900/20 -mx-2 px-2 py-1.5 rounded">
                              <span className="text-green-400 font-semibold min-w-[140px]">Betting Edge:</span>
                              <span className="text-green-300">
                                {prediction.value_score.toFixed(1)} points
                                <span className="text-green-500 text-xs ml-1">
                                  (model is {prediction.predicted_total > prediction.vegas_total ? 'higher' : 'lower'} than Vegas)
                                </span>
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-yellow-400 font-semibold min-w-[140px]">Confidence Level:</span>
                              <span className={`font-bold ${getConfidenceColor(prediction.confidence_score)}`}>
                                {prediction.confidence_score.toFixed(0)}%
                                {prediction.confidence_score >= 70 && <span className="text-green-400 ml-1">(HIGH CONFIDENCE)</span>}
                                {prediction.confidence_score >= 50 && prediction.confidence_score < 70 && <span className="text-yellow-400 ml-1">(GOOD CONFIDENCE)</span>}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 italic border-t border-purple-700/30 pt-2 mt-2">
                            💡 The larger the edge, the more our model disagrees with Vegas, creating a potential betting opportunity.
                          </p>
                        </div>

                        {/* Breakdown Factors */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-purple-300">Model Factor Breakdown:</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-gray-900/50 p-2 rounded">
                              <div className="flex justify-between mb-1">
                                <span className="text-gray-400">Base Total:</span>
                                <span className="text-white font-medium">{prediction.breakdown.base_total.toFixed(1)}</span>
                              </div>
                              <p className="text-gray-500 text-[10px]">Foundation from team scoring averages</p>
                            </div>
                            <div className="bg-gray-900/50 p-2 rounded">
                              <div className="flex justify-between mb-1">
                                <span className="text-gray-400">Offensive Matchup:</span>
                                <span className={`font-medium ${
                                  prediction.breakdown.offensive_matchup_adjustment > 0 ? 'text-green-400' : 'text-purple-400'
                                }`}>
                                  {prediction.breakdown.offensive_matchup_adjustment > 0 ? '+' : ''}
                                  {prediction.breakdown.offensive_matchup_adjustment.toFixed(1)}
                                </span>
                              </div>
                              <p className="text-gray-500 text-[10px]">
                                {prediction.breakdown.offensive_matchup_adjustment > 0 
                                  ? 'Strong offenses vs weak defenses' 
                                  : 'Weak offenses or strong defenses'}
                              </p>
                            </div>
                            <div className="bg-gray-900/50 p-2 rounded">
                              <div className="flex justify-between mb-1">
                                <span className="text-gray-400">Defensive Matchup:</span>
                                <span className={`font-medium ${
                                  prediction.breakdown.defensive_matchup_adjustment > 0 ? 'text-green-400' : 'text-purple-400'
                                }`}>
                                  {prediction.breakdown.defensive_matchup_adjustment > 0 ? '+' : ''}
                                  {prediction.breakdown.defensive_matchup_adjustment.toFixed(1)}
                                </span>
                              </div>
                              <p className="text-gray-500 text-[10px]">
                                {prediction.breakdown.defensive_matchup_adjustment > 0 
                                  ? 'Weak defenses allow more scoring' 
                                  : 'Strong defenses limit scoring'}
                              </p>
                            </div>
                            <div className="bg-gray-900/50 p-2 rounded">
                              <div className="flex justify-between mb-1">
                                <span className="text-gray-400">Pace Factor:</span>
                                <span className={`font-medium ${
                                  prediction.breakdown.pace_adjustment > 0 ? 'text-green-400' : 'text-purple-400'
                                }`}>
                                  {prediction.breakdown.pace_adjustment > 0 ? '+' : ''}
                                  {prediction.breakdown.pace_adjustment.toFixed(1)}
                                </span>
                              </div>
                              <p className="text-gray-500 text-[10px]">
                                {prediction.breakdown.pace_adjustment > 0 
                                  ? 'High point differentials = explosive teams' 
                                  : 'Low point differentials = grinding teams'}
                              </p>
                            </div>
                            <div className="bg-gray-900/50 p-2 rounded">
                              <div className="flex justify-between mb-1">
                                <span className="text-gray-400">Competitiveness:</span>
                                <span className={`font-medium ${
                                  prediction.breakdown.competitiveness_adjustment > 0 ? 'text-green-400' : 'text-purple-400'
                                }`}>
                                  {prediction.breakdown.competitiveness_adjustment > 0 ? '+' : ''}
                                  {prediction.breakdown.competitiveness_adjustment.toFixed(1)}
                                </span>
                              </div>
                              <p className="text-gray-500 text-[10px]">
                                {prediction.breakdown.competitiveness_adjustment > 0 
                                  ? 'Mismatch = blowout potential' 
                                  : 'Evenly matched = conservative play'}
                              </p>
                            </div>
                            <div className="bg-gray-900/50 p-2 rounded">
                              <div className="flex justify-between mb-1">
                                <span className="text-gray-400">SRS Adjustment:</span>
                                <span className={`font-medium ${
                                  prediction.breakdown.srs_adjustment > 0 ? 'text-green-400' : 'text-purple-400'
                                }`}>
                                  {prediction.breakdown.srs_adjustment > 0 ? '+' : ''}
                                  {prediction.breakdown.srs_adjustment.toFixed(1)}
                                </span>
                              </div>
                              <p className="text-gray-500 text-[10px]">
                                {prediction.breakdown.srs_adjustment > 0 
                                  ? 'Elite teams = efficient scoring' 
                                  : 'Below-average teams = sloppy play'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Team Statistics Comparison */}
                        {prediction.home_stats && prediction.away_stats && (
                          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-purple-700/30">
                            {/* Home Team */}
                            <div className="space-y-2">
                              <h4 className="font-bold text-purple-300 text-base">{prediction.home_team}</h4>
                              <div className="space-y-2 text-xs">
                                <div className="bg-gray-900/50 p-2 rounded">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-gray-400">Record:</span>
                                    <span className="text-white font-medium">{prediction.home_stats.wins}-{prediction.home_stats.losses}-{prediction.home_stats.ties}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Win %:</span>
                                    <span className="text-white font-medium">{(prediction.home_stats.win_percentage * 100).toFixed(1)}%</span>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-900/50 p-2 rounded">
                                  <div className="font-semibold text-gray-300 mb-1">Scoring</div>
                                  <div className="flex justify-between mb-1">
                                    <span className="text-gray-400">PPG:</span>
                                    <span className="text-white font-medium">{prediction.home_stats.points_per_game.toFixed(1)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">PA/G:</span>
                                    <span className="text-white font-medium">{prediction.home_stats.points_allowed_per_game.toFixed(1)}</span>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-900/50 p-2 rounded">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-gray-400">Off. SRS:</span>
                                    <span className="text-white font-medium">{prediction.home_stats.offensive_srs.toFixed(1)}</span>
                                  </div>
                                  <div className="flex justify-between mb-1">
                                    <span className="text-gray-400">Def. SRS:</span>
                                    <span className="text-white font-medium">{prediction.home_stats.defensive_srs.toFixed(1)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Total SRS:</span>
                                    <span className="text-white font-medium">{prediction.home_stats.srs.toFixed(1)}</span>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-900/50 p-2 rounded">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Point Diff:</span>
                                    <span className={`font-medium ${
                                      prediction.home_stats.point_differential > 0 ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      {prediction.home_stats.point_differential > 0 ? '+' : ''}
                                      {prediction.home_stats.point_differential}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Away Team */}
                            <div className="space-y-2">
                              <h4 className="font-bold text-purple-300 text-base">{prediction.away_team}</h4>
                              <div className="space-y-2 text-xs">
                                <div className="bg-gray-900/50 p-2 rounded">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-gray-400">Record:</span>
                                    <span className="text-white font-medium">{prediction.away_stats.wins}-{prediction.away_stats.losses}-{prediction.away_stats.ties}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Win %:</span>
                                    <span className="text-white font-medium">{(prediction.away_stats.win_percentage * 100).toFixed(1)}%</span>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-900/50 p-2 rounded">
                                  <div className="font-semibold text-gray-300 mb-1">Scoring</div>
                                  <div className="flex justify-between mb-1">
                                    <span className="text-gray-400">PPG:</span>
                                    <span className="text-white font-medium">{prediction.away_stats.points_per_game.toFixed(1)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">PA/G:</span>
                                    <span className="text-white font-medium">{prediction.away_stats.points_allowed_per_game.toFixed(1)}</span>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-900/50 p-2 rounded">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-gray-400">Off. SRS:</span>
                                    <span className="text-white font-medium">{prediction.away_stats.offensive_srs.toFixed(1)}</span>
                                  </div>
                                  <div className="flex justify-between mb-1">
                                    <span className="text-gray-400">Def. SRS:</span>
                                    <span className="text-white font-medium">{prediction.away_stats.defensive_srs.toFixed(1)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Total SRS:</span>
                                    <span className="text-white font-medium">{prediction.away_stats.srs.toFixed(1)}</span>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-900/50 p-2 rounded">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Point Diff:</span>
                                    <span className={`font-medium ${
                                      prediction.away_stats.point_differential > 0 ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      {prediction.away_stats.point_differential > 0 ? '+' : ''}
                                      {prediction.away_stats.point_differential}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Key Insight */}
                        <div className="pt-3 border-t border-purple-700/30">
                          <div className="bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-purple-900/40 p-4 rounded-lg border border-purple-700/50">
                            <h4 className="font-bold text-purple-300 mb-2 flex items-center gap-2">
                              <span className="text-lg">💡</span>
                              <span>Key Insight</span>
                            </h4>
                            <p className="text-xs text-gray-300 leading-relaxed">
                              {prediction.reasoning}
                              {prediction.home_stats && prediction.away_stats && (
                                <>
                                  {' '}The combined scoring averages ({prediction.home_stats.points_per_game.toFixed(1)} PPG + {prediction.away_stats.points_per_game.toFixed(1)} PPG) and defensive ratings (allowing {prediction.home_stats.points_allowed_per_game.toFixed(1)} + {prediction.away_stats.points_allowed_per_game.toFixed(1)} PA/G) create a base total of {prediction.breakdown.base_total.toFixed(1)} points. After applying offensive/defensive matchup adjustments, pace factors, and game competitiveness, the model arrives at {prediction.predicted_total.toFixed(1)} points, creating a{' '}
                                  <span className="text-green-400 font-semibold">{prediction.value_score.toFixed(1)}-point edge</span> over Vegas's {prediction.vegas_total} line.
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Note */}
                        <div className="pt-2 text-xs text-gray-400 italic border-t border-purple-700/30 mt-3">
                          📊 Analysis based on 2025 season data including team scoring averages, SRS ratings, point differentials, and game competitiveness factors.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-900 rounded p-2">
                      <p className="text-gray-400 text-xs mb-1">Model Prediction</p>
                      <p className="text-white font-semibold">{prediction.predicted_total.toFixed(1)} points</p>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <p className="text-gray-400 text-xs mb-1">Vegas Total</p>
                      <p className="text-white font-semibold">{prediction.vegas_total}</p>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <p className="text-gray-400 text-xs mb-1">Difference</p>
                      <p className="text-white font-semibold">
                        {prediction.predicted_total > prediction.vegas_total ? '+' : ''}
                        {(prediction.predicted_total - prediction.vegas_total).toFixed(1)} pts
                      </p>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <p className="text-gray-400 text-xs mb-1">Value Score</p>
                      <p className="text-green-400 font-semibold">{prediction.value_score.toFixed(1)} points</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
              <p className="text-gray-400 text-lg">
                No strong totals betting opportunities found at this time.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                The model requires at least 3 points of disagreement with Vegas and 60% confidence to recommend a bet.
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
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-base font-semibold text-white">Totals Betting Reference</h3>
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
                    <h4 className="font-semibold text-purple-300 mb-1">OVER Bet</h4>
                    <p className="text-gray-400 text-xs">Betting that the combined score will be higher than the Vegas total.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">UNDER Bet</h4>
                    <p className="text-gray-400 text-xs">Betting that the combined score will be lower than the Vegas total.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Base Total</h4>
                    <p className="text-gray-400 text-xs">Foundation prediction from team scoring and defensive averages.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Offensive Matchup</h4>
                    <p className="text-gray-400 text-xs">Strong offense vs weak defense = more points. Adjusted by offensive and defensive SRS.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Defensive Matchup</h4>
                    <p className="text-gray-400 text-xs">Two strong defenses = fewer points. Two weak defenses = more points.</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Pace Factor</h4>
                    <p className="text-gray-400 text-xs">Teams with high point differentials tend to be in high-scoring games.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Competitiveness</h4>
                    <p className="text-gray-400 text-xs">Evenly matched teams play conservatively (UNDER). Mismatches can go OVER.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">SRS Adjustment</h4>
                    <p className="text-gray-400 text-xs">Overall team quality (elite teams = efficient scoring, poor teams = sloppy play).</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Value Score</h4>
                    <p className="text-gray-400 text-xs">Absolute difference between model prediction and Vegas total. Higher = bigger edge.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Confidence Score</h4>
                    <p className="text-gray-400 text-xs">Model's certainty (70%+ = High, 50-69% = Good, below 50% = Moderate).</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <p className="text-xs text-gray-500 italic">
                  💡 <strong>Tip:</strong> The model only recommends totals bets with 3+ points of edge AND 60%+ confidence. 
                  Look for games where the model strongly disagrees with Vegas due to matchup factors or team pace.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

