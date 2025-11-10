'use client';

import { useState, useEffect } from 'react';

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
  created_at: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  predictions: TotalsPrediction[];
  count: number;
  generated_at: string;
}

export function TotalsBetsDisplay() {
  const [predictions, setPredictions] = useState<TotalsPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/best-totals-bets?limit=10');
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setPredictions(data.predictions);
      } else {
        setError(data.message || 'Failed to fetch predictions');
      }
    } catch (err) {
      setError('Error fetching predictions');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generatePredictions = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      // Get current week (you may want to make this dynamic)
      const week = 10;
      const season = 2025;
      
      const response = await fetch(`/api/generate-totals-predictions?week=${week}&season=${season}`);
      const data = await response.json();
      
      if (data.success) {
        // Refresh predictions after generation
        await fetchPredictions();
      } else {
        setError(data.message || 'Failed to generate predictions');
      }
    } catch (err) {
      setError('Error generating predictions');
      console.error('Error:', err);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return 'text-green-600 bg-green-50';
    if (confidence >= 65) return 'text-blue-600 bg-blue-50';
    if (confidence >= 55) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getRecommendationColor = (bet: 'OVER' | 'UNDER') => {
    return bet === 'OVER' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-blue-100 text-blue-800 border-blue-300';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-gray-600">Loading totals predictions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️ {error}</div>
          <button
            onClick={generatePredictions}
            disabled={generating}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? 'Generating...' : '🎯 Generate Predictions'}
          </button>
        </div>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="text-gray-600 mb-4">No totals predictions available</div>
          <button
            onClick={generatePredictions}
            disabled={generating}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? 'Generating...' : '🎯 Generate Predictions'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🎲 Best Over/Under Bets</h2>
          <p className="text-gray-600 text-sm mt-1">AI-powered totals predictions based on advanced analytics</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchPredictions}
            disabled={loading}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
          >
            🔄 Refresh
          </button>
          <button
            onClick={generatePredictions}
            disabled={generating}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? 'Generating...' : '🎯 Regenerate'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {predictions.map((prediction) => (
          <div
            key={prediction.id}
            className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
          >
            {/* Header: Teams and Time */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {prediction.away_team} @ {prediction.home_team}
                </h3>
                <p className="text-sm text-gray-500">{formatDate(prediction.commence_time)}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(prediction.confidence_score)}`}>
                {prediction.confidence_score.toFixed(0)}% Confidence
              </div>
            </div>

            {/* Recommendation Banner */}
            {prediction.recommended_bet && (
              <div className={`border-2 rounded-lg p-4 mb-3 ${getRecommendationColor(prediction.recommended_bet)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">
                      {prediction.recommended_bet} {prediction.vegas_total}
                    </span>
                    <span className="text-sm opacity-75">
                      {prediction.recommended_bet === 'OVER' 
                        ? formatOdds(prediction.over_price)
                        : formatOdds(prediction.under_price)
                      }
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm opacity-75">Edge</div>
                    <div className="text-xl font-bold">{prediction.value_score.toFixed(1)} pts</div>
                  </div>
                </div>
              </div>
            )}

            {/* Prediction Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 bg-gray-50 p-3 rounded">
              <div>
                <div className="text-xs text-gray-500">Model Total</div>
                <div className="text-lg font-bold text-gray-900">{prediction.predicted_total.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Vegas Total</div>
                <div className="text-lg font-bold text-gray-900">{prediction.vegas_total}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Difference</div>
                <div className={`text-lg font-bold ${prediction.predicted_total > prediction.vegas_total ? 'text-red-600' : 'text-blue-600'}`}>
                  {prediction.predicted_total > prediction.vegas_total ? '+' : ''}
                  {(prediction.predicted_total - prediction.vegas_total).toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Value Score</div>
                <div className="text-lg font-bold text-green-600">{prediction.value_score.toFixed(1)}</div>
              </div>
            </div>

            {/* Reasoning */}
            <div className="mb-3">
              <div className="text-sm text-gray-700 leading-relaxed">
                {prediction.reasoning}
              </div>
            </div>

            {/* Breakdown - Collapsible */}
            <details className="text-sm">
              <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                📊 View Detailed Breakdown
              </summary>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 bg-blue-50 p-3 rounded">
                <div>
                  <div className="text-xs text-gray-600">Base Total</div>
                  <div className="font-semibold">{prediction.breakdown.base_total.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Offensive Matchup</div>
                  <div className={`font-semibold ${prediction.breakdown.offensive_matchup_adjustment > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {prediction.breakdown.offensive_matchup_adjustment > 0 ? '+' : ''}
                    {prediction.breakdown.offensive_matchup_adjustment.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Defensive Matchup</div>
                  <div className={`font-semibold ${prediction.breakdown.defensive_matchup_adjustment > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {prediction.breakdown.defensive_matchup_adjustment > 0 ? '+' : ''}
                    {prediction.breakdown.defensive_matchup_adjustment.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Pace Adjustment</div>
                  <div className={`font-semibold ${prediction.breakdown.pace_adjustment > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {prediction.breakdown.pace_adjustment > 0 ? '+' : ''}
                    {prediction.breakdown.pace_adjustment.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Competitiveness</div>
                  <div className={`font-semibold ${prediction.breakdown.competitiveness_adjustment > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {prediction.breakdown.competitiveness_adjustment > 0 ? '+' : ''}
                    {prediction.breakdown.competitiveness_adjustment.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">SRS Adjustment</div>
                  <div className={`font-semibold ${prediction.breakdown.srs_adjustment > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {prediction.breakdown.srs_adjustment > 0 ? '+' : ''}
                    {prediction.breakdown.srs_adjustment.toFixed(1)}
                  </div>
                </div>
              </div>
            </details>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Value Score:</strong> Absolute difference between model prediction and Vegas line (higher = better edge)</p>
          <p><strong>Confidence:</strong> Model certainty based on data quality, sample size, and team consistency</p>
          <p><strong>Breakdown:</strong> Shows how each factor adjusted the base total (+ increases, - decreases)</p>
        </div>
      </div>
    </div>
  );
}

