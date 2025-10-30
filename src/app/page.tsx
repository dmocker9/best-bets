'use client';

import { useState } from 'react';
import { BestBetsDisplay } from '@/components/BestBetsDisplay';
import { PlayerPropsDisplay } from '@/components/PlayerPropsDisplay';

type TabType = 'spreads' | 'player-props';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('spreads');

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
            <div className="flex items-center gap-2 bg-[#1a1f2e] px-4 py-2 rounded-lg border border-gray-700">
              <span className="text-sm font-semibold text-gray-400">Record</span>
              <span className="text-lg font-bold text-white">0-0-0</span>
            </div>
            <button className="flex items-center gap-2 bg-[#1a1f2e] px-6 py-3 rounded-lg border border-gray-700">
              <span className="text-lg">NFL Week 9 — 11/4</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
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
        <div className="flex gap-8 mb-8 border-b border-gray-700">
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

        {/* AI Best Bets Predictions */}
        {activeTab === 'spreads' ? <BestBetsDisplay /> : <PlayerPropsDisplay />}
      </div>
    </main>
  );
}

