'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import AlertRuleCard from '@/components/alerts/AlertRuleCard';
import CreateAlertRuleModal from '@/components/alerts/CreateAlertRuleModal';
import NotificationSettings from '@/components/alerts/NotificationSettings';
import {
  getUserAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  getUserById,
  getUserAlertHistory,
} from '@/lib/firestore';
import type { AlertRule, AlertHistory, User as AppUser } from '@/types';

export default function AlertsPage() {
  const { user } = useAuth();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'settings' | 'history'>('rules');

  const loadAlertsData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [appUserData, rulesData, historyData] = await Promise.all([
        getUserById(user!.uid),
        getUserAlertRules(user!.uid),
        getUserAlertHistory(user!.uid, 50),
      ]);

      setAppUser(appUserData);
      setAlertRules(rulesData);
      setAlertHistory(historyData);
    } catch (err: any) {
      console.error('Error loading alerts data:', err);
      setError('Failed to load alerts data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAlertsData();
    }
  }, [user, loadAlertsData]);

  const handleCreateRule = async (ruleData: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const ruleId = await createAlertRule({
        ...ruleData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const newRule: AlertRule = {
        ...ruleData,
        id: ruleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setAlertRules([newRule, ...alertRules]);
    } catch (err: any) {
      console.error('Error creating alert rule:', err);
      setError('Failed to create alert rule. Please try again.');
    }
  };

  const handleUpdateRule = async (ruleId: string, updates: Partial<AlertRule>) => {
    try {
      await updateAlertRule(ruleId, updates);
      setAlertRules(alertRules.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates, updatedAt: new Date() } : rule
      ));
    } catch (err: any) {
      console.error('Error updating alert rule:', err);
      setError('Failed to update alert rule. Please try again.');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) {
      return;
    }

    try {
      await deleteAlertRule(ruleId);
      setAlertRules(alertRules.filter(rule => rule.id !== ruleId));
    } catch (err: any) {
      console.error('Error deleting alert rule:', err);
      setError('Failed to delete alert rule. Please try again.');
    }
  };

  const handleUpdateUserPreferences = (preferences: any) => {
    if (appUser) {
      setAppUser({ ...appUser, preferences });
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

  if (!appUser) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Navbar />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Failed to load user data. Please try refreshing the page.
              </p>
            </div>
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
              Alerts & Notifications
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage your alert rules and notification preferences
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900 dark:border-red-700 dark:text-red-100">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              {[
                { id: 'rules', label: 'Alert Rules', count: alertRules.length },
                { id: 'settings', label: 'Settings' },
                { id: 'history', label: 'History', count: alertHistory.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label} {tab.count !== undefined && `(${tab.count})`}
                </button>
              ))}
            </nav>
          </div>

          {/* Alert Rules Tab */}
          {activeTab === 'rules' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Alert Rules
                </h2>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Create New Rule
                </button>
              </div>

              {alertRules.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <div className="text-gray-400 dark:text-gray-600 mb-4">
                    <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-5 5-5-5h5v-12z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No alert rules configured
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Create your first alert rule to start receiving notifications about earnings events.
                  </p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Create Alert Rule
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {alertRules.map(rule => (
                    <AlertRuleCard
                      key={rule.id}
                      rule={rule}
                      onUpdate={handleUpdateRule}
                      onDelete={handleDeleteRule}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <NotificationSettings
              user={appUser}
              onUpdate={handleUpdateUserPreferences}
            />
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Alert History
              </h2>
              
              {alertHistory.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <div className="text-gray-400 dark:text-gray-600 mb-4">
                    <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No alerts sent yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Your alert history will appear here once notifications start being sent.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alertHistory.map(alert => (
                    <div
                      key={alert.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              alert.status === 'sent'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : alert.status === 'failed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}
                          >
                            {alert.status}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {alert.ticker}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {alert.type}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(alert.sentAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">
                        {alert.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Alert Rule Modal */}
        <CreateAlertRuleModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateRule}
          userId={user!.uid}
        />
      </div>
    </ProtectedRoute>
  );
}