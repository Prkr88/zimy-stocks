'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../AuthProvider';
import { notificationService } from '@/lib/services/notificationService';

export default function NotificationSettings() {
  const { user } = useAuth();
  const [notificationState, setNotificationState] = useState<{
    supported: boolean;
    permission: NotificationPermission | null;
    enabled: boolean;
    loading: boolean;
    error: string | null;
  }>({
    supported: false,
    permission: null,
    enabled: false,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      const permission = supported ? Notification.permission : null;
      
      setNotificationState(prev => ({
        ...prev,
        supported,
        permission,
        enabled: permission === 'granted',
      }));

      // Setup foreground message handler if already granted
      if (permission === 'granted') {
        notificationService.setupForegroundMessageHandler();
      }
    }
  }, []);

  const enableNotifications = async () => {
    if (!user) return;

    setNotificationState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await notificationService.enableNotifications(user.uid);
      
      if (result.granted) {
        setNotificationState(prev => ({
          ...prev,
          enabled: true,
          permission: 'granted',
          loading: false,
        }));
      } else {
        setNotificationState(prev => ({
          ...prev,
          enabled: false,
          loading: false,
          error: result.error || 'Failed to enable notifications',
        }));
      }
    } catch (error) {
      setNotificationState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };

  const disableNotifications = async () => {
    // In a real app, you might want to unsubscribe from push notifications
    // For now, we'll just show that they need to disable in browser settings
    setNotificationState(prev => ({
      ...prev,
      enabled: false,
      permission: 'denied'
    }));
  };

  if (!user) {
    return (
      <div className="text-center p-4 text-gray-500 dark:text-gray-400">
        Please sign in to manage notification settings.
      </div>
    );
  }

  if (!notificationState.supported) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Notifications Not Supported
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Your browser doesn&apos;t support push notifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Push Notifications
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Receive instant alerts for earnings events and market updates
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Status Indicator */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              notificationState.enabled 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : notificationState.permission === 'denied'
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                notificationState.enabled 
                  ? 'bg-green-500' 
                  : notificationState.permission === 'denied'
                  ? 'bg-red-500'
                  : 'bg-gray-400'
              }`} />
              {notificationState.enabled 
                ? 'Enabled' 
                : notificationState.permission === 'denied' 
                ? 'Blocked' 
                : 'Disabled'}
            </div>

            {/* Action Button */}
            {notificationState.permission !== 'denied' && (
              <button
                onClick={notificationState.enabled ? disableNotifications : enableNotifications}
                disabled={notificationState.loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  notificationState.enabled
                    ? 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50`}
              >
                {notificationState.loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Working...
                  </div>
                ) : notificationState.enabled ? (
                  'Disable'
                ) : (
                  'Enable'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {notificationState.error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="text-sm text-red-600 dark:text-red-400">
              {notificationState.error}
            </div>
          </div>
        )}

        {/* Blocked Notice */}
        {notificationState.permission === 'denied' && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Notifications are blocked.</strong> To enable them, click the lock icon in your browser&apos;s address bar and allow notifications, then refresh this page.
            </div>
          </div>
        )}

        {/* Success Message */}
        {notificationState.enabled && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="text-sm text-green-800 dark:text-green-200">
              <strong>Notifications enabled!</strong> You&apos;ll receive alerts for earnings events, analyst updates, and market news.
            </div>
          </div>
        )}
      </div>

      {/* Notification Types (Future Enhancement) */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Notification Types
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose which types of notifications you&apos;d like to receive
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Earnings Alerts
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upcoming earnings announcements for companies in your watchlist
              </p>
            </div>
            <input 
              type="checkbox" 
              defaultChecked 
              disabled={!notificationState.enabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50" 
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Analyst Updates
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                New ratings and price target changes from top analysts
              </p>
            </div>
            <input 
              type="checkbox" 
              defaultChecked 
              disabled={!notificationState.enabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50" 
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Market News
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Breaking news and significant market movements
              </p>
            </div>
            <input 
              type="checkbox" 
              defaultChecked 
              disabled={!notificationState.enabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50" 
            />
          </div>
        </div>

        {!notificationState.enabled && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 italic">
            Enable push notifications above to configure these settings.
          </div>
        )}
      </div>
    </div>
  );
}