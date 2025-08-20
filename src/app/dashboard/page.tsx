'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import EarningsFilter, { FilterOptions } from '@/components/dashboard/EarningsFilter';
import EarningsGrid from '@/components/dashboard/EarningsGrid';
import DataRefreshButton from '@/components/dashboard/DataRefreshButton';
import SentimentAnalysisButton from '@/components/dashboard/SentimentAnalysisButton';
import NotificationSetup from '@/components/NotificationSetup';
import {
  getUpcomingEarnings,
  getLatestSignals,
  getUserWatchlists,
  addCompanyToWatchlist,
  removeCompanyFromWatchlist,
  createWatchlist,
} from '@/lib/firestore';
import type { EarningsEvent, SentimentSignal, Watchlist, WatchlistCompany } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [signals, setSignals] = useState<SentimentSignal[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    markets: [],
    sectors: [],
    searchTerm: '',
  });

  // Get all watchlisted tickers
  const watchlistedTickers = watchlists.flatMap(wl => wl.companies.map(c => c.ticker));

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load data in parallel
      const [eventsData, signalsData, watchlistsData] = await Promise.all([
        getUpcomingEarnings(undefined, undefined, 100),
        getLatestSignals(),
        getUserWatchlists(user!.uid),
      ]);

      setEvents(eventsData);
      setSignals(signalsData);
      setWatchlists(watchlistsData);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async (ticker: string, companyName: string, market: string, sector: string) => {
    try {
      let targetWatchlist = watchlists.find(wl => wl.name === 'Default');
      
      if (!targetWatchlist) {
        // Create default watchlist if it doesn't exist
        const watchlistId = await createWatchlist({
          userId: user!.uid,
          name: 'Default',
          companies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        targetWatchlist = {
          id: watchlistId,
          userId: user!.uid,
          name: 'Default',
          companies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        setWatchlists([...watchlists, targetWatchlist]);
      }

      const newCompany: WatchlistCompany = {
        ticker,
        companyName,
        market: market as 'SP500' | 'TA125',
        sector,
        addedAt: new Date(),
      };

      await addCompanyToWatchlist(targetWatchlist.id, newCompany);
      
      // Update local state
      setWatchlists(watchlists.map(wl => 
        wl.id === targetWatchlist!.id 
          ? { ...wl, companies: [...wl.companies, newCompany] }
          : wl
      ));
    } catch (err: any) {
      console.error('Error adding to watchlist:', err);
      setError('Failed to add company to watchlist.');
    }
  };

  const handleRemoveFromWatchlist = async (ticker: string) => {
    try {
      const targetWatchlist = watchlists.find(wl => 
        wl.companies.some(c => c.ticker === ticker)
      );
      
      if (targetWatchlist) {
        await removeCompanyFromWatchlist(targetWatchlist.id, ticker);
        
        // Update local state
        setWatchlists(watchlists.map(wl => 
          wl.id === targetWatchlist.id 
            ? { ...wl, companies: wl.companies.filter(c => c.ticker !== ticker) }
            : wl
        ));
      }
    } catch (err: any) {
      console.error('Error removing from watchlist:', err);
      setError('Failed to remove company from watchlist.');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Navbar />
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Earnings Dashboard
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Track upcoming earnings with AI-powered sentiment insights
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <SentimentAnalysisButton 
                  userId={user!.uid} 
                  onAnalysisComplete={loadDashboardData} 
                />
                <DataRefreshButton onRefreshComplete={loadDashboardData} />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <NotificationSetup />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900 dark:border-red-700 dark:text-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <EarningsFilter
                onFilterChange={setFilters}
                initialFilters={filters}
              />
              
              {/* Watchlist Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Your Watchlist
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {watchlistedTickers.length} companies tracked
                </div>
                {watchlistedTickers.slice(0, 5).map(ticker => (
                  <div key={ticker} className="flex items-center justify-between py-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {ticker}
                    </span>
                    <button
                      onClick={() => handleRemoveFromWatchlist(ticker)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {watchlistedTickers.length > 5 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    +{watchlistedTickers.length - 5} more
                  </div>
                )}
              </div>
            </div>
            
            <div className="lg:col-span-3">
              <EarningsGrid
                events={events}
                signals={signals}
                watchlistedTickers={watchlistedTickers}
                filters={filters}
                onAddToWatchlist={handleAddToWatchlist}
                onRemoveFromWatchlist={handleRemoveFromWatchlist}
              />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}