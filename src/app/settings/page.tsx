'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import FullSystemUpdateButton from '@/components/dashboard/FullSystemUpdateButton';
import OnboardingTour from '@/components/ui/OnboardingTour';
import NotificationSettings from '@/components/settings/NotificationSettings';

export default function SettingsPage() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleStartTour = () => {
    localStorage.removeItem('hasSeenOnboardingTour');
    // Redirect to dashboard and start tour
    window.location.href = '/dashboard?startTour=true';
  };

  const handleSystemUpdate = () => {
    // This will be handled by the FullSystemUpdateButton component
    console.log('System update initiated from settings');
  };

  const handleCompleteTour = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenOnboardingTour', 'true');
  };

  const handleSkipTour = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenOnboardingTour', 'true');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage your Zimy Stocks preferences and system settings
            </p>
          </div>

          {/* Settings Sections */}
          <div className="space-y-6">
            
            {/* System Management */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                System Management
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Update earnings data and manage system-wide operations
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <FullSystemUpdateButton 
                  onUpdateComplete={() => {
                    console.log('System update completed from settings');
                  }}
                />
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <span className="mr-2">ℹ️</span>
                  Updates all earnings data, analyst ratings, and market information
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Notifications
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Configure push notifications for earnings alerts and market updates
              </p>
              
              <NotificationSettings />
            </div>

            {/* User Experience */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                User Experience
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Customize your dashboard experience and learn about features
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Interactive Tour
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Take a guided tour to learn about all the dashboard features and capabilities
                    </p>
                  </div>
                  <button
                    onClick={handleStartTour}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
                  >
                    <span className="mr-2">🎯</span>
                    Start Tour
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Tour Status
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {typeof window !== 'undefined' && localStorage.getItem('hasSeenOnboardingTour') 
                        ? 'You have completed the onboarding tour'
                        : 'Tour not completed yet - take the tour to get started'
                      }
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    typeof window !== 'undefined' && localStorage.getItem('hasSeenOnboardingTour')
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {typeof window !== 'undefined' && localStorage.getItem('hasSeenOnboardingTour') ? '✓ Complete' : '⏳ Pending'}
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Account Information
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your account details and preferences
              </p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <div className="text-gray-900 dark:text-white">
                      {user?.email || 'Not available'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      User ID
                    </label>
                    <div className="text-gray-900 dark:text-white font-mono text-sm">
                      {user?.uid?.substring(0, 12) || 'Not available'}...
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Data Management
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Manage your watchlists and personal data
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Reset Tour Progress
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Clear your tour completion status to see the onboarding again
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem('hasSeenOnboardingTour');
                      window.location.reload();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Reset Tour
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Cache Management
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Clear cached analyst data to force fresh API requests
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Clear Cache
                  </button>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Preferences
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Customize your dashboard and notification preferences
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Theme
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose your preferred color theme
                    </p>
                  </div>
                  <select className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option>System Default</option>
                    <option>Light</option>
                    <option>Dark</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Default View Mode
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose between grid and list view as default
                    </p>
                  </div>
                  <select className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option>Grid View</option>
                    <option>List View</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Onboarding Tour (if started from settings) */}
        <OnboardingTour
          isVisible={showOnboarding}
          onComplete={handleCompleteTour}
          onSkip={handleSkipTour}
        />
      </div>
    </ProtectedRoute>
  );
}