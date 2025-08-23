'use client';

import { useState, useEffect } from 'react';
import { EarningsEvent, SentimentSignal } from '@/types';
import { FilterOptions } from './EarningsFilter';
import EarningsCard from './EarningsCard';
import EarningsListView from './EarningsListView';
import EarningsGridControls, { SortOption, ViewMode } from './EarningsGridControls';
import { analystCache } from '@/lib/cache/browserCache';

interface EnhancedEarningsGridProps {
  events: EarningsEvent[];
  signals: SentimentSignal[];
  watchlistedTickers: string[];
  filters: FilterOptions;
  highlightedTicker?: string | null;
  onAddToWatchlist: (ticker: string, companyName: string, market: string, sector: string) => void;
  onRemoveFromWatchlist: (ticker: string) => void;
}

export default function EnhancedEarningsGrid({
  events,
  signals,
  watchlistedTickers,
  filters,
  highlightedTicker,
  onAddToWatchlist,
  onRemoveFromWatchlist,
}: EnhancedEarningsGridProps) {
  const [filteredEvents, setFilteredEvents] = useState<EarningsEvent[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Map<string, { hasRating: boolean; rating?: string }>>(new Map());
  const [ratingsLoaded, setRatingsLoaded] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Load ratings for all events to enable sorting (progressive loading)
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
                  
                  // Cache individual ticker data for AnalystInsightsCard components
                  if (result) {
                    const cacheKey = `analyst_insights_${ticker}`;
                    const cachedData = {
                      success: true,
                      results: { [ticker]: result }
                    };
                    
                    // Set cache directly using analystCache
                    analystCache.set(cacheKey, cachedData, {
                      ttl: 5 * 60 * 1000, // 5 minutes cache
                      lastModified: batchData.updatedAt || batchData.updated_at || batchData.lastModified
                    });
                    
                    console.log(`🟢 Cached individual ticker data for ${ticker} from batch`);
                  }
                });
                
                // Update UI immediately after each batch (progressive loading)
                setRatingsMap(new Map(newRatingsMap));
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
          return;
        }
        
        console.warn('⚠️ Batch loading failed');
      } catch (error) {
        console.error('❌ Error in batch loading:', error);
      }
      
      // If batch loading failed completely, still set ratingsLoaded to true
      if (newRatingsMap.size === 0) {
        console.log('📝 Batch loading completely failed, setting empty ratings map');
        setRatingsMap(new Map());
        setRatingsLoaded(true);
        return;
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

    // Apply sorting based on selected option
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          // Rating-based sorting (existing logic)
          if (ratingsMap.size > 0) {
            const aRatingData = ratingsMap.get(a.ticker) || { hasRating: false, rating: null };
            const bRatingData = ratingsMap.get(b.ticker) || { hasRating: false, rating: null };
            
            const aRating = aRatingData.rating || null;
            const bRating = bRatingData.rating || null;
            
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
            
            const aPriority = getRatingPriority(aRating);
            const bPriority = getRatingPriority(bRating);
            
            if (aPriority !== bPriority) {
              return bPriority - aPriority;
            }
            
            return a.ticker.localeCompare(b.ticker);
          } else {
            return a.ticker.localeCompare(b.ticker);
          }

        case 'date_asc':
          return new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime();

        case 'date_desc':
          return new Date(b.expectedDate).getTime() - new Date(a.expectedDate).getTime();

        case 'company_az':
          return a.companyName.localeCompare(b.companyName);

        case 'company_za':
          return b.companyName.localeCompare(a.companyName);

        case 'market_cap':
          // For now, sort by ticker as a proxy for market cap
          // In a real app, you'd have actual market cap data
          return a.ticker.localeCompare(b.ticker);

        default:
          return a.ticker.localeCompare(b.ticker);
      }
    });

    setFilteredEvents(filtered);
  }, [events, filters, ratingsMap, ratingsLoaded, sortBy]);

  const handleAddToWatchlist = (ticker: string) => {
    const event = events.find(e => e.ticker === ticker);
    if (event) {
      onAddToWatchlist(ticker, event.companyName, event.market, event.sector);
    }
  };

  if (filteredEvents.length === 0) {
    return (
      <div>
        <EarningsGridControls
          sortBy={sortBy}
          viewMode={viewMode}
          onSortChange={setSortBy}
          onViewModeChange={setViewMode}
          totalCount={events.length}
          filteredCount={0}
        />
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
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <EarningsGridControls
        sortBy={sortBy}
        viewMode={viewMode}
        onSortChange={setSortBy}
        onViewModeChange={setViewMode}
        totalCount={events.length}
        filteredCount={filteredEvents.length}
      />
      
      {/* Content */}
      {viewMode === 'list' ? (
        <EarningsListView
          events={filteredEvents}
          watchlistedTickers={watchlistedTickers}
          highlightedTicker={highlightedTicker}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={onRemoveFromWatchlist}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredEvents.map(event => (
            <div
              key={event.id}
              data-ticker={event.ticker}
              className={highlightedTicker === event.ticker ? 'transition-all' : ''}
            >
              <EarningsCard
                event={event}
                isWatchlisted={watchlistedTickers.includes(event.ticker)}
                onAddToWatchlist={handleAddToWatchlist}
                onRemoveFromWatchlist={onRemoveFromWatchlist}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}