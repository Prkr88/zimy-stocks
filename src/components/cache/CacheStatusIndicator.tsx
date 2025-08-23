'use client';

import { useState, useEffect } from 'react';
import { analystCache } from '@/lib/cache/browserCache';

interface CacheStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export default function CacheStatusIndicator({ 
  className = '', 
  showDetails = false 
}: CacheStatusIndicatorProps) {
  const [stats, setStats] = useState({
    size: 0,
    entries: [] as Array<{ key: string; age: number; size: number }>
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setStats(analystCache.getStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const formatAge = (age: number) => {
    const minutes = Math.floor(age / (1000 * 60));
    const seconds = Math.floor((age % (1000 * 60)) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const formatSize = (size: number) => {
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getTotalCacheSize = () => {
    return stats.entries.reduce((total, entry) => total + entry.size, 0);
  };

  const clearCache = () => {
    analystCache.clear();
    setStats({ size: 0, entries: [] });
  };

  if (!showDetails) {
    return (
      <div className={`inline-flex items-center space-x-1 text-xs ${className}`}>
        <div className={`w-2 h-2 rounded-full ${
          stats.size > 0 
            ? 'bg-green-500 animate-pulse' 
            : 'bg-gray-400'
        }`}></div>
        <span className="text-gray-600 dark:text-gray-400">
          Cache: {stats.size} items
        </span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center space-x-2 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <div className={`w-2 h-2 rounded-full ${
          stats.size > 0 
            ? 'bg-green-500' 
            : 'bg-gray-400'
        }`}></div>
        <span className="text-gray-700 dark:text-gray-300">
          Cache ({stats.size})
        </span>
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Cache Status
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Entries:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                  {stats.size}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Size:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                  {formatSize(getTotalCacheSize())}
                </span>
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {stats.entries.length > 0 ? (
              <div className="p-2">
                {stats.entries.map((entry, index) => (
                  <div 
                    key={entry.key} 
                    className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium text-gray-900 dark:text-white">
                        {entry.key.replace(/^analyst_|_\w+$/g, '')}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {formatAge(entry.age)} • {formatSize(entry.size)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        analystCache.delete(entry.key);
                        setStats(analystCache.getStats());
                      }}
                      className="ml-2 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      title="Delete cache entry"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-xs">
                No cached data
              </div>
            )}
          </div>

          {stats.size > 0 && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={clearCache}
                className="w-full px-3 py-1 text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
              >
                Clear All Cache
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}