'use client';

import { useState } from 'react';
import { refreshEarningsData } from '@/lib/services/dataFetcher';

interface DataRefreshButtonProps {
  onRefreshComplete: () => void;
}

export default function DataRefreshButton({ onRefreshComplete }: DataRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState('');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setMessage('');

    try {
      const result = await refreshEarningsData(30);
      
      if (result.success) {
        setMessage(`✓ Refreshed! Found ${result.eventsCount} earnings events.`);
        onRefreshComplete();
      } else {
        setMessage(`✗ ${result.message}`);
      }
      
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white ${
          isRefreshing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
        }`}
      >
        {isRefreshing && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
      </button>
      
      {message && (
        <span className={`text-sm ${
          message.startsWith('✓') 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-red-600 dark:text-red-400'
        }`}>
          {message}
        </span>
      )}
    </div>
  );
}