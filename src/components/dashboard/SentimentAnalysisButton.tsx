'use client';

import { useState } from 'react';
import { analyzeSentimentForWatchlist } from '@/lib/services/sentimentClient';

interface SentimentAnalysisButtonProps {
  userId: string;
  onAnalysisComplete: () => void;
}

export default function SentimentAnalysisButton({ 
  userId, 
  onAnalysisComplete 
}: SentimentAnalysisButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState('');

  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    setMessage('');

    try {
      const result = await analyzeSentimentForWatchlist(userId);
      
      if (result.success) {
        setMessage(
          `✓ Analysis complete! ${result.successCount}/${result.totalProcessed} companies analyzed.`
        );
        onAnalysisComplete();
      } else {
        setMessage(`✗ ${result.message}`);
      }
      
      setTimeout(() => setMessage(''), 8000);
    } catch (error) {
      setMessage(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(''), 8000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <button
        onClick={handleAnalysis}
        disabled={isAnalyzing}
        className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white ${
          isAnalyzing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
        }`}
      >
        {isAnalyzing && (
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
        <span className="mr-1">🤖</span>
        {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
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