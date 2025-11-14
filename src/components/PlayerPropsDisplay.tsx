'use client';

import { useState, useEffect } from 'react';
import { usePlayerHeadshot } from '@/hooks/usePlayerHeadshot';
import { getTeamLogo } from '@/lib/espnTeamLogos';

interface PropPrediction {
  player_name: string;
  team: string;
  opponent: string;
  position: string;
  prop_market: string;
  prop_line: number;
  predicted_value: number;
  recommended_bet: 'OVER' | 'UNDER';
  confidence_score: number;
  value_score: number;
  odds: number;
  reasoning: string;
  bet_strength: 'elite' | 'strong' | 'good' | 'value';
  display_line: string;
  display_edge: string;
  breakdown: {
    player_stats_score: number;
    defensive_matchup_score: number;
    game_environment_score: number;
    season_avg: number;
    matchup_adjustment: number;
    game_script_adjustment: number;
  };
  quality_score: number;
  week_number: number;
}

// PropCard component with ESPN headshot
function PropCard({ 
  prop, 
  isExpanded, 
  onToggleExpand,
  index
}: { 
  prop: PropPrediction;
  isExpanded: boolean;
  onToggleExpand: () => void;
  index: number;
}) {
  const { headshot } = usePlayerHeadshot(prop.player_name, prop.position);
  const propId = `${prop.player_name}-${prop.prop_market}`;

  const getBetStrengthColor = (strength: string) => {
    switch (strength) {
      case 'elite': return 'bg-purple-600';
      case 'strong': return 'bg-blue-600';
      case 'good': return 'bg-green-600';
      case 'value': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return 'text-green-400';
    if (confidence >= 65) return 'text-blue-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getBetStrengthIcon = (strength: string) => {
    switch (strength) {
      case 'elite': return '🟣';
      case 'strong': return '🔵';
      case 'good': return '🟢';
      case 'value': return '🟡';
      default: return '⚪';
    }
  };

  const formatOdds = (odds: number) => odds > 0 ? `+${odds}` : odds.toString();

  const formatPropMarket = (market: string) => {
    const marketMap: Record<string, string> = {
      'Passing Yards': 'Pass Yds', 'Passing TDs': 'Pass TDs',
      'Pass Attempts': 'Pass Att', 'Completions': 'Comp',
      'Rushing Yards': 'Rush Yds', 'Rush Attempts': 'Rush Att',
      'Receiving Yards': 'Rec Yds', 'Receptions': 'Rec',
      'Anytime TD': 'TD',
    };
    return marketMap[market] || market;
  };

  const getPositionColor = (position: string) => {
    const positionColors: Record<string, { bg: string; text: string; border: string }> = {
      'QB': { bg: 'bg-blue-900/40', text: 'text-blue-300', border: 'border-blue-500' },
      'RB': { bg: 'bg-green-900/40', text: 'text-green-300', border: 'border-green-500' },
      'WR': { bg: 'bg-purple-900/40', text: 'text-purple-300', border: 'border-purple-500' },
      'TE': { bg: 'bg-orange-900/40', text: 'text-orange-300', border: 'border-orange-500' },
    };
    return positionColors[position] || { bg: 'bg-gray-700', text: 'text-gray-300', border: 'border-gray-600' };
  };

  const formatAnalysisLine = (line: string, sectionColor: string) => {
    // Color mapping for Tailwind classes
    const colorClasses = {
      blue: {
        bullet: 'text-blue-400',
        label: 'text-blue-300',
      },
      purple: {
        bullet: 'text-purple-400',
        label: 'text-purple-300',
      },
      green: {
        bullet: 'text-green-400',
        label: 'text-green-300',
      },
    };
    
    const colors = colorClasses[sectionColor as keyof typeof colorClasses] || colorClasses.blue;

    // List of labels to highlight
    const labels = [
      'Vegas Lines:',
      'Expected Game Flow:',
      'Key Injuries:',
      'Net Injury Impact:',
      'Key Defensive Factors:',
      'Matchup Impact:',
      'Consistency Analysis:',
      'Performance vs Line:',
      'Season Performance',
      'Defensive Ranking:',
      'Matchup Adjustment:',
      'Game Script Adjustment:',
      'Injury Adjustment:',
      'Final Projection Calculation:',
      'Expected Prediction:',
    ];

    // Check if line starts with any label
    for (const label of labels) {
      if (line.startsWith(label)) {
        const restOfLine = line.substring(label.length).trim();
        return (
          <div className="flex items-start gap-2">
            <span className={colors.bullet}>•</span>
            <span className="flex-1">
              <span className={`font-bold ${colors.label} text-sm`}>{label}</span>
              {restOfLine && <span className="text-gray-300"> {restOfLine}</span>}
            </span>
          </div>
        );
      }
    }

    // Check if line contains a label (for labels in the middle of text)
    let formattedLine = line;
    labels.forEach(label => {
      const regex = new RegExp(`(${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      formattedLine = formattedLine.replace(regex, (match) => {
        return `**${match}**`;
      });
    });

    // Split by ** to handle bold formatting
    if (formattedLine.includes('**')) {
      const parts = formattedLine.split('**');
      return (
        <div className="flex items-start gap-2">
          <span className={colors.bullet}>•</span>
          <span className="flex-1">
            {parts.map((part, idx) => {
              if (idx % 2 === 1) {
                // This is a label to bold
                return <span key={idx} className={`font-bold ${colors.label} text-sm`}>{part}</span>;
              }
              return <span key={idx} className="text-gray-300">{part}</span>;
            })}
          </span>
        </div>
      );
    }

    // Regular line
    return (
      <div className="flex items-start gap-2">
        <span className={colors.bullet}>•</span>
        <span className="flex-1 text-gray-300">{line}</span>
      </div>
    );
  };

  const getRecommendationColor = () => {
    if (prop.confidence_score >= 75) return { bg: 'bg-green-900/20', border: 'border-green-700', text: 'text-green-400' };
    if (prop.confidence_score >= 70) return { bg: 'bg-blue-900/20', border: 'border-blue-700', text: 'text-blue-400' };
    if (prop.confidence_score >= 65) return { bg: 'bg-purple-900/20', border: 'border-purple-700', text: 'text-purple-400' };
    return { bg: 'bg-yellow-900/20', border: 'border-yellow-700', text: 'text-yellow-400' };
  };

  const colors = getRecommendationColor();

  return (
    <div className={`bg-[#1a1f2e] rounded-lg border-2 transition-all overflow-hidden ${
      index === 0 
        ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' 
        : 'border-blue-600 hover:border-blue-500'
    }`}>
      {/* Best Bet of the Week Banner */}
      {index === 0 && (
        <div className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 text-gray-900 font-black text-sm px-4 py-2 text-center uppercase tracking-wider shadow-lg">
          ⭐ Player Prop of the Week! ⭐
        </div>
      )}
      
      <div className="p-6">
        {/* Header with Headshot and Matchup */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {/* Player with Headshot */}
            <div className="flex items-center gap-4 mb-3">
              <img 
                src={headshot}
                alt={prop.player_name}
                className="w-24 h-24 rounded-full border-4 border-gray-600 object-cover bg-[#0f1419] shadow-xl"
              />
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {prop.player_name}
                </h3>
                <div className="flex items-center gap-3">
                  {(() => {
                    const posColors = getPositionColor(prop.position);
                    return (
                      <span className={`px-3 py-1 ${posColors.bg} ${posColors.text} border ${posColors.border} rounded-full text-sm font-bold`}>
                        {prop.position}
                      </span>
                    );
                  })()}
                  {/* Team Matchup with Logos */}
                  <div className="flex items-center gap-2 text-base text-gray-400">
                    <img src={getTeamLogo(prop.team)} alt={prop.team} className="w-6 h-6 object-contain" />
                    <span className="font-medium">{prop.team}</span>
                    <span className="text-gray-600">vs</span>
                    <span className="font-medium">{prop.opponent}</span>
                    <img src={getTeamLogo(prop.opponent)} alt={prop.opponent} className="w-6 h-6 object-contain" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Confidence Ring */}
          <div className="flex flex-col items-center gap-1">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90">
                {/* Background circle */}
                <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="7" fill="none" className="text-gray-700" />
                {/* Progress circle */}
                <circle
                  cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="7" fill="none"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - prop.confidence_score / 100)}`}
                  className={prop.confidence_score >= 75 ? 'text-green-400' : 
                            prop.confidence_score >= 70 ? 'text-blue-400' : 
                            prop.confidence_score >= 65 ? 'text-purple-400' : 'text-yellow-400'}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-bold ${getConfidenceColor(prop.confidence_score)}`}>
                  {prop.confidence_score.toFixed(0)}
                </span>
              </div>
            </div>
            <span className="text-xs text-gray-400 font-semibold">Confidence</span>
          </div>
        </div>

        {/* Recommended Bet - Colorful Box */}
        <div className={`border rounded-lg p-4 mb-3 ${colors.bg} ${colors.border}`}>
          <div className="mb-2 flex items-center gap-2">
            <span className={`text-sm font-semibold uppercase ${colors.text}`}>
              {prop.confidence_score >= 75 ? '🔥 Top Pick' : 
               prop.confidence_score >= 70 ? '⭐ Strong Pick' :
               prop.confidence_score >= 65 ? '💎 Good Pick' : '🌙 Sleeper Pick'} - {formatPropMarket(prop.prop_market)}
            </span>
          </div>
          
          <p className="text-2xl font-bold text-white mb-3">
            {prop.recommended_bet} {prop.prop_line} {formatPropMarket(prop.prop_market)}
          </p>
          
          {/* Quick Summary */}
          <p className="text-sm text-gray-300 mb-3">
            Model predicts <span className="text-white font-semibold">{prop.predicted_value.toFixed(1)}</span> vs line of <span className="text-white font-semibold">{prop.prop_line}</span>, giving us a <span className={`font-bold ${prop.value_score > 0 ? 'text-green-400' : 'text-red-400'}`}>{Math.abs(prop.value_score).toFixed(1)}-unit edge</span>. <span className="text-blue-400 font-semibold">{prop.player_name}</span> averaging <span className="text-blue-400 font-semibold">{prop.breakdown.season_avg.toFixed(1)}</span> per game with {prop.confidence_score.toFixed(0)}% confidence.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="bg-gray-900/40 rounded p-2">
              <div className="text-xs text-gray-500">Season Avg</div>
              <div className="text-base font-bold text-blue-400">{prop.breakdown.season_avg.toFixed(1)}</div>
            </div>
            <div className="bg-gray-900/40 rounded p-2">
              <div className="text-xs text-gray-500">Edge</div>
              <div className={`text-base font-bold ${prop.value_score > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {prop.value_score >= 0 ? '+' : ''}{prop.value_score.toFixed(1)}
              </div>
            </div>
            <div className="bg-gray-900/40 rounded p-2">
              <div className="text-xs text-gray-500">Odds</div>
              <div className="text-base font-bold text-white">{formatOdds(prop.odds)}</div>
            </div>
            <div className="bg-gray-900/40 rounded p-2">
              <div className="text-xs text-gray-500">Quality</div>
              <div className="text-base font-bold text-purple-400">{prop.quality_score?.toFixed(0) || 'N/A'}</div>
            </div>
          </div>

          {/* Expand Button */}
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            {isExpanded ? (
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
        </div>

        {/* Expanded Detailed Analysis */}
        {isExpanded && (
          <div className={`mt-4 pt-4 border-t ${colors.border}/50 space-y-4 text-sm`}>
            {/* Betting Breakdown Box */}
            <div className="space-y-2 bg-gray-900/30 p-4 rounded border border-blue-700/30">
              <h4 className="font-bold text-blue-300 mb-3">Betting Breakdown:</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-semibold min-w-[140px]">Model Predicts:</span>
                  <span className="text-white">{prop.predicted_value.toFixed(1)} {formatPropMarket(prop.prop_market).toLowerCase()}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-semibold min-w-[140px]">Prop Line:</span>
                  <span className="text-white">{prop.prop_line} <span className="text-gray-500 text-xs">(betting line)</span></span>
                </div>
                <div className="flex items-start gap-2 bg-green-900/20 -mx-2 px-2 py-1.5 rounded">
                  <span className="text-green-400 font-semibold min-w-[140px]">Betting Edge:</span>
                  <span className="text-green-300">
                    {Math.abs(prop.value_score).toFixed(1)} units
                    <span className="text-green-500 text-xs ml-1">(difference between prediction and line)</span>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-semibold min-w-[140px]">Season Average:</span>
                  <span className="text-white">{prop.breakdown.season_avg.toFixed(1)} per game</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 italic border-t border-blue-700/30 pt-2 mt-2">
                💡 The larger the edge, the more our model disagrees with the betting line, creating value.
              </p>
            </div>

            {/* Model Breakdown - Visual Progress Bars */}
            <div className="bg-gray-900/30 p-4 rounded border border-purple-700/30 space-y-3">
              <h4 className="font-bold text-purple-300 mb-3">Model Breakdown (35/55/10):</h4>
              
              {/* Defensive Matchup - 55% (MOST IMPORTANT) */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-purple-400 font-semibold">🛡️ Defensive Matchup (55%)</span>
                  <span className="text-gray-400">{prop.breakdown.defensive_matchup_score.toFixed(0)}/100</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-400 h-3 rounded-full transition-all shadow-lg shadow-purple-500/30" 
                       style={{ width: `${prop.breakdown.defensive_matchup_score}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Matchup adjustment: {prop.breakdown.matchup_adjustment >= 0 ? '+' : ''}{prop.breakdown.matchup_adjustment.toFixed(1)} units
                </p>
              </div>
              
              {/* Player Stats - 35% */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-blue-400 font-semibold">👤 Player Stats (35%)</span>
                  <span className="text-gray-400">{prop.breakdown.player_stats_score.toFixed(0)}/100</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-2.5 rounded-full transition-all shadow-lg shadow-blue-500/30" 
                       style={{ width: `${prop.breakdown.player_stats_score}%` }}></div>
                </div>
              </div>
              
              {/* Game Environment - 10% */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-green-400 font-semibold">🎮 Game Environment (10%)</span>
                  <span className="text-gray-400">{prop.breakdown.game_environment_score.toFixed(0)}/100</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all shadow-lg shadow-green-500/30" 
                       style={{ width: `${prop.breakdown.game_environment_score}%` }}></div>
                </div>
              </div>
            </div>

            {/* Complete Analysis - Parsed into Sections */}
            <div className="space-y-4">
              <h4 className="font-bold text-white text-base mb-2">📋 Complete Analysis:</h4>
              
              {/* Parse reasoning into sections */}
              {(() => {
                const reasoning = prop.reasoning || '';
                
                // Extract Player Stats section (handle both emoji and --- format)
                const playerStatsMatch = reasoning.match(/(?:📊 PLAYER STATS|--- Player Stats)[^\n]*\n([\s\S]*?)(?=🛡️|🎮|📈|💰|--- Defensive|--- Game|$)/i);
                const playerStatsContent = playerStatsMatch ? playerStatsMatch[1].trim() : '';
                
                // Extract Defensive Matchup section
                const defenseMatch = reasoning.match(/(?:🛡️ DEFENSIVE MATCHUP|--- Defensive Matchup)[^\n]*\n([\s\S]*?)(?=🎮|📈|💰|--- Game|$)/i);
                const defenseContent = defenseMatch ? defenseMatch[1].trim() : '';
                
                // Extract Game Environment section
                const gameEnvMatch = reasoning.match(/(?:🎮 GAME ENVIRONMENT|--- Game Environment)[^\n]*\n([\s\S]*?)(?=📈|💰|$)/i);
                const gameEnvContent = gameEnvMatch ? gameEnvMatch[1].trim() : '';
                
                // Extract Final Prediction
                const finalPredMatch = reasoning.match(/📈 FINAL PREDICTION[^\n]*\n([\s\S]*?)(?=💰|$)/);
                const finalPredContent = finalPredMatch ? finalPredMatch[1].trim() : '';
                
                // Extract Why This Will Hit section
                const whyMatch = reasoning.match(/💰 WHY[^\n]*\n([\s\S]*?)$/);
                const whyContent = whyMatch ? whyMatch[1].trim() : '';
                
                return (
                  <>
                    {/* Player Stats Section (35%) */}
                    {playerStatsContent && (
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-blue-700/50">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">📊</span>
                          <h5 className="font-bold text-blue-300 text-sm">Player Stats (35% Weight)</h5>
                          <span className="ml-auto text-xs text-gray-400 bg-blue-900/30 px-2 py-1 rounded">
                            {prop.breakdown.player_stats_score.toFixed(0)}/100
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          {playerStatsContent.split('\n').filter(line => line.trim()).map((line, idx) => (
                            <div key={idx}>
                              {formatAnalysisLine(line.trim(), 'blue')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Defensive Matchup Section (55%) */}
                    {defenseContent && (
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-purple-700/50">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">🛡️</span>
                          <h5 className="font-bold text-purple-300 text-sm">Defensive Matchup (55% Weight) ⭐ KEY FACTOR</h5>
                          <span className="ml-auto text-xs text-gray-400 bg-purple-900/30 px-2 py-1 rounded">
                            {prop.breakdown.defensive_matchup_score.toFixed(0)}/100
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          {defenseContent.split('\n').filter(line => line.trim()).map((line, idx) => (
                            <div key={idx}>
                              {formatAnalysisLine(line.trim(), 'purple')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Game Environment Section (10%) */}
                    {gameEnvContent && (
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-green-700/50">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">🎮</span>
                          <h5 className="font-bold text-green-300 text-sm">Game Environment (10% Weight)</h5>
                          <span className="ml-auto text-xs text-gray-400 bg-green-900/30 px-2 py-1 rounded">
                            {prop.breakdown.game_environment_score.toFixed(0)}/100
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          {gameEnvContent.split('\n').filter(line => line.trim()).map((line, idx) => (
                            <div key={idx}>
                              {formatAnalysisLine(line.trim(), 'green')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Final Prediction Section */}
                    {finalPredContent && (
                      <div className="bg-gradient-to-r from-yellow-900/40 to-amber-900/40 p-4 rounded-lg border-2 border-yellow-500/50">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">📈</span>
                          <h5 className="font-bold text-yellow-300 text-sm">Final Prediction</h5>
                        </div>
                        <div className="space-y-2 text-xs">
                          {finalPredContent.split('\n').filter(line => line.trim()).map((line, idx) => (
                            <div key={idx} className={`flex items-start gap-2 ${
                              line.includes('Formula:') || line.includes('Predicted') ? 'text-yellow-200 font-semibold' : 'text-gray-300'
                            }`}>
                              <span className="text-yellow-400">•</span>
                              <span className="flex-1">{line.trim()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Why This Will Hit Section */}
                    {whyContent && (
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">💰</span>
                          <h5 className="font-bold text-white text-sm">Why This Will Hit</h5>
                        </div>
                        <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                          {whyContent}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PlayerPropsDisplay() {
  const [props, setProps] = useState<PropPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const limit = 10;
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [marketFilter, setMarketFilter] = useState<string>('ALL');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

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

  const fetchProps = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `/api/best-prop-bets?limit=${limit}&week=11&season=2025`;
      if (positionFilter !== 'ALL') url += `&position=${positionFilter}`;
      if (marketFilter !== 'ALL') url += `&market=${marketFilter}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setProps(data.predictions || []);
        
        if ((!data.predictions || data.predictions.length === 0) && !generating) {
          console.log('No predictions found, auto-generating...');
          await generatePredictions();
        }
      } else {
        setError(data.message || 'Failed to fetch prop predictions');
      }
    } catch (err) {
      setError('Error fetching prop predictions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generatePredictions = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      console.log('Generating player prop predictions for Week 11...');
      
      const response = await fetch('/api/generate-prop-predictions?week=11&season=2025', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`Generated ${data.saved} player prop recommendations from ${data.total} props!`);
        const fetchUrl = `/api/best-prop-bets?limit=${limit}&week=11&season=2025${
          positionFilter !== 'ALL' ? `&position=${positionFilter}` : ''
        }${
          marketFilter !== 'ALL' ? `&market=${marketFilter}` : ''
        }`;
        
        const fetchResponse = await fetch(fetchUrl);
        const fetchData = await fetchResponse.json();
        
        if (fetchData.success) {
          setProps(fetchData.predictions || []);
        }
      } else {
        setError(data.message || 'Failed to generate predictions');
      }
    } catch (err) {
      setError('Error generating predictions');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchProps();
  }, [positionFilter, marketFilter]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-[#1a1f2e] rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🎯</span>
          <h2 className="text-2xl font-bold">Player Props Predictions</h2>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">
          AI-powered player prop analysis using a 3-pillar system: <span className="text-purple-400 font-semibold">Defensive Matchup (55%)</span>, <span className="text-blue-400 font-semibold">Player Stats (35%)</span>, and <span className="text-green-400 font-semibold">Game Environment (10%)</span>. Model prioritizes matchups - great matchups beat great players in tough spots.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-[#1a1f2e] rounded-lg p-4 border border-gray-700">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Position:</label>
            <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}
              className="px-3 py-2 bg-[#0f1419] border border-gray-600 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none">
              <option value="ALL">All</option>
              <option value="QB">QB</option>
              <option value="RB">RB</option>
              <option value="WR">WR</option>
              <option value="TE">TE</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Market:</label>
            <select value={marketFilter} onChange={(e) => setMarketFilter(e.target.value)}
              className="px-3 py-2 bg-[#0f1419] border border-gray-600 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none">
              <option value="ALL">All Markets</option>
              <option value="player_pass_yds">Pass Yds</option>
              <option value="player_rush_yds">Rush Yds</option>
              <option value="player_reception_yds">Rec Yds</option>
              <option value="player_receptions">Receptions</option>
              <option value="player_pass_tds">Pass TDs</option>
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500">Showing Top 10 Props</span>
          </div>
          {generating && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
              <span>Generating predictions...</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400">
          <p className="font-semibold">⚠️ {error}</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {generating && (
        <div className="bg-[#1a1f2e] border border-yellow-500/30 rounded-lg p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
            <p className="text-yellow-400 text-lg font-semibold">🎯 Generating Player Prop Predictions</p>
            <p className="text-gray-400 text-sm">Analyzing player stats, defensive matchups, and game environment...</p>
          </div>
        </div>
      )}

      {!loading && !generating && props.length === 0 && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400 text-lg font-semibold mb-2">📊 No prop predictions available</p>
          <p className="text-gray-500 text-sm">Predictions will auto-generate when prop data is available</p>
        </div>
      )}

      {!loading && props.length > 0 && (
        <div className="space-y-4">
          {props.map((prop, index) => {
            const propId = `${prop.player_name}-${prop.prop_market}-${index}`;
            const isExpanded = expandedCards.has(propId);
            return (
              <PropCard 
                key={propId}
                prop={prop}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleExpanded(propId)}
                index={index}
              />
            );
          })}
        </div>
      )}

      {/* Pick Types Guide */}
      {!loading && props.length > 0 && (
        <div className="bg-[#1a1f2e] rounded-lg p-6 border border-gray-700">
          <h3 className="font-bold text-white mb-4">🎯 Pick Categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🔥</span>
                <span className="text-green-400 font-bold">Top Picks (75%+)</span>
              </div>
              <p className="text-xs text-gray-400">Highest confidence, elite edges. Both stats and matchup aligned.</p>
            </div>
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">⭐</span>
                <span className="text-blue-400 font-bold">Strong Picks (70-74%)</span>
              </div>
              <p className="text-xs text-gray-400">High confidence with good edges. Reliable value plays.</p>
            </div>
            <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">💎</span>
                <span className="text-purple-400 font-bold">Good Picks (65-69%)</span>
              </div>
              <p className="text-xs text-gray-400">Solid confidence with decent edges. Good value.</p>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🌙</span>
                <span className="text-yellow-400 font-bold">Sleepers (60-64%)</span>
              </div>
              <p className="text-xs text-gray-400">Higher risk, higher reward. Matchup exploits and deep value.</p>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-4 space-y-2 text-sm">
            <p className="text-gray-400">
              <strong className="text-white">Model Philosophy:</strong> Matchup-first approach (55% weight on defensive matchup) favors exploiting weak defenses over betting on big-name players in tough spots.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-12 h-3 bg-gradient-to-r from-purple-500 to-purple-400 rounded-full shadow-lg shadow-purple-500/30"></div>
                <span className="text-gray-400">Matchup (55%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-3 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full shadow-lg shadow-blue-500/30"></div>
                <span className="text-gray-400">Player (35%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-3 bg-gradient-to-r from-green-500 to-green-400 rounded-full shadow-lg shadow-green-500/30"></div>
                <span className="text-gray-400">Environment (10%)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
