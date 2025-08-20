'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { notificationService } from '@/lib/services/notificationService';

export default function NotificationSetup() {
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

  if (!user || !notificationState.supported) {
    return null;
  }

  if (notificationState.enabled) {
    return (
      <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
              Notifications Enabled
            </h3>
            <div className="mt-2 text-sm text-green-700 dark:text-green-300">
              <p>You&apos;ll receive push notifications for earnings alerts and updates.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notificationState.permission === 'denied') {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Notifications Blocked
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>To receive earnings alerts, please enable notifications in your browser settings.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Enable Push Notifications
          </h3>
          <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
            <p>Get instant alerts for earnings events and AI sentiment updates.</p>
          </div>
          <div className="mt-4">
            <button
              onClick={enableNotifications}
              disabled={notificationState.loading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700 disabled:opacity-50"
            >
              {notificationState.loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Enabling...
                </>
              ) : (
                'Enable Notifications'
              )}
            </button>
          </div>
          
          {notificationState.error && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              {notificationState.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}