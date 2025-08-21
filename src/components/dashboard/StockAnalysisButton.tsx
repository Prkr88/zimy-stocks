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

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setMessage('');

    try {
      const response = await fetch(`/api/stocks/${ticker}/analyst-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'refresh'
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Analysis complete!');
        if (onAnalysisComplete) {
          onAnalysisComplete();
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      console.error(`Analysis error for ${ticker}:`, error);
      setMessage('❌ Analysis failed');
      
      // Clear error message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        className="inline-flex items-center justify-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/30"
      >
        {isAnalyzing ? (
          <>
            <div className="animate-spin -ml-1 mr-1 h-3 w-3 border border-blue-600 border-t-transparent rounded-full"></div>
            Analyzing...
          </>
        ) : (
          <>
            <span className="mr-1">🔍</span>
            Analyze
          </>
        )}
      </button>
      
      {message && (
        <div className={`text-xs text-center ${message.startsWith('✅') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {message}
        </div>
      )}
    </div>
  );
}