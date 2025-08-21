'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import CompanyCard from '@/components/history/CompanyCard';
import { getUserWatchlists, getCompanyHistory } from '@/lib/firestore';
import type { CompanyHistory, Watchlist } from '@/types';

export default function HistoryPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<CompanyHistory[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadHistoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Get user's watchlists to know which companies to load history for
      const watchlistsData = await getUserWatchlists(user!.uid);
      setWatchlists(watchlistsData);

      // Get unique tickers from all watchlists
      const tickers = Array.from(
        new Set(watchlistsData.flatMap(wl => wl.companies.map(c => c.ticker)))
      );

      // Load company history for each ticker
      const companiesData = await Promise.all(
        tickers.map(async (ticker) => {
          const history = await getCompanyHistory(ticker);
          return history;
        })
      );

      // Filter out null results and set data
      const validCompanies = companiesData.filter(Boolean) as CompanyHistory[];
      setCompanies(validCompanies);
    } catch (err: any) {
      console.error('Error loading history data:', err);
      setError('Failed to load company history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadHistoryData();
    }
  }, [user, loadHistoryData]);

  const filteredCompanies = companies.filter(company =>
    company.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Company History
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              View past events, insights, and alerts for your watchlisted companies
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900 dark:border-red-700 dark:text-red-100">
              {error}
            </div>
          )}

          {/* Search and Stats */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search companies..."
                className="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {companies.length}
                </span>{' '}
                companies tracked
              </div>
              <div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {companies.reduce((sum, c) => sum + c.insights.length, 0)}
                </span>{' '}
                total insights
              </div>
              <div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {companies.reduce((sum, c) => sum + c.alerts.length, 0)}
                </span>{' '}
                alerts sent
              </div>
            </div>
          </div>

          {/* Companies Grid */}
          {filteredCompanies.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <div className="text-gray-400 dark:text-gray-600 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'No matching companies found' : 'No company history available'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm 
                  ? 'Try adjusting your search terms.'
                  : 'Add companies to your watchlist to start tracking their history.'}
              </p>
              {!searchTerm && (
                <div className="mt-4">
                  <a
                    href="/dashboard"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Go to Dashboard
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredCompanies.map(company => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}