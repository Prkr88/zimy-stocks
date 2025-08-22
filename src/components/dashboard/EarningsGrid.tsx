'use client';

import { useState, useEffect } from 'react';
import { EarningsEvent, SentimentSignal, WatchlistCompany } from '@/types';
import EarningsCard from './EarningsCard';
import { FilterOptions } from './EarningsFilter';

interface EarningsGridProps {
  events: EarningsEvent[];
  signals: SentimentSignal[];
  watchlistedTickers: string[];
  filters: FilterOptions;
  onAddToWatchlist: (ticker: string, companyName: string, market: string, sector: string) => void;
  onRemoveFromWatchlist: (ticker: string) => void;
}

export default function EarningsGrid({
  events,
  signals,
  watchlistedTickers,
  filters,
  onAddToWatchlist,
  onRemoveFromWatchlist,
}: EarningsGridProps) {
  const [filteredEvents, setFilteredEvents] = useState<EarningsEvent[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Map<string, { hasRating: boolean; rating?: string; priority: number }>>(new Map());
  const [ratingsLoaded, setRatingsLoaded] = useState(false);

  // Helper function to get rating priority (higher is better)
  const getRatingPriority = (rating: string | null): number => {
    if (!rating) return 0;
    switch (rating) {
      case 'Strong Buy': return 5;
      case 'Buy': return 4;
      case 'Hold': return 3;
      case 'Sell': return 2;
      case 'Strong Sell': return 1;
      default: return 0;
    }
  };

  // Load ratings for all events to enable sorting
  useEffect(() => {
    const loadAllRatings = async () => {
      setRatingsLoaded(false);
      
      // Process in smaller batches to avoid overwhelming the API
      const batchSize = 5;
      const newRatingsMap = new Map();
      
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        
        const ratingsPromises = batch.map(async (event) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(`/api/stocks/${event.ticker}/analyst-insights`, {
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              const rating = data.success ? data.insights.consensus?.rating : null;
              return { 
                ticker: event.ticker, 
                hasRating: Boolean(rating),
                rating,
                priority: getRatingPriority(rating)
              };
            }
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              console.warn(`Timeout loading rating for ${event.ticker}`);
            } else {
              console.error(`Error loading rating for ${event.ticker}:`, error);
            }
          }
          return { ticker: event.ticker, hasRating: false, rating: null, priority: 0 };
        });

        const batchRatings = await Promise.all(ratingsPromises);
        batchRatings.forEach(({ ticker, hasRating, rating, priority }) => {
          newRatingsMap.set(ticker, { hasRating, rating, priority });
        });
        
        // Update the map progressively for better UX
        setRatingsMap(new Map(newRatingsMap));
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < events.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      setRatingsLoaded(true);
    };

    if (events.length > 0) {
      loadAllRatings();
    } else {
      setRatingsLoaded(true);
    }
  }, [events]);

  useEffect(() => {
    let filtered = events;

    // Filter by markets
    if (filters.markets.length > 0) {
      filtered = filtered.filter(event => filters.markets.includes(event.market));
    }

    // Filter by sectors
    if (filters.sectors.length > 0) {
      filtered = filtered.filter(event => filters.sectors.includes(event.sector));
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.companyName.toLowerCase().includes(searchLower) ||
        event.ticker.toLowerCase().includes(searchLower)
      );
    }

    // Always apply sorting - use ratings if available, fallback to date-based sorting
    filtered = filtered.sort((a, b) => {
      // If ratings are loaded, use rating-based sorting
      if (ratingsLoaded && ratingsMap.size > 0) {
        const aRatingData = ratingsMap.get(a.ticker) || { hasRating: false, priority: 0 };
        const bRatingData = ratingsMap.get(b.ticker) || { hasRating: false, priority: 0 };
        
        // First, sort by whether they have ratings at all
        if (aRatingData.hasRating && !bRatingData.hasRating) return -1;
        if (!aRatingData.hasRating && bRatingData.hasRating) return 1;
        
        // If both have ratings, sort by rating quality (Strong Buy first, etc.)
        if (aRatingData.hasRating && bRatingData.hasRating) {
          return bRatingData.priority - aRatingData.priority;
        }
      }
      
      // Fallback: sort by earnings date (closest first)
      const aDate = new Date(a.expectedDate);
      const bDate = new Date(b.expectedDate);
      return aDate.getTime() - bDate.getTime();
    });

    setFilteredEvents(filtered);
  }, [events, filters, ratingsMap, ratingsLoaded]);

  const getSignalForTicker = (ticker: string): SentimentSignal | undefined => {
    return signals.find(signal => signal.ticker === ticker);
  };

  const handleAddToWatchlist = (ticker: string) => {
    const event = events.find(e => e.ticker === ticker);
    if (event) {
      onAddToWatchlist(ticker, event.companyName, event.market, event.sector);
    }
  };

  if (filteredEvents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <div className="text-gray-400 dark:text-gray-600 mb-4">
          <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No earnings events found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {filters.searchTerm || filters.markets.length > 0 || filters.sectors.length > 0
            ? 'Try adjusting your filters to see more results.'
            : 'No upcoming earnings events are available at the moment.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upcoming Earnings ({filteredEvents.length})
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {ratingsLoaded ? (
              <>📊 Sorted by analyst ratings • {Array.from(ratingsMap.values()).filter(r => r.hasRating).length} with ratings</>
            ) : (
              <>⏳ Loading ratings for sorting...</>
            )}
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {signals.length} companies with AI insights
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4 sm:gap-6">
        {filteredEvents.map(event => (
          <EarningsCard
            key={event.id}
            event={event}
            sentiment={getSignalForTicker(event.ticker)}
            isWatchlisted={watchlistedTickers.includes(event.ticker)}
            onAddToWatchlist={handleAddToWatchlist}
            onRemoveFromWatchlist={onRemoveFromWatchlist}
          />
        ))}
      </div>
    </div>
  );
}