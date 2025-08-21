'use client';

import { useState, useEffect, useCallback } from 'react';

interface AnalystConsensus {
  eps_estimate: number | null;
  revenue_estimate: number | null;
  avg_price_target: number | null;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' | null;
  rating_distribution: {
    buy: number;
    hold: number;
    sell: number;
  };
}

interface EarningsSummary {
  revenue_expected: number | null;
  revenue_actual: number | null;
  revenue_result: 'Beat' | 'Miss' | 'Inline' | 'Unknown';
  eps_expected: number | null;
  eps_actual: number | null;
  eps_result: 'Beat' | 'Miss' | 'Inline' | 'Unknown';
  guidance: string | null;
  analyst_reaction: string | null;
  market_reaction: string | null;
}

interface SentimentAnalysis {
  sentiment_score: 'Bullish' | 'Neutral' | 'Bearish';
  confidence: number;
  top_quotes: string[];
  analyst_rating_sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
  news_sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
  social_sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
}

interface AnalystInsightsCardProps {
  ticker: string;
  companyName?: string;
}

export default function AnalystInsightsCard({ ticker, companyName }: AnalystInsightsCardProps) {
  const [insights, setInsights] = useState<{
    consensus: AnalystConsensus | null;
    earnings: EarningsSummary | null;
    sentiment: SentimentAnalysis | null;
  }>({
    consensus: null,
    earnings: null,
    sentiment: null
  });
  const [loading, setLoading] = useState(true); // Start as true to prevent hydration mismatch
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  const loadInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/stocks/${ticker}/analyst-insights`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setInsights({
          consensus: data.insights.consensus,
          earnings: data.insights.earnings,
          sentiment: data.insights.sentiment
        });
        setLastUpdated(new Date());
      } else {
        setError('Failed to load analyst insights');
      }
    } catch (error) {
      console.error('Error loading analyst insights:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    setMounted(true);
    loadInsights();
  }, [ticker, loadInsights]);

  const refreshInsights = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/stocks/${ticker}/analyst-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'refresh' })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Reload the data after refresh
        await loadInsights();
      } else {
        setError('Failed to refresh analyst insights');
      }
    } catch (error) {
      console.error('Error refreshing insights:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null, isRevenue = false) => {
    if (value === null) return 'N/A';
    
    if (isRevenue) {
      // Format revenue in billions/millions
      if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(1)}B`;
      } else if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(1)}M`;
      }
      return `$${value.toLocaleString()}`;
    } else {
      // Format EPS/price target
      return `$${value.toFixed(2)}`;
    }
  };

  const getRatingColor = (rating: string | null) => {
    switch (rating) {
      case 'Strong Buy':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'Buy':
        return 'text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'Hold':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'Sell':
        return 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'Strong Sell':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'Beat':
        return 'text-green-600 dark:text-green-400';
      case 'Miss':
        return 'text-red-600 dark:text-red-400';
      case 'Inline':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Bullish':
      case 'Positive':
        return 'text-green-600 dark:text-green-400';
      case 'Bearish':
      case 'Negative':
        return 'text-red-600 dark:text-red-400';
      case 'Neutral':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Analyst Insights - {ticker}
          </h3>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
        <div className="text-gray-600 dark:text-gray-400">Loading analyst insights...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Analyst Insights - {ticker}
          </h3>
          {companyName && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{companyName}</p>
          )}
        </div>
        <button
          onClick={refreshInsights}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
        >
          <span className="mr-1">🔄</span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900 dark:border-red-700 dark:text-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analyst Consensus */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Consensus Estimates</h4>
          
          {insights.consensus ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">EPS Estimate:</span>
                <span className="text-sm font-medium">{formatCurrency(insights.consensus.eps_estimate)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Revenue Estimate:</span>
                <span className="text-sm font-medium">{formatCurrency(insights.consensus.revenue_estimate, true)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Price Target:</span>
                <span className="text-sm font-medium">{formatCurrency(insights.consensus.avg_price_target)}</span>
              </div>
              
              {insights.consensus.rating && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Rating:</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${getRatingColor(insights.consensus.rating)}`}>
                    {insights.consensus.rating}
                  </span>
                </div>
              )}
              
              {insights.consensus.rating_distribution && (
                <div className="mt-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Analyst Distribution:</span>
                  <div className="mt-1 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Buy: {insights.consensus.rating_distribution.buy}</span>
                      <span>Hold: {insights.consensus.rating_distribution.hold}</span>
                      <span>Sell: {insights.consensus.rating_distribution.sell}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">No consensus data available</div>
          )}
        </div>

        {/* Earnings Results */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Earnings vs Estimates</h4>
          
          {insights.earnings ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">EPS:</span>
                  <div className="text-right">
                    <div className="text-sm">
                      {formatCurrency(insights.earnings.eps_actual)} vs {formatCurrency(insights.earnings.eps_expected)}
                    </div>
                    <div className={`text-xs font-medium ${getResultColor(insights.earnings.eps_result)}`}>
                      {insights.earnings.eps_result}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Revenue:</span>
                  <div className="text-right">
                    <div className="text-sm">
                      {formatCurrency(insights.earnings.revenue_actual, true)} vs {formatCurrency(insights.earnings.revenue_expected, true)}
                    </div>
                    <div className={`text-xs font-medium ${getResultColor(insights.earnings.revenue_result)}`}>
                      {insights.earnings.revenue_result}
                    </div>
                  </div>
                </div>
              </div>
              
              {insights.earnings.guidance && (
                <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                  <strong>Guidance:</strong> {insights.earnings.guidance}
                </div>
              )}
              
              {insights.earnings.analyst_reaction && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                  <strong>Analyst Reaction:</strong> {insights.earnings.analyst_reaction}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">No earnings comparison available</div>
          )}
        </div>

        {/* Sentiment Analysis */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Sentiment Analysis</h4>
          
          {insights.sentiment ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Overall:</span>
                <span className={`text-sm font-medium ${getSentimentColor(insights.sentiment.sentiment_score)}`}>
                  {insights.sentiment.sentiment_score}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Confidence:</span>
                <span className="text-sm font-medium">{(insights.sentiment.confidence * 100).toFixed(0)}%</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-gray-600 dark:text-gray-400">Analyst</div>
                  <div className={getSentimentColor(insights.sentiment.analyst_rating_sentiment)}>
                    {insights.sentiment.analyst_rating_sentiment}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600 dark:text-gray-400">News</div>
                  <div className={getSentimentColor(insights.sentiment.news_sentiment)}>
                    {insights.sentiment.news_sentiment}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600 dark:text-gray-400">Social</div>
                  <div className={getSentimentColor(insights.sentiment.social_sentiment)}>
                    {insights.sentiment.social_sentiment}
                  </div>
                </div>
              </div>
              
              {insights.sentiment.top_quotes && insights.sentiment.top_quotes.length > 0 && (
                <div className="mt-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Key Quotes:</span>
                  <div className="mt-1 space-y-1">
                    {insights.sentiment.top_quotes.slice(0, 2).map((quote, index) => (
                      <div key={index} className="text-xs italic text-gray-700 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        &ldquo;{quote}&rdquo;
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">No sentiment analysis available</div>
          )}
        </div>
      </div>

      {lastUpdated && mounted && (
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}