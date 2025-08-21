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
  const [ratingsMap, setRatingsMap] = useState<Map<string, boolean>>(new Map());

  // Load ratings for all events to enable sorting
  useEffect(() => {
    const loadAllRatings = async () => {
      const ratingsPromises = events.map(async (event) => {
        try {
          const response = await fetch(`/api/stocks/${event.ticker}/analyst-insights`);
          if (response.ok) {
            const data = await response.json();
            return { 
              ticker: event.ticker, 
              hasRating: data.success && data.insights.consensus?.rating 
            };
          }
        } catch (error) {
          console.error(`Error loading rating for ${event.ticker}:`, error);
        }
        return { ticker: event.ticker, hasRating: false };
      });

      const ratings = await Promise.all(ratingsPromises);
      const newRatingsMap = new Map();
      ratings.forEach(({ ticker, hasRating }) => {
        newRatingsMap.set(ticker, hasRating);
      });
      setRatingsMap(newRatingsMap);
    };

    if (events.length > 0) {
      loadAllRatings();
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

    // Sort by ratings - cards with ratings appear first
    filtered = filtered.sort((a, b) => {
      const aHasRating = ratingsMap.get(a.ticker) || false;
      const bHasRating = ratingsMap.get(b.ticker) || false;
      
      if (aHasRating && !bHasRating) return -1;
      if (!aHasRating && bHasRating) return 1;
      return 0; // Keep original order for same rating status
    });

    setFilteredEvents(filtered);
  }, [events, filters, ratingsMap]);

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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Upcoming Earnings ({filteredEvents.length})
        </h2>
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