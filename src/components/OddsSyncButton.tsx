'use client';

import { useState } from 'react';

interface SyncResult {
  success: boolean;
  message: string;
  inserted: number;
  updated: number;
  failed: number;
  totalGames: number;
  errors: string[];
}

export function OddsSyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/sync-odds', {
        method: 'GET',
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        inserted: 0,
        updated: 0,
        failed: 0,
        totalGames: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleSync}
        disabled={loading}
        className="px-6 py-3 bg-[#22c55e] hover:bg-[#16a34a] disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Syncing...
          </>
        ) : (
          <>
            🔄 Sync Odds Data
          </>
        )}
      </button>

      {result && (
        <div
          className={`p-4 rounded-lg border ${
            result.success
              ? 'bg-green-900/20 border-green-700'
              : 'bg-red-900/20 border-red-700'
          }`}
        >
          <div className="space-y-2">
            <p className={`font-semibold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.message}
            </p>
            
            {result.totalGames > 0 && (
              <div className="text-sm text-gray-300 space-y-1">
                <p>📊 Total Games: {result.totalGames}</p>
                {result.inserted > 0 && <p>✅ Inserted: {result.inserted}</p>}
                {result.updated > 0 && <p>🔄 Updated: {result.updated}</p>}
                {result.failed > 0 && <p>❌ Failed: {result.failed}</p>}
              </div>
            )}

            {result.errors.length > 0 && (
              <details className="mt-2">
                <summary className="text-sm text-red-400 cursor-pointer">
                  View Errors ({result.errors.length})
                </summary>
                <ul className="mt-2 text-xs text-red-300 space-y-1 pl-4">
                  {result.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

