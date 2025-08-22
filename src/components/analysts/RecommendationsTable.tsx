'use client';

import { useState } from 'react';
import { AnalystRecommendation, AnalystEvaluation } from '@/lib/analysts/enhancedAnalystTracker';

interface RecommendationsTableProps {
  recommendations: AnalystRecommendation[];
  evaluations: AnalystEvaluation[];
}

export default function RecommendationsTable({ recommendations, evaluations }: RecommendationsTableProps) {
  const [sortBy, setSortBy] = useState<'date' | 'ticker' | 'outcome'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'BUY' | 'HOLD' | 'SELL'>('all');

  // Create evaluation lookup map
  const evaluationMap = new Map(evaluations.map(e => [e.recommendation_id, e]));

  // Filter and sort recommendations
  const filteredRecommendations = recommendations
    .filter(rec => filterBy === 'all' || rec.action === filterBy)
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'ticker':
          return a.ticker.localeCompare(b.ticker);
        case 'outcome':
          const evalA = evaluationMap.get(a.id);
          const evalB = evaluationMap.get(b.id);
          if (!evalA && !evalB) return 0;
          if (!evalA) return 1;
          if (!evalB) return -1;
          return evalA.outcome.localeCompare(evalB.outcome);
        default:
          return 0;
      }
    });

  const getActionBadge = (action: string) => {
    const badges = {
      BUY: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', icon: '📈' },
      HOLD: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200', icon: '⚖️' },
      SELL: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', icon: '📉' }
    };

    const badge = badges[action as keyof typeof badges];
    if (!badge) return null;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon} {action}
      </span>
    );
  };

  const getOutcomeBadge = (outcome: string) => {
    const badges = {
      CORRECT: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', icon: '✅' },
      NEUTRAL: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300', icon: '➖' },
      INCORRECT: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', icon: '❌' }
    };

    const badge = badges[outcome as keyof typeof badges];
    if (!badge) return null;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon} {outcome}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
        status === 'OPEN' 
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' 
          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
      }`}>
        {status === 'OPEN' ? '🟢' : '🔒'} {status}
      </span>
    );
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value > 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Recommendations ({recommendations.length})
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Actions</option>
            <option value="BUY">Buy Only</option>
            <option value="HOLD">Hold Only</option>
            <option value="SELL">Sell Only</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="date">Sort by Date</option>
            <option value="ticker">Sort by Ticker</option>
            <option value="outcome">Sort by Outcome</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Ticker</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Action</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Price</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Target</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Horizon</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Alpha</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecommendations.map((rec) => {
              const evaluation = evaluationMap.get(rec.id);
              
              return (
                <tr key={rec.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-3 px-4 text-gray-900 dark:text-white">
                    {new Date(rec.created_at).toLocaleDateString()}
                  </td>
                  
                  <td className="py-3 px-4">
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {rec.ticker}
                    </span>
                  </td>
                  
                  <td className="py-3 px-4">
                    {getActionBadge(rec.action)}
                  </td>
                  
                  <td className="py-3 px-4">
                    {getStatusBadge(rec.status)}
                  </td>
                  
                  <td className="py-3 px-4 text-gray-900 dark:text-white">
                    {formatPrice(rec.p0)}
                    {evaluation && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        → {formatPrice(evaluation.p1)}
                      </div>
                    )}
                  </td>
                  
                  <td className="py-3 px-4 text-gray-900 dark:text-white">
                    {rec.target_price ? formatPrice(rec.target_price) : '-'}
                  </td>
                  
                  <td className="py-3 px-4 text-gray-900 dark:text-white">
                    {rec.horizon_days}d
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {rec.benchmark}
                    </div>
                  </td>
                  
                  <td className="py-3 px-4">
                    {evaluation ? (
                      <span className={`font-medium ${
                        evaluation.alpha > 0 ? 'text-green-600 dark:text-green-400' :
                        evaluation.alpha < 0 ? 'text-red-600 dark:text-red-400' :
                        'text-gray-900 dark:text-white'
                      }`}>
                        {formatPercentage(evaluation.alpha)}
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">Pending</span>
                    )}
                  </td>
                  
                  <td className="py-3 px-4">
                    {evaluation ? getOutcomeBadge(evaluation.outcome) : (
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Pending</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredRecommendations.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No recommendations found matching the current filter.
          </div>
        )}
      </div>
    </div>
  );
}