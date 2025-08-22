'use client';

import { useState } from 'react';
import { Analyst } from '@/lib/analysts/enhancedAnalystTracker';

interface AnalystProfileCardProps {
  analyst: Analyst;
  performance: {
    winRate: number;
    avgAlpha: number;
    callsByAction: Record<string, number>;
    outcomesByAction: Record<string, Record<string, number>>;
  };
}

export default function AnalystProfileCard({ analyst, performance }: AnalystProfileCardProps) {
  const getTierBadge = (tier: string, score: number) => {
    const badgeClasses = {
      TOP_TIER: 'bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-200',
      RISING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      NEW: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };

    const tierLabels = {
      TOP_TIER: '🏆 Top Tier',
      RISING: '📈 Rising',
      NEW: '🆕 New'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
        badgeClasses[tier as keyof typeof badgeClasses] || badgeClasses.NEW
      }`}>
        {tierLabels[tier as keyof typeof tierLabels] || '🆕 New'} ({score})
      </span>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 65) return 'text-blue-600 dark:text-blue-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {analyst.name}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-3">
            {analyst.firm}
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {getTierBadge(analyst.tier || 'NEW', analyst.score)}
            {analyst.specializations && analyst.specializations.length > 0 && (
              <div className="flex gap-1">
                {analyst.specializations.map((spec, index) => (
                  <span key={index} className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-1 rounded text-xs">
                    {spec}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-3xl font-bold mb-1">
            <span className={getScoreColor(analyst.score)}>
              {analyst.score.toFixed(0)}
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Credibility Score
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Win Rate</div>
          <div className="text-xl font-semibold text-gray-900 dark:text-white">
            {formatPercentage(performance.winRate)}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Alpha</div>
          <div className={`text-xl font-semibold ${
            performance.avgAlpha > 0 ? 'text-green-600 dark:text-green-400' : 
            performance.avgAlpha < 0 ? 'text-red-600 dark:text-red-400' : 
            'text-gray-900 dark:text-white'
          }`}>
            {performance.avgAlpha > 0 ? '+' : ''}{formatPercentage(performance.avgAlpha)}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Calls</div>
          <div className="text-xl font-semibold text-gray-900 dark:text-white">
            {analyst.lifetime_calls}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Member Since</div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {new Date(analyst.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Call Distribution */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Call Distribution
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(performance.callsByAction).map(([action, count]) => (
            <div key={action} className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                action === 'BUY' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                action === 'SELL' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}>
                {action === 'BUY' ? '📈' : action === 'SELL' ? '📉' : '⚖️'} {action}
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {count}
              </div>
              
              {/* Show outcomes for this action */}
              {performance.outcomesByAction[action] && (
                <div className="mt-2 text-xs">
                  {Object.entries(performance.outcomesByAction[action]).map(([outcome, outcomeCount]) => (
                    <div key={outcome} className={`inline-block mr-2 ${
                      outcome === 'CORRECT' ? 'text-green-600 dark:text-green-400' :
                      outcome === 'INCORRECT' ? 'text-red-600 dark:text-red-400' :
                      'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {outcome}: {outcomeCount}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4 border-t border-gray-200 dark:border-gray-700">
        Last updated: {new Date(analyst.updated_at).toLocaleString()}
      </div>
    </div>
  );
}