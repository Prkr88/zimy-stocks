'use client';

import { useState, useEffect, useCallback } from 'react';
import { cachedFetch, CACHE_KEYS, analystCache, invalidateCache } from '@/lib/cache/browserCache';
import EarningsCard from './EarningsCard';
import { EarningsEvent } from '@/types';

interface CachedEarningsGridProps {
  onAddToWatchlist?: (ticker: string) => void;
  onRemoveFromWatchlist?: (ticker: string) => void;
  watchlistedTickers?: string[];
}

export default function CachedEarningsGrid({
  onAddToWatchlist,
  onRemoveFromWatchlist,
  watchlistedTickers = []
}: CachedEarningsGridProps) {
  const [earningsEvents, setEarningsEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<'fresh' | 'cached' | 'stale'>('fresh');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadEarningsData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Clear cache if force refresh
      if (forceRefresh) {
        analystCache.delete(CACHE_KEYS.EARNINGS_GRID);
        invalidateCache('analyst_insights_');
      }

      // Try to get from cache first
      const cachedData = analystCache.get<{
        events: EarningsEvent[];
        timestamp: number;
        lastModified?: string;
      }>(CACHE_KEYS.EARNINGS_GRID);

      if (cachedData && !forceRefresh) {
        console.log('Using cached earnings data');
        setEarningsEvents(cachedData.events);
        setCacheStatus('cached');
        setLastUpdated(new Date(cachedData.timestamp));
        setLoading(false);
        return;
      }

      // Fetch fresh data from API
      console.log('Fetching fresh earnings data');
      const response = await fetch('/api/earnings/tech-sector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-earnings' })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.result?.upcomingEarnings) {
        const events = data.result.upcomingEarnings;
        
        // Sort by rating priority (as implemented in the original)
        const sortedEvents = [...events].sort((a, b) => {
          const getRatingPriority = (rating: string | null): number => {
            if (!rating) return 0;
            switch (rating) {
              case 'Strong Buy': return 6;
              case 'Buy': return 5;
              case 'Hold': return 4;
              case 'Sell': return 3;
              case 'Strong Sell': return 2;
              default: return 1;
            }
          };

          const aPriority = getRatingPriority(a.analystRating || null);
          const bPriority = getRatingPriority(b.analystRating || null);
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          
          return a.ticker.localeCompare(b.ticker);
        });

        setEarningsEvents(sortedEvents);
        setCacheStatus('fresh');
        setLastUpdated(new Date());

        // Cache the data with lastModified timestamp
        analystCache.set(CACHE_KEYS.EARNINGS_GRID, {
          events: sortedEvents,
          timestamp: Date.now(),
          lastModified: data.result.lastUpdated || new Date().toISOString()
        }, {
          ttl: 10 * 60 * 1000, // 10 minutes for earnings data
          lastModified: data.result.lastUpdated
        });
      } else {
        setError('Failed to load earnings data');
      }
    } catch (err) {
      console.error('Error loading earnings data:', err);
      setError('Failed to load earnings data');
      
      // Try to use any available cached data as fallback
      const fallbackData = analystCache.get(CACHE_KEYS.EARNINGS_GRID);
      if ((fallbackData as any)?.events) {
        console.log('Using stale cache data as fallback');
        setEarningsEvents((fallbackData as any).events);
        setCacheStatus('stale');
        setError('Using cached data (connection failed)');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh data every 15 minutes
  useEffect(() => {
    loadEarningsData();
    
    const interval = setInterval(() => {
      console.log('Auto-refreshing earnings data');
      loadEarningsData();
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [loadEarningsData]);

  const handleRefresh = () => {
    loadEarningsData(true);
  };

  const getCacheStatusColor = () => {
    switch (cacheStatus) {
      case 'fresh': return 'text-green-600 dark:text-green-400';
      case 'cached': return 'text-blue-600 dark:text-blue-400';
      case 'stale': return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getCacheStatusIcon = () => {
    switch (cacheStatus) {
      case 'fresh': return '🟢';
      case 'cached': return '🔵';
      case 'stale': return '🟡';
    }
  };

  if (loading && earningsEvents.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">Loading earnings data...</span>
          </div>
        </div>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with cache status and refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Upcoming Earnings ({earningsEvents.length})
          </h2>
          <div className={`flex items-center space-x-1 text-sm ${getCacheStatusColor()}`}>
            <span>{getCacheStatusIcon()}</span>
            <span>{cacheStatus === 'fresh' ? 'Live' : cacheStatus === 'cached' ? 'Cached' : 'Offline'}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {lastUpdated && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className={`mr-1 ${loading ? 'animate-spin' : ''}`}>
              {loading ? '⏳' : '🔄'}
            </span>
            Refresh
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className={`p-3 rounded-md text-sm ${
          cacheStatus === 'stale' 
            ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          {error}
        </div>
      )}

      {/* Earnings grid */}
      {earningsEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {earningsEvents.map((event) => (
            <EarningsCard
              key={`${event.ticker}-${event.expectedDate}`}
              event={event}
              isWatchlisted={watchlistedTickers.includes(event.ticker)}
              onAddToWatchlist={onAddToWatchlist}
              onRemoveFromWatchlist={onRemoveFromWatchlist}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-600 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No upcoming earnings found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Try refreshing or check back later for updated earnings data.
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <span className="mr-2">🔄</span>
            Refresh Data
          </button>
        </div>
      )}

      {/* Cache statistics (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs">
          <summary className="cursor-pointer text-gray-600 dark:text-gray-400 font-medium">
            Cache Statistics
          </summary>
          <div className="mt-2 space-y-1 text-gray-500 dark:text-gray-500">
            <div>Cache entries: {analystCache.getStats().size}</div>
            <div>Status: {cacheStatus}</div>
            <div>Last updated: {lastUpdated?.toLocaleString() || 'Never'}</div>
          </div>
        </details>
      )}
    </div>
  );
}