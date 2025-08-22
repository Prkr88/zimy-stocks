'use client';

import { useState } from 'react';

interface StockAnalysisButtonProps {
  ticker: string;
  onAnalysisComplete?: () => void;
}

export default function StockAnalysisButton({ 
  ticker, 
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

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleAnalyzeStock}
        disabled={isAnalyzing}
        className="p-1.5 rounded-full transition-colors text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
        title={`Refresh analyst data for ${ticker}`}
      >
        <div className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`}>
          {isAnalyzing ? '⏳' : '🔄'}
        </div>
      </button>
      
      {message && (
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