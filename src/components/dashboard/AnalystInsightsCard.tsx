'use client';

import { useState, useEffect, useCallback } from 'react';
import { cachedFetch, CACHE_KEYS, analystCache } from '@/lib/cache/browserCache';

interface AnalystInsightsCardProps {
  ticker: string;
  companyName: string;
}

interface ConsensusData {
  rating?: string;
  rating_distribution?: {
    buy?: number;
    hold?: number;
    sell?: number;
  };
  avg_price_target?: number;
  eps_estimate?: number;
  revenue_estimate?: number;
  confidence?: number;
  dataSource?: string;
  updatedAt?: any;
  guidance?: string;
  analyst_reaction?: string;
  sentiment_analysis?: string;
  credibility_score?: number;
  weighted_rating?: string;
}

export default function AnalystInsightsCard({ ticker, companyName }: AnalystInsightsCardProps) {
  const [consensus, setConsensus] = useState<ConsensusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalystInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, try to get data from cache (might be from batch loading)
      const cachedData = analystCache.get(CACHE_KEYS.ANALYST_INSIGHTS(ticker));
      if (cachedData) {
        console.log(`✅ Cache hit for ${ticker} - using existing data`);
        if ((cachedData as any).success && (cachedData as any).results?.[ticker]?.insights?.consensus) {
          setConsensus((cachedData as any).results[ticker].insights.consensus);
        } else if ((cachedData as any).insights?.consensus) {
          // Handle single ticker cache format
          setConsensus((cachedData as any).insights.consensus);
        } else {
          setConsensus(null);
        }
        setLoading(false);
        return;
      }
      
      console.log(`❌ Cache miss for ${ticker} - fetching from API`);
      
      // If not cached, make API request
      const response = await fetch('/api/analyst-insights/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: [ticker], action: 'get' })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the result for future use
      analystCache.set(CACHE_KEYS.ANALYST_INSIGHTS(ticker), data, {
        ttl: 5 * 60 * 1000, // 5 minutes cache
        lastModified: data.updatedAt || data.updated_at || data.lastModified
      });
      
      if (data.success && data.results?.[ticker]?.insights?.consensus) {
        setConsensus(data.results[ticker].insights.consensus);
      } else {
        setConsensus(null);
      }
    } catch (err) {
      console.error('Error loading analyst insights:', err);
      setError('Error loading analyst insights');
      
      // Try to use stale cache data as fallback
      const staleData = analystCache.get(CACHE_KEYS.ANALYST_INSIGHTS(ticker));
      if ((staleData as any)?.success && (staleData as any).results?.[ticker]?.insights?.consensus) {
        console.log('Using stale cache data as fallback');
        setConsensus((staleData as any).results[ticker].insights.consensus);
        setError('Using cached data (may be outdated)');
      }
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    loadAnalystInsights();
  }, [loadAnalystInsights]);

  const formatCurrency = (value: number | undefined, isRevenue = false) => {
    if (!value) return 'N/A';
    if (isRevenue) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatLastUpdated = (updatedAt: any) => {
    if (!updatedAt) return 'Never';
    
    let date: Date;
    if (updatedAt._seconds) {
      // Firestore timestamp
      date = new Date(updatedAt._seconds * 1000);
    } else if (updatedAt.toDate) {
      // Firestore timestamp object
      date = updatedAt.toDate();
    } else {
      date = new Date(updatedAt);
    }
    
    return date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        <button 
          onClick={loadAnalystInsights}
          className="mt-2 text-red-600 dark:text-red-400 text-xs hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
          <span className="text-lg mr-2">📊</span>
          Analyst Insights
        </h4>
        <button
          onClick={loadAnalystInsights}
          disabled={loading}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
          title="Refresh insights"
        >
          <span className={`text-sm ${loading ? 'animate-spin' : ''}`}>🔄</span>
          <span className="ml-1 text-xs">Refresh</span>
        </button>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
        Analyst Insights - {ticker}<br />
        {companyName}
      </div>

      {consensus ? (
        <div className="space-y-4">
          {/* Overall Rating Summary */}
          {consensus.rating && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Overall Consensus
                </h5>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  consensus.rating === 'Strong Buy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  consensus.rating === 'Buy' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                  consensus.rating === 'Hold' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  consensus.rating === 'Sell' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                  consensus.rating === 'Strong Sell' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {consensus.rating === 'Strong Buy' ? '🚀' :
                   consensus.rating === 'Buy' ? '📈' :
                   consensus.rating === 'Hold' ? '⚖️' :
                   consensus.rating === 'Sell' ? '📉' :
                   consensus.rating === 'Strong Sell' ? '⛔' : '📊'} {consensus.rating}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Based on analysis from {consensus.rating_distribution ? 
                  (consensus.rating_distribution.buy || 0) + (consensus.rating_distribution.hold || 0) + (consensus.rating_distribution.sell || 0)
                  : 'multiple'} analyst{consensus.rating_distribution && 
                  ((consensus.rating_distribution.buy || 0) + (consensus.rating_distribution.hold || 0) + (consensus.rating_distribution.sell || 0)) !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Consensus Estimates */}
          <div>
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Consensus Estimates
            </h5>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">EPS Estimate:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(consensus.eps_estimate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Revenue Estimate:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(consensus.revenue_estimate, true)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Price Target:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(consensus.avg_price_target)}
                </span>
              </div>
            </div>
          </div>

          {/* Analyst Distribution */}
          {consensus.rating_distribution && (
            <div>
              <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Analyst Distribution:
              </h5>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Buy:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {consensus.rating_distribution.buy || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Hold:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {consensus.rating_distribution.hold || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Sell:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {consensus.rating_distribution.sell || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Financial Metrics */}
          <div>
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Financial Metrics
            </h5>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">EPS/Revenue Ratio:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {(consensus.eps_estimate && consensus.revenue_estimate) ? 
                    `${((consensus.eps_estimate / (consensus.revenue_estimate / 1000000000)) * 100).toFixed(3)}%` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Price/EPS Ratio:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {(consensus.avg_price_target && consensus.eps_estimate) ? 
                    `${(consensus.avg_price_target / consensus.eps_estimate).toFixed(1)}x` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Guidance */}
          <div>
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Guidance
            </h5>
            <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {consensus.guidance || 'No guidance available'}
            </div>
          </div>

          {/* Analyst Reaction */}
          <div>
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Analyst Reaction
            </h5>
            <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {consensus.analyst_reaction || 'No analyst reaction available'}
            </div>
          </div>

          {/* Sentiment Analysis */}
          <div>
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Sentiment Analysis
            </h5>
            <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {consensus.sentiment_analysis || 'No sentiment analysis available'}
            </div>
          </div>

          {/* Analyst Credibility */}
          {consensus.credibility_score && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Analyst Credibility
              </h5>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Credibility Score:</span>
                  <span className={`font-medium ${
                    consensus.credibility_score >= 0.8 ? 'text-green-600 dark:text-green-400' :
                    consensus.credibility_score >= 0.6 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {(consensus.credibility_score * 100).toFixed(0)}%
                  </span>
                </div>
                {consensus.weighted_rating && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Weighted Rating:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {consensus.weighted_rating}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Based on historical accuracy and track record
              </div>
            </div>
          )}

          {/* Analyst Confidence */}
          <div>
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Data Quality
            </h5>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {consensus.confidence ? `${(consensus.confidence * 100).toFixed(0)}%` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Analysts:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {consensus.rating_distribution ? 
                    (consensus.rating_distribution.buy || 0) + (consensus.rating_distribution.hold || 0) + (consensus.rating_distribution.sell || 0)
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Data Source:</span>
                <span className="font-medium text-gray-900 dark:text-white text-xs">
                  {consensus.dataSource?.replace('_', ' ').toUpperCase() || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {formatLastUpdated(consensus.updatedAt)}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No analyst consensus data available
          </p>
          <button
            onClick={loadAnalystInsights}
            className="mt-2 text-blue-600 dark:text-blue-400 text-xs hover:underline"
          >
            Refresh data
          </button>
        </div>
      )}
    </div>
  );
}