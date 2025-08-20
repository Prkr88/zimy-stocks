'use client';

import { useState } from 'react';
import { CompanyHistory, HistoricalInsight, HistoricalAlert } from '@/types';
import { format } from 'date-fns';

interface CompanyCardProps {
  company: CompanyHistory;
}

export default function CompanyCard({ company }: CompanyCardProps) {
  const [activeTab, setActiveTab] = useState<'insights' | 'events' | 'alerts'>('insights');

  const formatAccuracy = (accuracy?: number) => {
    if (accuracy === undefined) return 'Pending';
    return `${Math.round(accuracy * 100)}%`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900';
      case 'negative':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
      default:
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'earnings_release':
        return '📊';
      case 'sentiment_update':
        return '🤖';
      case 'watchlist_add':
        return '⭐';
      default:
        return '📝';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {company.ticker}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">{company.companyName}</p>
          </div>
          <div className="text-right text-sm text-gray-500 dark:text-gray-400">
            <p>Last updated: {format(new Date(company.updatedAt), 'MMM dd, yyyy')}</p>
            <p>{company.insights.length} insights • {company.events.length} events</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { id: 'insights', label: 'AI Insights', count: company.insights.length },
            { id: 'events', label: 'Events', count: company.events.length },
            { id: 'alerts', label: 'Alerts', count: company.alerts.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {company.insights.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No AI insights available for this company.
              </p>
            ) : (
              company.insights.map((insight, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(
                          insight.sentimentSignal.sentiment
                        )}`}
                      >
                        {insight.sentimentSignal.sentiment}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Score: {insight.sentimentSignal.sentimentScore.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-gray-500 dark:text-gray-400">
                        {format(new Date(insight.sentimentSignal.createdAt), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Accuracy: {formatAccuracy(insight.accuracy)}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    {insight.sentimentSignal.reasoning}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Confidence: {Math.round(insight.sentimentSignal.confidence * 100)}%</span>
                    {insight.actualOutcome && (
                      <span className="text-green-600 dark:text-green-400">
                        Outcome: {insight.actualOutcome}
                      </span>
                    )}
                  </div>
                  
                  {insight.notes && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                      <strong>Notes:</strong> {insight.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-3">
            {company.events.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No events recorded for this company.
              </p>
            ) : (
              company.events.map((event, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="text-2xl">{getEventTypeIcon(event.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {event.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(event.date), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    {Object.keys(event.data).length > 0 && (
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {Object.entries(event.data).map(([key, value]) => (
                          <span key={key} className="mr-4">
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {company.alerts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No alerts sent for this company.
              </p>
            ) : (
              company.alerts.map((alert, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          alert.alertHistory.status === 'sent'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : alert.alertHistory.status === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}
                      >
                        {alert.alertHistory.status}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {alert.alertHistory.type}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(alert.alertHistory.sentAt), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    {alert.alertHistory.message}
                  </p>
                  
                  {Object.keys(alert.context).length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <strong>Context:</strong> {JSON.stringify(alert.context, null, 2)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}