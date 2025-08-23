'use client';

import { useState, useEffect } from 'react';
import { EarningsEvent } from '@/types';
import { format } from 'date-fns';
import StockAnalysisButton from './StockAnalysisButton';
import { analystCache, CACHE_KEYS } from '@/lib/cache/browserCache';

interface EarningsListViewProps {
  events: EarningsEvent[];
  watchlistedTickers: string[];
  highlightedTicker?: string | null;
  onAddToWatchlist: (ticker: string) => void;
  onRemoveFromWatchlist: (ticker: string) => void;
}

interface AnalystData {
  ticker: string;
  rating: string | null;
  loading: boolean;
}

export default function EarningsListView({
  events,
  watchlistedTickers,
  highlightedTicker,
  onAddToWatchlist,
  onRemoveFromWatchlist,
}: EarningsListViewProps) {
  const [analystData, setAnalystData] = useState<Map<string, AnalystData>>(new Map());

  // Load analyst ratings for all visible events
  useEffect(() => {
    const loadRatings = async () => {
      const newAnalystData = new Map<string, AnalystData>();
      
      // Initialize loading state for all tickers
      events.forEach(event => {
        newAnalystData.set(event.ticker, { 
          ticker: event.ticker, 
          rating: null, 
          loading: true 
        });
      });
      
      setAnalystData(newAnalystData);
      
      // Load ratings from cache or API
      for (const event of events) {
        try {
          // Check cache first
          const cachedData = analystCache.get(CACHE_KEYS.ANALYST_INSIGHTS(event.ticker));
          if (cachedData) {
            let rating = null;
            if ((cachedData as any).success && (cachedData as any).results?.[event.ticker]?.insights?.consensus?.rating) {
              rating = (cachedData as any).results[event.ticker].insights.consensus.rating;
            } else if ((cachedData as any).insights?.consensus?.rating) {
              rating = (cachedData as any).insights.consensus.rating;
            }
            
            newAnalystData.set(event.ticker, {
              ticker: event.ticker,
              rating,
              loading: false
            });
            setAnalystData(new Map(newAnalystData));
            continue;
          }
          
          // If not cached, make API request
          const response = await fetch(`/api/analyst-insights/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: [event.ticker], action: 'get' }),
          });
          
          if (response.ok) {
            const data = await response.json();
            
            // Cache the result
            analystCache.set(CACHE_KEYS.ANALYST_INSIGHTS(event.ticker), data, {
              ttl: 5 * 60 * 1000, // 5 minutes cache
              lastModified: data.updatedAt || data.updated_at || data.lastModified
            });
            
            let rating = null;
            if (data.success && data.results?.[event.ticker]?.insights?.consensus?.rating) {
              rating = data.results[event.ticker].insights.consensus.rating;
            }
            
            newAnalystData.set(event.ticker, {
              ticker: event.ticker,
              rating,
              loading: false
            });
            setAnalystData(new Map(newAnalystData));
          } else {
            newAnalystData.set(event.ticker, {
              ticker: event.ticker,
              rating: null,
              loading: false
            });
            setAnalystData(new Map(newAnalystData));
          }
        } catch (error) {
          console.error(`Error loading rating for ${event.ticker}:`, error);
          newAnalystData.set(event.ticker, {
            ticker: event.ticker,
            rating: null,
            loading: false
          });
          setAnalystData(new Map(newAnalystData));
        }
        
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };
    
    if (events.length > 0) {
      loadRatings();
    }
  }, [events]);

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
      case 'Strong Buy': return '🚀';
      case 'Buy': return '📈';
      case 'Hold': return '⚖️';
      case 'Sell': return '📉';
      case 'Strong Sell': return '⛔';
      default: return '📊';
    }
  };

  const formatTime = (time: string) => {
    switch (time) {
      case 'before_market': return 'Pre-Market';
      case 'after_market': return 'After-Market';
      case 'during_market': return 'Market Hours';
      default: return time;
    }
  };

  const handleWatchlistToggle = (ticker: string) => {
    if (watchlistedTickers.includes(ticker)) {
      onRemoveFromWatchlist(ticker);
    } else {
      onAddToWatchlist(ticker);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
        <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <div className="col-span-3">Company</div>
          <div className="col-span-2">Rating</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Time</div>
          <div className="col-span-2">Sector</div>
          <div className="col-span-1">Actions</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200 dark:divide-gray-600">
        {events.map(event => {
          const isWatchlisted = watchlistedTickers.includes(event.ticker);
          const isHighlighted = highlightedTicker === event.ticker;
          const analystInfo = analystData.get(event.ticker);
          
          return (
            <div
              key={event.id}
              data-ticker={event.ticker}
              className={`grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                isHighlighted ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              {/* Company */}
              <div className="col-span-3">
                <div className="flex items-center">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {event.ticker}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {event.companyName}
                    </div>
                  </div>
                  <button
                    onClick={() => handleWatchlistToggle(event.ticker)}
                    className={`ml-2 p-1 rounded transition-colors ${
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

              {/* Rating */}
              <div className="col-span-2">
                {analystInfo?.loading ? (
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    ⏳ Loading...
                  </div>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRatingColor(analystInfo?.rating)}`}>
                    {getRatingIcon(analystInfo?.rating)} {analystInfo?.rating || 'No Rating'}
                  </span>
                )}
              </div>

              {/* Date */}
              <div className="col-span-2">
                <div className="text-sm text-gray-900 dark:text-white">
                  {format(new Date(event.expectedDate), 'MMM dd, yyyy')}
                </div>
              </div>

              {/* Time */}
              <div className="col-span-2">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {formatTime(event.expectedTime)}
                </div>
              </div>

              {/* Sector */}
              <div className="col-span-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {event.sector}
                </div>
              </div>

              {/* Actions */}
              <div className="col-span-1">
                <StockAnalysisButton 
                  ticker={event.ticker}
                  size="small"
                  onAnalysisComplete={() => {
                    // Refresh analyst data for this ticker
                    const currentData = analystData.get(event.ticker);
                    if (currentData) {
                      setAnalystData(prev => new Map(prev).set(event.ticker, {
                        ...currentData,
                        loading: true
                      }));
                    }
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No earnings events found
        </div>
      )}
    </div>
  );
}