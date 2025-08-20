'use client';

import { useState, useEffect } from 'react';
import { User, UserPreferences } from '@/types';
import { updateUser } from '@/lib/firestore';

interface NotificationSettingsProps {
  user: User;
  onUpdate: (preferences: UserPreferences) => void;
}

export default function NotificationSettings({ user, onUpdate }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(user.preferences);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      
      await updateUser(user.id, { preferences });
      onUpdate(preferences);
      setMessage('Settings saved successfully!');
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const updateAlertSetting = (key: keyof UserPreferences['alertSettings'], value: any) => {
    setPreferences(prev => ({
      ...prev,
      alertSettings: { ...prev.alertSettings, [key]: value }
    }));
  };

  const toggleMarket = (market: string) => {
    const currentMarkets = preferences.alertSettings.enabledMarkets;
    const updatedMarkets = currentMarkets.includes(market)
      ? currentMarkets.filter(m => m !== market)
      : [...currentMarkets, market];
    
    updateAlertSetting('enabledMarkets', updatedMarkets);
  };

  const toggleSector = (sector: string) => {
    const currentSectors = preferences.alertSettings.enabledSectors;
    const updatedSectors = currentSectors.includes(sector)
      ? currentSectors.filter(s => s !== sector)
      : [...currentSectors, sector];
    
    updateAlertSetting('enabledSectors', updatedSectors);
  };

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Notification Settings
        </h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.includes('success') 
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* General Notifications */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
            General Notifications
          </h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={(e) => updatePreference('emailNotifications', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                Enable email notifications
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.pushNotifications}
                onChange={(e) => updatePreference('pushNotifications', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                Enable push notifications
              </span>
            </label>
          </div>
        </div>

        {/* Summary Emails */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
            Summary Emails
          </h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.dailySummary}
                onChange={(e) => updatePreference('dailySummary', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                Daily summary email
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.weeklySummary}
                onChange={(e) => updatePreference('weeklySummary', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                Weekly summary email
              </span>
            </label>
          </div>
        </div>

        {/* Alert Filters */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
            Alert Filters
          </h4>
          
          {/* Markets */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enabled Markets
            </label>
            <div className="space-y-2">
              {['SP500', 'TA125'].map(market => (
                <label key={market} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.alertSettings.enabledMarkets.includes(market)}
                    onChange={() => toggleMarket(market)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {market === 'SP500' ? 'S&P 500' : 'TA-125'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Sectors */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enabled Sectors (leave empty for all)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {AVAILABLE_SECTORS.map(sector => (
                <label key={sector} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.alertSettings.enabledSectors.includes(sector)}
                    onChange={() => toggleSector(sector)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">
                    {sector}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Minimum Sentiment Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Sentiment Score: {preferences.alertSettings.minSentimentScore.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={preferences.alertSettings.minSentimentScore}
              onChange={(e) => updateAlertSetting('minSentimentScore', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>0.0 (All)</span>
              <span>1.0 (High only)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}