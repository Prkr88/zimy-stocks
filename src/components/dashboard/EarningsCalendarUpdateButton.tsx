'use client';

import { useState } from 'react';

interface EarningsCalendarUpdateButtonProps {
  onUpdateComplete?: () => void;
}

export default function EarningsCalendarUpdateButton({ 
  onUpdateComplete 
}: EarningsCalendarUpdateButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setMessage('');

    try {
      const response = await fetch('/api/earnings/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          useWebSearch: true,
          updateDatabase: true,
          limit: 30 // Fetch earnings for top 30 S&P 500 companies
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const result = data.result;
        setMessage(
          `✓ Calendar updated! ${result.created} created, ${result.updated} updated${result.errors > 0 ? `, ${result.errors} errors` : ''}.`
        );
        setLastUpdate(new Date());
        onUpdateComplete?.();
      } else {
        setMessage(`✗ ${data.result?.message || 'Update failed'}`);
      }
      
      setTimeout(() => setMessage(''), 8000);
    } catch (error) {
      console.error('Earnings calendar update error:', error);
      setMessage(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(''), 8000);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePreview = async () => {
    try {
      const response = await fetch('/api/earnings/calendar?action=preview');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const preview = data.preview;
        setMessage(
          `📊 Preview: ${preview.combinedResults} total earnings found (${preview.polygonResults} from Polygon, ${preview.webResults} from web)`
        );
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('Preview error:', error);
      setMessage(`✗ Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="flex space-x-2">
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white ${
            isUpdating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {isUpdating && (
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
          <span className="mr-1">📅</span>
          {isUpdating ? 'Updating...' : 'Update Earnings'}
        </button>

        <button
          onClick={handlePreview}
          disabled={isUpdating}
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          <span className="mr-1">👁️</span>
          Preview
        </button>
      </div>
      
      {message && (
        <div className="flex items-center">
          <span className={`text-sm ${
            message.startsWith('✓') 
              ? 'text-green-600 dark:text-green-400' 
              : message.startsWith('📊')
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {message}
          </span>
        </div>
      )}
      
      {lastUpdate && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Last: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}