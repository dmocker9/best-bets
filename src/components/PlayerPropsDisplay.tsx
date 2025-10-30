'use client';

import { useState, useEffect } from 'react';

interface PlayerProp {
  prop_id: string;
  player_name: string;
  team: string;
  opponent: string;
  game_id: string;
  commence_time: string;
  prop_type: 'passing_yards' | 'rushing_yards' | 'receiving_yards' | 'touchdowns' | 'receptions';
  line: number;
  over_odds: string;
  under_odds: string;
  recommended_bet: 'over' | 'under' | null;
  predicted_value: number;
  confidence_score: number;
  value_score: number;
  reasoning: string;
  player_avg: number;
  recent_form: string;
}

interface PlayerPropsResponse {
  success: boolean;
  message: string;
  props: PlayerProp[];
  analyzed: number;
  recommendations: number;
  generated_at: string;
}

export function PlayerPropsDisplay() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PlayerPropsResponse | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showGlossary, setShowGlossary] = useState(false);

  const fetchPlayerProps = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Placeholder - will be replaced with actual API call
      // const response = await fetch('/api/player-props?limit=5');
      // const data = await response.json();
      
      // For now, return a placeholder response
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setResult({
        success: true,
        message: 'Player props analysis coming soon',
        props: [],
        analyzed: 0,
        recommendations: 0,
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        props: [],
        analyzed: 0,
        recommendations: 0,
        generated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  // Automatically fetch player props on component mount
  useEffect(() => {
    fetchPlayerProps();
  }, []);

  const toggleExpanded = (propId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propId)) {
        newSet.delete(propId);
      } else {
        newSet.add(propId);
      }
      return newSet;
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getPropTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      passing_yards: 'Passing Yards',
      rushing_yards: 'Rushing Yards',
      receiving_yards: 'Receiving Yards',
      touchdowns: 'Touchdowns',
      receptions: 'Receptions'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">🎯 Best Player Props NFL Week 9</h2>
        {loading && (
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Loading player props...</span>
          </div>
        )}
      </div>

      {/* Decorative Banner */}
      <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 via-blue-500 to-purple-500 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={`p-4 rounded-lg border ${
            result.success ? 'bg-purple-900/20 border-purple-700' : 'bg-red-900/20 border-red-700'
          }`}>
            <p className="text-sm text-gray-300">
              {result.message} • Analyzed {result.analyzed} props • Generated {new Date(result.generated_at).toLocaleString()}
            </p>
          </div>

          {/* Player Props */}
          {result.props.length > 0 ? (
            <div className="space-y-3">
              {result.props.map((prop, index) => (
                <div
                  key={prop.prop_id}
                  className={`bg-gray-800 rounded-lg p-4 border transition-colors ${
                    index === 0 
                      ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' 
                      : 'border-gray-700 hover:border-purple-500'
                  }`}
                >
                  {/* Best Prop of the Week Badge - Only for #1 */}
                  {index === 0 && (
                    <div className="mb-3 -mt-1 -mx-1">
                      <div className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 text-gray-900 font-black text-sm px-4 py-2 rounded-t-lg text-center uppercase tracking-wider shadow-lg">
                        ⭐ Best Player Prop of the Week! ⭐
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
                          <p className="text-xl font-semibold text-white">
                            {prop.player_name}
                          </p>
                          <p className="text-sm text-gray-400">
                            {prop.team} vs {prop.opponent}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {getPropTypeLabel(prop.prop_type)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Confidence Ring */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative w-14 h-14">
                        <svg className="w-14 h-14 transform -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="none"
                            className="text-gray-700"
                          />
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 24}`}
                            strokeDashoffset={`${2 * Math.PI * 24 * (1 - prop.confidence_score / 100)}`}
                            className={prop.confidence_score >= 80 ? 'text-green-400' : 
                                      prop.confidence_score >= 65 ? 'text-yellow-400' : 'text-orange-400'}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-lg font-bold ${getConfidenceColor(prop.confidence_score)}`}>
                            {prop.confidence_score.toFixed(0)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">Confidence</span>
                    </div>
                  </div>

                  {/* Recommended Bet */}
                  <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3 mb-3">
                    <div className="mb-2">
                      <span className="text-sm font-semibold text-purple-400 uppercase">
                        Recommended Bet
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white mb-2">
                      {prop.recommended_bet?.toUpperCase()} {prop.line} {getPropTypeLabel(prop.prop_type)}
                    </p>
                    
                    <p className="text-sm text-gray-300 mb-3">
                      Our model predicts {prop.player_name} will record {prop.predicted_value.toFixed(1)} {getPropTypeLabel(prop.prop_type).toLowerCase()} 
                      with {prop.confidence_score.toFixed(0)}% confidence, giving us value on the {prop.recommended_bet}.
                    </p>
                    
                    {/* Expandable Detailed Analysis */}
                    <button
                      onClick={() => toggleExpanded(prop.prop_id)}
                      className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                    >
                      {expandedCards.has(prop.prop_id) ? (
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

                    {/* Detailed Analysis - Expanded */}
                    {expandedCards.has(prop.prop_id) && (
                      <div className="mt-4 pt-4 border-t border-purple-700/50 space-y-4 text-sm">
                        {/* Player Statistics */}
                        <div className="space-y-2 bg-gray-900/30 p-3 rounded border border-purple-700/30">
                          <h4 className="font-bold text-purple-300 mb-3">Player Analysis:</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-start gap-2">
                              <span className="text-purple-400 font-semibold min-w-[140px]">Season Average:</span>
                              <span className="text-white">{prop.player_avg.toFixed(1)}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-gray-400 font-semibold min-w-[140px]">Line:</span>
                              <span className="text-white">{prop.line}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-green-400 font-semibold min-w-[140px]">Predicted Value:</span>
                              <span className="text-white">{prop.predicted_value.toFixed(1)}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-yellow-400 font-semibold min-w-[140px]">Recent Form:</span>
                              <span className="text-white">{prop.recent_form}</span>
                            </div>
                          </div>
                        </div>

                        {/* Odds */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-900/50 p-3 rounded">
                            <p className="text-gray-400 text-xs mb-1">Over Odds</p>
                            <p className="text-white font-semibold">{prop.over_odds}</p>
                          </div>
                          <div className="bg-gray-900/50 p-3 rounded">
                            <p className="text-gray-400 text-xs mb-1">Under Odds</p>
                            <p className="text-white font-semibold">{prop.under_odds}</p>
                          </div>
                        </div>

                        {/* Reasoning */}
                        <div className="pt-3 border-t border-purple-700/30">
                          <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-indigo-900/40 p-4 rounded-lg border border-indigo-700/50">
                            <h4 className="font-bold text-indigo-300 mb-2 flex items-center gap-2">
                              <span className="text-lg">💡</span>
                              <span>Why This Bet</span>
                            </h4>
                            <p className="text-xs text-gray-300 leading-relaxed">
                              {prop.reasoning}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-gray-900 rounded p-2">
                      <p className="text-gray-400 text-xs mb-1">Line</p>
                      <p className="text-white font-semibold">{prop.line}</p>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <p className="text-gray-400 text-xs mb-1">Prediction</p>
                      <p className="text-white font-semibold">{prop.predicted_value.toFixed(1)}</p>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <p className="text-gray-400 text-xs mb-1">Avg</p>
                      <p className="text-white font-semibold">{prop.player_avg.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-gray-300 text-lg font-semibold mb-2">
                Player Props Analysis Coming Soon
              </p>
              <p className="text-gray-500 text-sm">
                We're working on adding AI-powered player prop recommendations. Check back soon!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Player Props Glossary */}
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
              <h3 className="text-base font-semibold text-white">Player Props Guide</h3>
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
                    <h4 className="font-semibold text-purple-300 mb-1">Passing Yards</h4>
                    <p className="text-gray-400 text-xs">Total yards a quarterback throws for in a game.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Rushing Yards</h4>
                    <p className="text-gray-400 text-xs">Total yards a player runs with the ball in a game.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Receiving Yards</h4>
                    <p className="text-gray-400 text-xs">Total yards gained by a receiver after catching passes.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Over/Under</h4>
                    <p className="text-gray-400 text-xs">Bet whether a player will go over or under the set line.</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Receptions</h4>
                    <p className="text-gray-400 text-xs">Number of times a receiver catches the ball.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Touchdowns</h4>
                    <p className="text-gray-400 text-xs">Total touchdowns (rushing, receiving, or passing) by a player.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Recent Form</h4>
                    <p className="text-gray-400 text-xs">Player's performance in their last 3-5 games.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Confidence Score</h4>
                    <p className="text-gray-400 text-xs">Our model's certainty in the prediction (75%+ = Strong, 60-74% = Good).</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <p className="text-xs text-gray-500 italic">
                  💡 <strong>Tip:</strong> Player props often offer better value than traditional bets. 
                  Our model analyzes matchups, recent performance, and opponent defenses to find edges.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

