'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import CacheStatusIndicator from '@/components/cache/CacheStatusIndicator';
import { cachedFetch, CACHE_KEYS } from '@/lib/cache/browserCache';

interface AnalystProfile {
  id: string;
  name: string;
  firm: string;
  current_score: number;
  accuracy_rate: number;
  total_recommendations: number;
  sectors: string[];
  recent_recommendations: number;
  performance_metrics: {
    win_rate: number;
    avg_return: string;
    best_pick: string;
    worst_pick: string;
    streak: number;
    score_trend: 'up' | 'down' | 'stable';
    specialization: string;
  };
  rank: number;
  rank_change: number;
  tier: {
    name: string;
    color: string;
    icon: string;
  };
  avatar: string;
  last_updated: any;
  joined_date: any;
}

interface AnalystsResponse {
  success: boolean;
  analysts: AnalystProfile[];
  total_count: number;
  filters: {
    orderBy: string;
    limit: number;
    sector?: string;
  };
}

export default function AnalystsPage() {
  const { user } = useAuth();
  const [analysts, setAnalysts] = useState<AnalystProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderBy, setOrderBy] = useState<'score' | 'accuracy' | 'total_recommendations' | 'recent_performance'>('score');
  const [selectedSector, setSelectedSector] = useState<string>('');

  const loadAnalysts = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        orderBy,
        limit: '50'
      });
      
      if (selectedSector) {
        params.append('sector', selectedSector);
      }
      
      const data: AnalystsResponse = await cachedFetch(
        `/api/analysts?${params.toString()}`,
        {
          cacheKey: CACHE_KEYS.ANALYST_LEADERBOARD(orderBy, selectedSector || 'all'),
          ttl: 5 * 60 * 1000 // 5 minutes cache
        }
      );
      
      if (data.success) {
        setAnalysts(data.analysts);
      } else {
        setError('Failed to load analysts data');
      }
    } catch (err) {
      console.error('Error loading analysts:', err);
      setError('Failed to load analysts data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysts();
  }, [orderBy, selectedSector]);

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getRankChangeIcon = (change: number) => {
    if (change > 0) return '⬆️';
    if (change < 0) return '⬇️';
    return '➡️';
  };

  const availableSectors = [
    'Technology',
    'Healthcare', 
    'Financial Services',
    'Consumer Cyclical',
    'Communication Services',
    'Industrials',
    'Consumer Defensive',
    'Energy',
    'Utilities',
    'Real Estate',
    'Materials',
    'Basic Materials'
  ];

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Navbar />
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Analyst Leaderboard
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Track record and performance rankings of financial analysts
                </p>
              </div>
              <CacheStatusIndicator showDetails={true} />
            </div>
          </div>

          {/* Controls */}
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort by
                </label>
                <select
                  value={orderBy}
                  onChange={(e) => setOrderBy(e.target.value as any)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="score">Elo Score</option>
                  <option value="accuracy">Accuracy Rate</option>
                  <option value="total_recommendations">Total Recommendations</option>
                  <option value="recent_performance">Recent Performance</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sector Filter
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Sectors</option>
                  {availableSectors.map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
              <button 
                onClick={loadAnalysts}
                className="ml-4 text-red-600 hover:text-red-800 underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Analysts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {analysts.map((analyst) => (
              <div
                key={analyst.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <img
                      src={analyst.avatar}
                      alt={analyst.name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {analyst.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {analyst.firm}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      #{analyst.rank}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      {getRankChangeIcon(analyst.rank_change)}
                      {analyst.rank_change !== 0 && Math.abs(analyst.rank_change)}
                    </div>
                  </div>
                </div>

                {/* Tier Badge */}
                <div className="mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${analyst.tier.color}`}>
                    {analyst.tier.icon} {analyst.tier.name}
                  </span>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {analyst.current_score}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center">
                      Elo Score {getTrendIcon(analyst.performance_metrics.score_trend)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {analyst.performance_metrics.win_rate}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Win Rate
                    </div>
                  </div>
                </div>

                {/* Performance Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Calls:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {analyst.total_recommendations}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Avg Return:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {analyst.performance_metrics.avg_return}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Streak:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {analyst.performance_metrics.streak}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Specialization:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {analyst.performance_metrics.specialization}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Since {formatDate(analyst.joined_date)}</span>
                    <span>{analyst.recent_recommendations} recent calls</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {analysts.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-600 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No analysts found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Try adjusting your filters or check back later.
              </p>
            </div>
          )}

          {/* Summary Stats */}
          {analysts.length > 0 && (
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Leaderboard Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {analysts.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Analysts
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {Math.round(analysts.reduce((sum, a) => sum + a.current_score, 0) / analysts.length)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Avg Score
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {Math.round(analysts.reduce((sum, a) => sum + a.performance_metrics.win_rate, 0) / analysts.length)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Avg Win Rate
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {analysts.reduce((sum, a) => sum + a.total_recommendations, 0)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Calls
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}