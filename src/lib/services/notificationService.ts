'use client';

import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';
import { updateUser } from '@/lib/firestore';

export interface NotificationPermissionResult {
  granted: boolean;
  token?: string;
  error?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private fcmToken: string | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission(): Promise<NotificationPermissionResult> {
    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        return {
          granted: false,
          error: 'This browser does not support notifications',
        };
      }

      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        return {
          granted: false,
          error: 'This browser does not support service workers',
        };
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        return {
          granted: false,
          error: 'Notification permission denied',
        };
      }

      // Get FCM token
      const messagingInstance = await messaging();
      if (!messagingInstance) {
        return {
          granted: false,
          error: 'Firebase messaging not supported',
        };
      }

      const token = await getToken(messagingInstance, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (!token) {
        return {
          granted: false,
          error: 'Failed to get FCM token',
        };
      }

      this.fcmToken = token;
      
      return {
        granted: true,
        token,
      };
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return {
        granted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async saveFCMToken(userId: string, token: string): Promise<void> {
    try {
      await updateUser(userId, {
        fcmToken: token,
        notificationPermissionGranted: true,
        updatedAt: new Date(),
      } as any);
    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw error;
    }
  }

  async setupForegroundMessageHandler(): Promise<void> {
    try {
      const messagingInstance = await messaging();
      if (!messagingInstance) return;

      onMessage(messagingInstance, (payload) => {
        console.log('Foreground message received:', payload);

        // Show custom in-app notification
        this.showInAppNotification(payload);
      });
    } catch (error) {
      console.error('Error setting up foreground message handler:', error);
    }
  }

  private showInAppNotification(payload: any): void {
    // Create a custom in-app notification
    const notification = document.createElement('div');
    notification.className = `
      fixed top-4 right-4 z-50 max-w-sm w-full bg-white dark:bg-gray-800 
      rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 
      p-4 transform transition-all duration-300 ease-in-out translate-x-full
    `;

    notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <div class="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900">
            <span class="text-indigo-600 dark:text-indigo-400">📊</span>
          </div>
        </div>
        <div class="ml-3 w-0 flex-1">
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            ${payload.notification?.title || 'Zimy Stocks'}
          </p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ${payload.notification?.body || 'New earnings alert'}
          </p>
        </div>
        <div class="ml-4 flex-shrink-0 flex">
          <button class="notification-close inline-flex text-gray-400 hover:text-gray-500 focus:outline-none">
            <span class="sr-only">Close</span>
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    `;

    // Add to document
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);

    // Add click handlers
    const closeButton = notification.querySelector('.notification-close');
    closeButton?.addEventListener('click', () => {
      this.removeNotification(notification);
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.removeNotification(notification);
    }, 5000);

    // Click to navigate
    notification.addEventListener('click', (e) => {
      if (!e.target || (e.target as Element).closest('.notification-close')) return;
      
      const url = payload.data?.url || '/dashboard';
      window.location.href = url;
      this.removeNotification(notification);
    });
  }

  private removeNotification(notification: HTMLElement): void {
    notification.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  async enableNotifications(userId: string): Promise<NotificationPermissionResult> {
    const result = await this.requestPermission();
    
    if (result.granted && result.token) {
      await this.saveFCMToken(userId, result.token);
      await this.setupForegroundMessageHandler();
    }
    
    return result;
  }

  getToken(): string | null {
    return this.fcmToken;
  }

  async refreshToken(userId: string): Promise<string | null> {
    try {
      const messagingInstance = await messaging();
      if (!messagingInstance) return null;

      const newToken = await getToken(messagingInstance, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (newToken) {
        this.fcmToken = newToken;
        await this.saveFCMToken(userId, newToken);
      }

      return newToken;
    } catch (error) {
      console.error('Error refreshing FCM token:', error);
      return null;
    }
  }
}

// Singleton instance
export const notificationService = NotificationService.getInstance();