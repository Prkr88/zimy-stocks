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
  const [ratingsMap, setRatingsMap] = useState<Map<string, { hasRating: boolean; rating?: string }>>(new Map());
  const [ratingsLoaded, setRatingsLoaded] = useState(false);


  // Load ratings for all events to enable sorting
  useEffect(() => {
    const loadAllRatings = async () => {
      if (events.length === 0) {
        setRatingsLoaded(true);
        return;
      }

      setRatingsLoaded(false);
      setRatingsMap(new Map()); // Clear previous ratings
      
      const tickers = events.map(e => e.ticker);
      console.log('🔍 Loading ratings for tickers:', tickers);
      
      // Try batch loading in chunks (batch API has 3 ticker limit)
      const newRatingsMap = new Map();
      let ratingsFound = 0;
      
      try {
        const batchSize = 3;
        let batchSuccess = true;
        
        for (let i = 0; i < tickers.length; i += batchSize) {
          const batchTickers = tickers.slice(i, i + batchSize);
          
          try {
            const batchResponse = await fetch('/api/analyst-insights/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tickers: batchTickers, action: 'get' }),
            });
            
            if (batchResponse.ok) {
              const batchData = await batchResponse.json();
              console.log(`✅ Batch ${i / batchSize + 1} success:`, batchData.success);
              
              if (batchData.success && batchData.results) {
                // Process this batch's results
                batchTickers.forEach(ticker => {
                  const result = batchData.results[ticker];
                  const rating = result?.insights?.consensus?.rating || null;
                  if (rating) ratingsFound++;
                  
                  newRatingsMap.set(ticker, {
                    hasRating: Boolean(rating),
                    rating
                  });
                });
                console.log(`📊 Batch ${i / batchSize + 1} processed: ${batchTickers.length} tickers`);
              } else {
                console.error(`❌ Batch ${i / batchSize + 1} invalid response:`, batchData);
                batchSuccess = false;
                break;
              }
            } else {
              const errorText = await batchResponse.text();
              console.error(`❌ Batch ${i / batchSize + 1} HTTP error ${batchResponse.status}:`, errorText);
              batchSuccess = false;
              break;
            }
          } catch (batchError) {
            console.error(`❌ Error in batch ${i / batchSize + 1}:`, batchError);
            batchSuccess = false;
            break;
          }
          
          // Small delay between batches
          if (i + batchSize < tickers.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        if (batchSuccess) {
          console.log(`✅ Batch loading complete: ${ratingsFound}/${tickers.length} tickers have ratings`);
          setRatingsMap(newRatingsMap);
          setRatingsLoaded(true);
          return; // Skip individual loading if batch worked
        }
        
        console.warn('⚠️ Batch loading failed, falling back to individual calls');
      } catch (error) {
        console.error('❌ Error in batch loading, falling back to individual calls:', error);
      }
      
      // If batch loading failed completely, still set ratingsLoaded to true
      // so the UI doesn't stay in loading state forever and show alphabetical sort
      if (newRatingsMap.size === 0) {
        console.log('📝 Batch loading completely failed, setting empty ratings map');
        setRatingsMap(new Map());
        setRatingsLoaded(true);
        return; // Skip individual loading and just show alphabetical sort
      }
      
      // If we have partial results from batch loading, use them and mark as loaded
      console.log(`✅ Partial batch success: ${newRatingsMap.size} ratings loaded`);
      setRatingsMap(newRatingsMap);
      setRatingsLoaded(true);
    };

    loadAllRatings();
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

    // Apply sorting: Strong Buy → Buy → Hold → Sell → Strong Sell → No Rating
    filtered = filtered.sort((a, b) => {
      if (ratingsLoaded && ratingsMap.size > 0) {
        // Use ratings-based sorting when available
        const aRatingData = ratingsMap.get(a.ticker) || { hasRating: false, rating: null };
        const bRatingData = ratingsMap.get(b.ticker) || { hasRating: false, rating: null };
        
        const aRating = aRatingData.rating || null;
        const bRating = bRatingData.rating || null;
        
        // Get priority scores (higher = appears first)
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
        
        const aPriority = getRatingPriority(aRating);
        const bPriority = getRatingPriority(bRating);
        
        // Sort by priority (higher priority first)
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        // If same rating, sort alphabetically by ticker
        return a.ticker.localeCompare(b.ticker);
      } else {
        // Fallback: just sort alphabetically by ticker if no ratings
        return a.ticker.localeCompare(b.ticker);
      }
    });

    // Debug logging for sorting verification
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Final Sorting Results:', {
        ratingsLoaded,
        ratingsMapSize: ratingsMap.size,
        totalItems: filtered.length,
        firstFew: filtered.slice(0, 5).map((event, index) => {
          const ratingData = ratingsMap.get(event.ticker);
          return {
            position: index + 1,
            ticker: event.ticker,
            rating: ratingData?.rating || 'No Rating',
            hasRating: Boolean(ratingData?.rating)
          };
        })
      });
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

  // Show loading spinner while ratings are being loaded
  if (!ratingsLoaded && events.length > 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <div className="text-blue-500 dark:text-blue-400 mb-4">
          <svg className="animate-spin mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Loading Analyst Ratings
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Fetching analyst consensus data for {events.length} companies...
        </p>
        <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${Math.min(100, (ratingsMap.size / events.length) * 100)}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          {ratingsMap.size} of {events.length} loaded
        </p>
      </div>
    );
  }

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
              <>⏳ Loading ratings...</>
            )}
          </p>
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