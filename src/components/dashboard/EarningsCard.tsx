'use client';

import { useState, useEffect, useCallback } from 'react';
import { EarningsEvent, SentimentSignal } from '@/types';
import { format } from 'date-fns';
import AnalystInsightsCard from './AnalystInsightsCard';
import StockAnalysisButton from './StockAnalysisButton';
import { analystCache, CACHE_KEYS } from '@/lib/cache/browserCache';

interface EarningsCardProps {
  event: EarningsEvent;
  isWatchlisted?: boolean;
  onAddToWatchlist?: (ticker: string) => void;
  onRemoveFromWatchlist?: (ticker: string) => void;
}

export default function EarningsCard({
  event,
  isWatchlisted = false,
  onAddToWatchlist,
  onRemoveFromWatchlist,
}: EarningsCardProps) {
  const [showAnalystInsights, setShowAnalystInsights] = useState(false);
  const [analystRating, setAnalystRating] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const loadAnalystRating = useCallback(async () => {
    try {
      setLoading(true);
      
      // First, try to get data from cache (might be from batch loading)
      const cachedData = analystCache.get(CACHE_KEYS.ANALYST_INSIGHTS(event.ticker));
      if (cachedData) {
        console.log(`✅ Cache hit for rating ${event.ticker} - using existing data`);
        let rating = null;
        if (cachedData.success && cachedData.results?.[event.ticker]?.insights?.consensus?.rating) {
          rating = cachedData.results[event.ticker].insights.consensus.rating;
        } else if (cachedData.insights?.consensus?.rating) {
          // Handle single ticker cache format
          rating = cachedData.insights.consensus.rating;
        }
        setAnalystRating(rating);
        setLoading(false);
        return;
      }
      
      console.log(`❌ Cache miss for rating ${event.ticker} - fetching from API`);
      
      // If not cached, make API request
      const response = await fetch(`/api/analyst-insights/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: [event.ticker], action: 'get' }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Cache the result for future use
        analystCache.set(CACHE_KEYS.ANALYST_INSIGHTS(event.ticker), data, {
          ttl: 5 * 60 * 1000, // 5 minutes cache
          lastModified: data.updatedAt || data.updated_at || data.lastModified
        });
        
        if (data.success && data.results?.[event.ticker]?.insights?.consensus?.rating) {
          setAnalystRating(data.results[event.ticker].insights.consensus.rating);
        }
      }
    } catch (error) {
      console.error('Error loading analyst rating:', error);
    } finally {
      setLoading(false);
    }
  }, [event.ticker]);

  useEffect(() => {
    setMounted(true);
    loadAnalystRating();
  }, [event.ticker, loadAnalystRating]);

  const getRatingColor = (rating?: string | null) => {
    if (!rating) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    
    switch (rating) {
      case 'Strong Buy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Buy':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'Hold':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Sell':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'Strong Sell':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const getRatingIcon = (rating?: string | null) => {
    if (!rating) return '📊';
    
    switch (rating) {
      case 'Strong Buy':
        return '🚀';
      case 'Buy':
        return '📈';
      case 'Hold':
        return '⚖️';
      case 'Sell':
        return '📉';
      case 'Strong Sell':
        return '⛔';
      default:
        return '📊';
    }
  };

  const formatTime = (time: string) => {
    switch (time) {
      case 'before_market':
        return 'Before Market';
      case 'after_market':
        return 'After Market';
      case 'during_market':
        return 'During Market';
      default:
        return time;
    }
  };

  const handleWatchlistToggle = () => {
    if (isWatchlisted) {
      onRemoveFromWatchlist?.(event.ticker);
    } else {
      onAddToWatchlist?.(event.ticker);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow min-w-0 flex flex-col ${showAnalystInsights ? 'h-auto' : 'h-auto min-h-[380px] sm:h-[420px]'}`}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 mb-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-full">
                {event.ticker}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getRatingColor(mounted ? analystRating : null)}`}>
                {!mounted || loading ? '⏳' : getRatingIcon(analystRating)} {!mounted || loading ? 'Loading...' : (analystRating || 'No Rating')}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 break-words">
            {event.companyName}
          </p>
        </div>
        
        {/* Actions Section */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <StockAnalysisButton 
            ticker={event.ticker} 
            onAnalysisComplete={() => {
              loadAnalystRating();
            }} 
          />
          <button
            onClick={handleWatchlistToggle}
            className={`p-2 rounded-full transition-colors ${
              isWatchlisted
                ? 'text-yellow-500 hover:text-yellow-600'
                : 'text-gray-400 hover:text-yellow-500'
            }`}
            title={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            {isWatchlisted ? '⭐' : '☆'}
          </button>
        </div>
      </div>

      {/* Data Grid Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 flex-shrink-0">
        <div className="min-w-0 overflow-hidden">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Date</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {mounted ? format(new Date(event.expectedDate), 'MMM dd, yyyy') : 'Loading...'}
          </p>
        </div>
        <div className="min-w-0 overflow-hidden">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Time</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {formatTime(event.expectedTime)}
          </p>
        </div>
        <div className="min-w-0 overflow-hidden">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Market</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {event.market === 'SP500' ? 'S&P 500' : 'TA-125'}
          </p>
        </div>
        <div className="min-w-0 overflow-hidden">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Sector</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white break-words line-clamp-2">
            {event.sector}
          </p>
        </div>
      </div>

      {event.analystEstimate && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 flex-shrink-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Analyst Estimate
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                ${event.analystEstimate.toFixed(2)}
              </p>
            </div>
            {event.previousEarnings && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Previous Earnings
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  ${event.previousEarnings.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analyst Insights Toggle - Always at bottom */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-auto">
        <button
          onClick={() => setShowAnalystInsights(!showAnalystInsights)}
          className="w-full flex items-center justify-between p-3 sm:p-4 text-sm sm:text-base font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors min-h-[52px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <span className="flex items-center flex-1">
            <span className="text-lg sm:text-xl mr-2 flex-shrink-0">📊</span>
            <span className="text-left">Analyst Insights</span>
          </span>
          <div className={`transform transition-transform duration-200 flex-shrink-0 ml-2 ${showAnalystInsights ? 'rotate-180' : ''}`}>
            <svg 
              className="w-6 h-6 sm:w-7 sm:h-7" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M19 9l-7 7-7-7" 
              />
            </svg>
          </div>
        </button>
      </div>

      {/* Expandable Analyst Insights */}
      <div className={`overflow-hidden transition-all duration-300 ${showAnalystInsights ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="mt-4">
          <AnalystInsightsCard ticker={event.ticker} companyName={event.companyName} />
        </div>
      </div>
    </div>
  );
}