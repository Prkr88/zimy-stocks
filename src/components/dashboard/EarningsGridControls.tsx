'use client';

import { useState } from 'react';

export type SortOption = 'rating' | 'date_asc' | 'date_desc' | 'company_az' | 'company_za' | 'market_cap';
export type ViewMode = 'grid' | 'list';

interface EarningsGridControlsProps {
  sortBy: SortOption;
  viewMode: ViewMode;
  onSortChange: (sort: SortOption) => void;
  onViewModeChange: (mode: ViewMode) => void;
  totalCount: number;
  filteredCount: number;
}

export default function EarningsGridControls({
  sortBy,
  viewMode,
  onSortChange,
  onViewModeChange,
  totalCount,
  filteredCount,
}: EarningsGridControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions = [
    { value: 'rating' as SortOption, label: 'Analyst Rating', icon: '📊' },
    { value: 'date_asc' as SortOption, label: 'Date (Earliest First)', icon: '📅' },
    { value: 'date_desc' as SortOption, label: 'Date (Latest First)', icon: '📅' },
    { value: 'company_az' as SortOption, label: 'Company (A-Z)', icon: '🔤' },
    { value: 'company_za' as SortOption, label: 'Company (Z-A)', icon: '🔤' },
    { value: 'market_cap' as SortOption, label: 'Market Cap', icon: '💰' },
  ];

  const selectedSort = sortOptions.find(option => option.value === sortBy);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md" data-tour="grid-controls">
      {/* Left side - Title and count */}
      <div className="flex-1">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
          Upcoming Earnings 
          {filteredCount !== totalCount && (
            <span className="text-blue-600 dark:text-blue-400">
              ({filteredCount} of {totalCount})
            </span>
          )}
          {filteredCount === totalCount && (
            <span className="text-gray-500 dark:text-gray-400">
              ({totalCount})
            </span>
          )}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {sortBy === 'rating' 
            ? '📊 Sorted: Strong Buy → Buy → Hold → Sell → Strong Sell → No Rating'
            : `Sorted by ${selectedSort?.label || 'Default'}`
          }
        </p>
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center space-x-3">
        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="mr-2">{selectedSort?.icon}</span>
            Sort by
            <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center hover:bg-gray-100 dark:hover:bg-gray-600 ${
                      sortBy === option.value
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <span className="mr-3">{option.icon}</span>
                    {option.label}
                    {sortBy === option.value && (
                      <span className="ml-auto">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
            title="Grid View"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
            title="List View"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}