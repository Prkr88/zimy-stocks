'use client';

import { useState } from 'react';
import { Watchlist } from '@/types';
import Link from 'next/link';

interface InteractiveWatchlistSummaryProps {
  watchlists: Watchlist[];
  onTickerHighlight: (ticker: string | null) => void;
  onRemoveFromWatchlist: (ticker: string) => void;
}

export default function InteractiveWatchlistSummary({ 
  watchlists, 
  onTickerHighlight, 
  onRemoveFromWatchlist 
}: InteractiveWatchlistSummaryProps) {
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null);
  const [expandedSummary, setExpandedSummary] = useState(false);
  
  const watchlistedTickers = watchlists.flatMap(wl => wl.companies.map(c => c.ticker));
  const displayTickers = expandedSummary ? watchlistedTickers : watchlistedTickers.slice(0, 5);
  
  const handleTickerClick = (ticker: string) => {
    onTickerHighlight(ticker);
    // Scroll to the corresponding card
    const cardElement = document.querySelector(`[data-ticker="${ticker}"]`);
    if (cardElement) {
      cardElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // Add temporary highlight effect
      cardElement.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50');
      setTimeout(() => {
        cardElement.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50');
        onTickerHighlight(null);
      }, 2000);
    }
  };

  const getTickerDetails = (ticker: string) => {
    for (const watchlist of watchlists) {
      const company = watchlist.companies.find(c => c.ticker === ticker);
      if (company) {
        return company;
      }
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 lg:p-6 min-w-0 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <span className="mr-2">⭐</span>
          Your Watchlist
        </h3>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {watchlistedTickers.length}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {watchlists.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Lists
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {watchlistedTickers.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Companies
          </div>
        </div>
      </div>

      {/* Interactive Ticker List */}
      {watchlistedTickers.length > 0 ? (
        <div className="space-y-2">
          {displayTickers.map(ticker => {
            const company = getTickerDetails(ticker);
            return (
              <div 
                key={ticker}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all min-w-0 ${
                  hoveredTicker === ticker 
                    ? 'bg-blue-50 dark:bg-blue-900/20 shadow-md' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => handleTickerClick(ticker)}
                onMouseEnter={() => {
                  setHoveredTicker(ticker);
                  onTickerHighlight(ticker);
                }}
                onMouseLeave={() => {
                  setHoveredTicker(null);
                  onTickerHighlight(null);
                }}
              >
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {ticker}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                      {company?.sector?.split(' ')[0] || 'N/A'}
                    </span>
                  </div>
                  {company && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                      {company.companyName}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromWatchlist(ticker);
                    }}
                    className="text-gray-400 hover:text-red-500 text-xs p-1 rounded transition-colors"
                    title="Remove from watchlist"
                  >
                    ✕
                  </button>
                  <div className="text-blue-500 dark:text-blue-400">
                    →
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Expand/Collapse Button */}
          {watchlistedTickers.length > 5 && (
            <button
              onClick={() => setExpandedSummary(!expandedSummary)}
              className="w-full p-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              {expandedSummary ? (
                <>Show Less ({watchlistedTickers.length - 5} hidden)</>
              ) : (
                <>Show All (+{watchlistedTickers.length - 5} more)</>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="text-gray-400 dark:text-gray-600 mb-3">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Your watchlist is empty
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Click the ☆ icon on any earnings card to add companies
          </p>
        </div>
      )}

      {/* View All Button */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/history"
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
        >
          <span className="mr-2">📊</span>
          View Complete History
        </Link>
      </div>
    </div>
  );
}