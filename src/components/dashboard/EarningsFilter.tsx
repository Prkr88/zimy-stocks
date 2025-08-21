'use client';

import { useState } from 'react';

export interface FilterOptions {
  markets: string[];
  sectors: string[];
  searchTerm: string;
}

interface EarningsFilterProps {
  onFilterChange: (filters: FilterOptions) => void;
  initialFilters: FilterOptions;
}

const AVAILABLE_MARKETS = ['SP500', 'TA125'];
const AVAILABLE_SECTORS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Discretionary',
  'Communication Services',
  'Industrials',
  'Consumer Staples',
  'Energy',
  'Utilities',
  'Real Estate',
  'Materials',
];

export default function EarningsFilter({ onFilterChange, initialFilters }: EarningsFilterProps) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);

  const handleMarketChange = (market: string, checked: boolean) => {
    const updatedMarkets = checked
      ? [...filters.markets, market]
      : filters.markets.filter(m => m !== market);
    
    const newFilters = { ...filters, markets: updatedMarkets };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSectorChange = (sector: string, checked: boolean) => {
    const updatedSectors = checked
      ? [...filters.sectors, sector]
      : filters.sectors.filter(s => s !== sector);
    
    const newFilters = { ...filters, sectors: updatedSectors };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSearchChange = (searchTerm: string) => {
    const newFilters = { ...filters, searchTerm };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = { markets: [], sectors: [], searchTerm: '' };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 lg:p-6 mb-6 min-w-0 overflow-hidden">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Filters</h3>
      
      {/* Search */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Search Companies
        </label>
        <input
          type="text"
          value={filters.searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search companies..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 text-sm"
        />
      </div>

      {/* Markets */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Markets
        </label>
        <div className="space-y-2">
          {AVAILABLE_MARKETS.map(market => (
            <label key={market} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded min-w-0">
              <input
                type="checkbox"
                checked={filters.markets.includes(market)}
                onChange={(e) => handleMarketChange(market, e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-0.5 flex-shrink-0"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 leading-tight truncate">
                {market === 'SP500' ? 'S&P 500' : 'TA-125'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Sectors */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sectors
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {AVAILABLE_SECTORS.map(sector => (
            <label key={sector} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded min-w-0">
              <input
                type="checkbox"
                checked={filters.sectors.includes(sector)}
                onChange={(e) => handleSectorChange(sector, e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-0.5 flex-shrink-0"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 leading-tight break-words line-clamp-2 min-w-0">
                {sector}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      <button
        onClick={clearFilters}
        className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
      >
        Clear All Filters
      </button>
    </div>
  );
}