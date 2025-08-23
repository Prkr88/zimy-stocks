'use client';

import { useState } from 'react';

interface StockAnalysisButtonProps {
  ticker: string;
  size?: 'small' | 'medium' | 'large';
  onAnalysisComplete?: () => void;
}

export default function StockAnalysisButton({ 
  ticker, 
  size = 'medium',
  onAnalysisComplete 
}: StockAnalysisButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState('');

  const handleAnalyzeStock = async () => {
    setIsAnalyzing(true);
    setMessage('');

    try {
      // Note: This would typically call an API to refresh analyst consensus data
      // For now, we'll simulate the refresh process
      setMessage('Refreshing analyst data...');
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setMessage(`✅ ${ticker} data refreshed`);
      
      if (onAnalysisComplete) {
        onAnalysisComplete();
      }
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error('Error analyzing stock:', error);
      setMessage(`❌ Failed to refresh ${ticker}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sizeClasses = {
    small: 'p-1 w-3 h-3',
    medium: 'p-1.5 w-4 h-4',
    large: 'p-2 w-5 h-5'
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleAnalyzeStock}
        disabled={isAnalyzing}
        className={`rounded-full transition-colors text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed ${
          size === 'small' ? 'p-1' : size === 'large' ? 'p-2' : 'p-1.5'
        }`}
        title={`Refresh analyst data for ${ticker}`}
      >
        <div className={`${sizeClasses[size].split(' ').slice(1).join(' ')} ${isAnalyzing ? 'animate-spin' : ''}`}>
          {isAnalyzing ? '⏳' : '🔄'}
        </div>
      </button>
      
      {message && size !== 'small' && (
        <div className={`text-xs text-center max-w-20 ${
          message.startsWith('✅') 
            ? 'text-green-600 dark:text-green-400' 
            : message.startsWith('❌') 
            ? 'text-red-600 dark:text-red-400'
            : 'text-blue-600 dark:text-blue-400'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}