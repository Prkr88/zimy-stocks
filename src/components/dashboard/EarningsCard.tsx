'use client';

import { EarningsEvent, SentimentSignal } from '@/types';
import { format } from 'date-fns';

interface EarningsCardProps {
  event: EarningsEvent;
  sentiment?: SentimentSignal;
  isWatchlisted?: boolean;
  onAddToWatchlist?: (ticker: string) => void;
  onRemoveFromWatchlist?: (ticker: string) => void;
}

export default function EarningsCard({
  event,
  sentiment,
  isWatchlisted = false,
  onAddToWatchlist,
  onRemoveFromWatchlist,
}: EarningsCardProps) {
  const getSentimentColor = (sentiment?: SentimentSignal) => {
    if (!sentiment) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    
    switch (sentiment.sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'negative':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getSentimentIcon = (sentiment?: SentimentSignal) => {
    if (!sentiment) return '❓';
    
    switch (sentiment.sentiment) {
      case 'positive':
        return '📈';
      case 'negative':
        return '📉';
      default:
        return '➡️';
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {event.ticker}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(sentiment)}`}>
              {getSentimentIcon(sentiment)} {sentiment?.sentiment || 'No Signal'}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{event.companyName}</p>
        </div>
        
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

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {format(new Date(event.expectedDate), 'MMM dd, yyyy')}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Time</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {formatTime(event.expectedTime)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Market</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {event.market === 'SP500' ? 'S&P 500' : 'TA-125'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sector</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{event.sector}</p>
        </div>
      </div>

      {sentiment && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            AI Insight
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{sentiment.reasoning}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Confidence: {Math.round(sentiment.confidence * 100)}%
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Score: {sentiment.sentimentScore.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {event.analystEstimate && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
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
    </div>
  );
}