'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import EarningsFilter, { FilterOptions } from '@/components/dashboard/EarningsFilter';
import EnhancedEarningsGrid from '@/components/dashboard/EnhancedEarningsGrid';
import InteractiveWatchlistSummary from '@/components/dashboard/InteractiveWatchlistSummary';
import OnboardingTour from '@/components/ui/OnboardingTour';
import CacheStatusIndicator from '@/components/cache/CacheStatusIndicator';
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
  const [highlightedTicker, setHighlightedTicker] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user is new or tour is requested via URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const startTour = urlParams.get('startTour');
    const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');
    
    if ((startTour === 'true' || !hasSeenTour) && user) {
      setShowOnboarding(true);
      // Clean up URL parameter
      if (startTour) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [user]);

  // Get all watchlisted tickers
  const watchlistedTickers = watchlists.flatMap(wl => wl.companies.map(c => c.ticker));

  const loadDashboardData = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

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

  const handleCompleteTour = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenOnboardingTour', 'true');
  };

  const handleSkipTour = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenOnboardingTour', 'true');
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
        
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="mb-8">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Earnings Dashboard
              </h1>
              <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
                S&P 500 Technology Sector - Analyst consensus and earnings tracking
              </p>
            </div>
          </div>

          {/* Analyst Insights Summary */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Analyst Insights Summary
              </h2>
              <CacheStatusIndicator showDetails={true} className="ml-4" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {events.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Tracked Companies
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {watchlistedTickers.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    In Your Watchlist
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                S&P 500 technology companies with analyst consensus ratings
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900 dark:border-red-700 dark:text-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
            <div className="lg:col-span-1 xl:col-span-1 2xl:col-span-1 space-y-4 lg:space-y-6">
              <EarningsFilter
                onFilterChange={setFilters}
                initialFilters={filters}
              />
              
              {/* Interactive Watchlist Summary */}
              <div data-tour="watchlist">
                <InteractiveWatchlistSummary
                  watchlists={watchlists}
                  onTickerHighlight={setHighlightedTicker}
                  onRemoveFromWatchlist={handleRemoveFromWatchlist}
                />
              </div>
            </div>
            
            <div className="lg:col-span-4 xl:col-span-3 2xl:col-span-4" data-tour="earnings-grid">
              <EnhancedEarningsGrid
                events={events}
                signals={signals}
                watchlistedTickers={watchlistedTickers}
                filters={filters}
                highlightedTicker={highlightedTicker}
                onAddToWatchlist={handleAddToWatchlist}
                onRemoveFromWatchlist={handleRemoveFromWatchlist}
              />
            </div>
          </div>
        </div>
        
        {/* Onboarding Tour */}
        <OnboardingTour
          isVisible={showOnboarding}
          onComplete={handleCompleteTour}
          onSkip={handleSkipTour}
        />
      </div>
    </ProtectedRoute>
  );
}