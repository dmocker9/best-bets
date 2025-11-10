'use client';

import { useState, useEffect } from 'react';
import { BestBetsDisplay } from '@/components/BestBetsDisplay';
import { PlayerPropsDisplay } from '@/components/PlayerPropsDisplay';
import { GameResultsDisplay } from '@/components/GameResultsDisplay';
import { TotalsDisplay } from '@/components/TotalsDisplay';

type TabType = 'spreads' | 'totals' | 'player-props' | 'results';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('spreads');
  const [record, setRecord] = useState({ wins: 0, losses: 0, pushes: 0 });
  const [betOfWeekRecord, setBetOfWeekRecord] = useState({ wins: 0, losses: 0, pushes: 0 });

  // Fetch overall record for header (recommended bets only)
  const fetchRecord = async () => {
    try {
      const response = await fetch('/api/game-results?season=2025&calculateRecord=true');
      const data = await response.json();
      if (data.success && data.record) {
        setRecord(data.record);
      }
    } catch (error) {
      console.error('Error fetching record:', error);
    }
  };

  // Fetch "Bet of the Week" record (only #1 picks)
  const fetchBetOfWeekRecord = async () => {
    try {
      const response = await fetch('/api/game-results?season=2025&calculateRecord=true&topPickOnly=true');
      const data = await response.json();
      if (data.success && data.record) {
        setBetOfWeekRecord(data.record);
      }
    } catch (error) {
      console.error('Error fetching bet of week record:', error);
    }
  };

  useEffect(() => {
    fetchRecord();
    fetchBetOfWeekRecord();
  }, []);

  // Refresh record when viewing results tab
  useEffect(() => {
    if (activeTab === 'results') {
      fetchRecord();
      fetchBetOfWeekRecord();
    }
  }, [activeTab]);

  return (
    <main className="min-h-screen bg-[#0f1419] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {/* Lightning Bolt - Fast Picks/Power */}
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-red-500 rounded-lg blur-sm opacity-75"></div>
              <div className="relative w-full h-full bg-gradient-to-br from-blue-600 via-black to-red-500 rounded-lg flex items-center justify-center shadow-lg border-2 border-transparent"
                   style={{
                     background: 'linear-gradient(#0f1419, #0f1419) padding-box, linear-gradient(135deg, #3b82f6, #ef4444) border-box',
                     borderWidth: '3px'
                   }}>
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/>
                </svg>
              </div>
            </div>

            <h1 className="text-4xl font-bold">Best Bets</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Bet of the Week Record */}
            <div className="flex flex-col gap-1 bg-[#1a1f2e] px-4 py-2 rounded-lg border-2 border-yellow-500 shadow-lg shadow-yellow-500/20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-yellow-400">Bet of the Week</span>
                <span className="text-lg font-bold text-white">
                  {betOfWeekRecord.wins}-{betOfWeekRecord.losses}-{betOfWeekRecord.pushes}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Win Rate: <span className={`font-semibold ${
                  betOfWeekRecord.wins + betOfWeekRecord.losses > 0
                    ? (() => {
                        const winRate = (betOfWeekRecord.wins / (betOfWeekRecord.wins + betOfWeekRecord.losses)) * 100;
                        return winRate >= 60 ? 'text-green-400' : winRate >= 45 ? 'text-yellow-400' : 'text-red-400';
                      })()
                    : 'text-gray-400'
                }`}>
                  {betOfWeekRecord.wins + betOfWeekRecord.losses > 0
                    ? ((betOfWeekRecord.wins / (betOfWeekRecord.wins + betOfWeekRecord.losses)) * 100).toFixed(1)
                    : '0.0'}%
                </span>
              </div>
            </div>
            
            {/* Overall Record */}
            <div className="flex flex-col gap-1 bg-[#1a1f2e] px-4 py-2 rounded-lg border-2 border-blue-500 shadow-lg shadow-blue-500/20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-400">Overall Record</span>
                <span className="text-lg font-bold text-white">
                  {record.wins}-{record.losses}-{record.pushes}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Win Rate: <span className={`font-semibold ${
                  record.wins + record.losses > 0
                    ? (() => {
                        const winRate = (record.wins / (record.wins + record.losses)) * 100;
                        return winRate >= 60 ? 'text-green-400' : winRate >= 45 ? 'text-yellow-400' : 'text-red-400';
                      })()
                    : 'text-gray-400'
                }`}>
                  {record.wins + record.losses > 0
                    ? ((record.wins / (record.wins + record.losses)) * 100).toFixed(1)
                    : '0.0'}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sport Tab */}
        <div className="flex gap-4 mb-8">
          <button className="relative flex items-center gap-3 bg-[#1a1f2e] px-6 py-3 rounded-lg border-2 border-blue-500 hover:scale-105 hover:border-blue-400 transition-all duration-200 shadow-lg shadow-blue-500/20">
            <span className="text-2xl">🏈</span>
            <span className="text-lg font-medium">NFL</span>
          </button>
        </div>

        {/* Category Tab */}
        <div className="flex justify-between mb-8 border-b border-gray-700">
          <div className="flex gap-8">
            <button 
              onClick={() => setActiveTab('spreads')}
              className={`pb-4 text-lg font-medium transition-colors ${
                activeTab === 'spreads' 
                  ? 'text-[#22c55e] border-b-2 border-[#22c55e]' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Spreads
            </button>
            <button 
              onClick={() => setActiveTab('totals')}
              className={`pb-4 text-lg font-medium transition-colors ${
                activeTab === 'totals' 
                  ? 'text-[#22c55e] border-b-2 border-[#22c55e]' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Total O/U
            </button>
            <button 
              onClick={() => setActiveTab('player-props')}
              className={`pb-4 text-lg font-medium transition-colors ${
                activeTab === 'player-props' 
                  ? 'text-[#22c55e] border-b-2 border-[#22c55e]' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Player Props
            </button>
          </div>
          <button 
            onClick={() => setActiveTab('results')}
            className={`pb-4 text-lg font-medium transition-colors ${
              activeTab === 'results' 
                ? 'text-[#22c55e] border-b-2 border-[#22c55e]' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Results
          </button>
        </div>

        {/* Content */}
        {activeTab === 'spreads' && <BestBetsDisplay />}
        {activeTab === 'totals' && <TotalsDisplay />}
        {activeTab === 'player-props' && <PlayerPropsDisplay />}
        {activeTab === 'results' && <GameResultsDisplay />}
      </div>
    </main>
  );
}

