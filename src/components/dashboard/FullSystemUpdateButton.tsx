'use client';

import { useState } from 'react';

interface FullSystemUpdateButtonProps {
  onUpdateComplete?: () => void;
}

export default function FullSystemUpdateButton({ 
  onUpdateComplete 
}: FullSystemUpdateButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [message, setMessage] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleFullSystemUpdate = async () => {
    setIsUpdating(true);
    setMessage('');

    try {
      // Step 1: Update earnings calendar with S&P 500 tech sector intelligent filtering
      setCurrentStep('Fetching S&P 500 tech sector companies...');
      const techSectorResponse = await fetch('/api/earnings/tech-sector', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-tech-sector'
        })
      });

      if (!techSectorResponse.ok) {
        throw new Error('Failed to update tech sector companies');
      }

      const techSectorData = await techSectorResponse.json();
      console.log('Tech sector update completed:', techSectorData);

      // Step 2: Extract companies that need analysis (upcoming earnings)
      setCurrentStep('Identifying companies for analysis...');
      const tickers = techSectorData.result.companiesForAnalysis;

      if (tickers.length === 0) {
        // No companies need analysis - this is a valid scenario
        setMessage(`✅ Tech sector update completed! Found ${techSectorData.result.summary.totalTechCompanies} tech companies, ${techSectorData.result.summary.companiesWithUpcomingEarnings} with upcoming earnings in next 30 days. No companies currently need analysis (all earnings are outside the 30-day window).`);
        setLastUpdate(new Date());
        
        if (onUpdateComplete) {
          onUpdateComplete();
        }
        return;
      }

      // Step 3: Update analyst insights for current stocks
      setCurrentStep(`Analyzing ${tickers.length} stocks: ${tickers.join(', ')}...`);
      const insightsResponse = await fetch('/api/analyst-insights/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tickers,
          action: 'refresh',
          updateConsensus: true,
          updateEarnings: true,
          updateSentiment: true,
          maxConcurrent: 2
        })
      });

      if (!insightsResponse.ok) {
        throw new Error('Failed to update analyst insights');
      }

      const insightsData = await insightsResponse.json();
      
      setMessage(`✅ Tech sector update completed! Found ${techSectorData.result.summary.totalTechCompanies} tech companies, ${techSectorData.result.summary.companiesWithUpcomingEarnings} with upcoming earnings. Analyzed ${insightsData.results.summary.successful}/${insightsData.results.summary.total} companies with upcoming earnings successfully.`);
      setLastUpdate(new Date());
      
      if (onUpdateComplete) {
        onUpdateComplete();
      }
    } catch (error) {
      console.error('Full system update error:', error);
      setMessage(`❌ Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleFullSystemUpdate}
        disabled={isUpdating}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUpdating ? (
          <>
            <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            <span className="mr-2">🔄</span>
            Updating...
          </>
        ) : (
          <>
            <span className="mr-2">🏗️</span>
            Tech Sector Analysis
          </>
        )}
      </button>
      
      {currentStep && (
        <div className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">
          {currentStep}
        </div>
      )}
      
      {message && (
        <div className={`text-xs ${message.startsWith('✅') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {message}
        </div>
      )}
      
      {lastUpdate && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}