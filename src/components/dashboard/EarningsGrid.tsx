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

  // Helper function to get rating priority for stable sorting
  // Higher priority = appears first in the list
  const getRatingPriority = (rating: string | null): number => {
    if (!rating) return 0; // 'No Rating' - appears last
    switch (rating) {
      case 'Strong Buy': return 6;  // Appears first
      case 'Buy': return 5;         // Second
      case 'Hold': return 4;        // Third
      case 'Sell': return 3;        // Fourth
      case 'Strong Sell': return 2; // Fifth
      default: return 1;            // Unknown ratings before 'No Rating'
    }
  };

  // Helper function to get rating display order for sorting
  const getRatingDisplayOrder = (rating: string | null): string => {
    if (!rating) return 'Z_No Rating'; // Ensures it sorts last
    switch (rating) {
      case 'Strong Buy': return 'A_Strong Buy';
      case 'Buy': return 'B_Buy';
      case 'Hold': return 'C_Hold';
      case 'Sell': return 'D_Sell';
      case 'Strong Sell': return 'E_Strong Sell';
      default: return 'Y_' + rating; // Unknown ratings before 'No Rating'
    }
  };

  // Load ratings for all events to enable sorting
  useEffect(() => {
    const loadAllRatings = async () => {
      setRatingsLoaded(false);
      
      // First, try to load ratings from a batch API if available
      try {
        const tickers = events.map(e => e.ticker);
        console.log('🔍 Loading ratings for tickers:', tickers);
        
        // Try batch loading first (more efficient for Vercel)
        const batchResponse = await fetch('/api/analyst-insights/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers, action: 'get' }),
        });
        
        if (batchResponse.ok) {
          const batchData = await batchResponse.json();
          console.log('📊 Batch ratings response:', batchData);
          
          if (batchData.success && batchData.results) {
            const newRatingsMap = new Map();
            
            Object.entries(batchData.results).forEach(([ticker, result]: [string, any]) => {
              const rating = result?.insights?.consensus?.rating || null;
              newRatingsMap.set(ticker, {
                hasRating: Boolean(rating),
                rating,
                priority: getRatingPriority(rating)
              });
            });
            
            setRatingsMap(newRatingsMap);
            setRatingsLoaded(true);
            console.log('✅ Batch ratings loaded successfully');
            return; // Skip individual loading if batch worked
          }
        }
        console.warn('⚠️ Batch loading failed, falling back to individual calls');
      } catch (error) {
        console.error('❌ Error in batch loading, falling back to individual calls:', error);
      }
      
      // Fallback: Process in smaller batches with individual API calls
      const batchSize = 3; // Reduced batch size for Vercel
      const newRatingsMap = new Map();
      
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        console.log(`🔄 Loading ratings batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)}: ${batch.map(e => e.ticker).join(', ')}`);
        
        const ratingsPromises = batch.map(async (event) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout for Vercel
            
            const response = await fetch(`/api/stocks/${event.ticker}/analyst-insights`, {
              signal: controller.signal,
              headers: { 'Cache-Control': 'no-cache' } // Prevent caching issues on Vercel
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              const rating = data.success ? data.insights.consensus?.rating : null;
              console.log(`📈 ${event.ticker}: ${rating || 'No Rating'}`);
              return { 
                ticker: event.ticker, 
                hasRating: Boolean(rating),
                rating,
                priority: getRatingPriority(rating)
              };
            } else {
              console.warn(`⚠️ API response not OK for ${event.ticker}:`, response.status);
            }
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              console.warn(`⏰ Timeout loading rating for ${event.ticker}`);
            } else {
              console.error(`❌ Error loading rating for ${event.ticker}:`, error);
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
        
        // Longer delay between batches for Vercel stability
        if (i + batchSize < events.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      setRatingsLoaded(true);
      console.log('✅ Individual ratings loading completed');
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

    // Apply stable sorting: Strong Buy → Buy → Hold → Sell → Strong Sell → No Rating
    filtered = filtered.sort((a, b) => {
      // If ratings are loaded, use the explicit rating order
      if (ratingsLoaded && ratingsMap.size > 0) {
        const aRatingData = ratingsMap.get(a.ticker) || { hasRating: false, rating: null, priority: 0 };
        const bRatingData = ratingsMap.get(b.ticker) || { hasRating: false, rating: null, priority: 0 };
        
        // Get the rating values
        const aRating = aRatingData.rating || null;
        const bRating = bRatingData.rating || null;
        
        // Get priority scores (higher = appears first)
        const aPriority = getRatingPriority(aRating);
        const bPriority = getRatingPriority(bRating);
        
        // Sort by priority (higher priority first)
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        // If same rating priority, sort alphabetically by ticker for consistency
        if (aPriority === bPriority && aPriority > 0) {
          return a.ticker.localeCompare(b.ticker);
        }
      }
      
      // For same rating level or when ratings not loaded, sort by earnings date (closest first)
      const aDate = new Date(a.expectedDate);
      const bDate = new Date(b.expectedDate);
      return aDate.getTime() - bDate.getTime();
    });

    // Debug logging for sorting verification (remove in production)
    if (ratingsLoaded && process.env.NODE_ENV === 'development') {
      console.log('📊 Sorting Results:', filtered.slice(0, 10).map((event, index) => {
        const ratingData = ratingsMap.get(event.ticker);
        return {
          position: index + 1,
          ticker: event.ticker,
          rating: ratingData?.rating || 'No Rating',
          priority: getRatingPriority(ratingData?.rating || null)
        };
      }));
    }

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
              <>📊 Sorted: Strong Buy → Buy → Hold → Sell → Strong Sell → No Rating • {Array.from(ratingsMap.values()).filter(r => r.hasRating).length} with ratings</>
            ) : (
              <>⏳ Loading ratings for stable sorting...</>
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