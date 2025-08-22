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
      setCurrentStep('Updating S&P 500 tech sector companies (may take a few minutes)...');
      
      // Use a longer timeout for tech sector update (10 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes
      
      try {
        const techSectorResponse = await fetch('/api/earnings/tech-sector', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update-tech-sector'
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!techSectorResponse.ok) {
          throw new Error('Failed to update tech sector companies');
        }

        const techSectorData = await techSectorResponse.json();
        console.log('Tech sector update completed:', techSectorData);

        setMessage(`✅ Tech sector update completed! Found ${techSectorData.result.summary.totalTechCompanies} tech companies, ${techSectorData.result.summary.companiesWithUpcomingEarnings} with upcoming earnings in next 60 days.`);
        setLastUpdate(new Date());
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Update timed out - this can happen with large datasets. Try refreshing individual companies instead.');
        }
        throw fetchError;
      }
      
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
            Update Database
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