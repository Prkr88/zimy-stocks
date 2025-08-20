'use client';

import { useState } from 'react';
import { AlertRule, AlertCondition, AlertAction } from '@/types';

interface CreateAlertRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  userId: string;
}

export default function CreateAlertRuleModal({
  isOpen,
  onClose,
  onCreate,
  userId,
}: CreateAlertRuleModalProps) {
  const [name, setName] = useState('');
  const [conditions, setConditions] = useState<AlertCondition[]>([]);
  const [actions, setActions] = useState<AlertAction[]>([]);
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || conditions.length === 0 || actions.length === 0) {
      return;
    }

    onCreate({
      userId,
      name: name.trim(),
      conditions,
      actions,
      isActive,
    });

    // Reset form
    setName('');
    setConditions([]);
    setActions([]);
    setIsActive(true);
    onClose();
  };

  const addCondition = (type: string) => {
    const newCondition: AlertCondition = {
      type: type as any,
      parameters: type === 'high_confidence' ? { threshold: 0.8 } : {},
    };
    setConditions([...conditions, newCondition]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addAction = (type: string) => {
    const newAction: AlertAction = {
      type: type as any,
      parameters: {},
    };
    setActions([...actions, newAction]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateConditionThreshold = (index: number, threshold: number) => {
    const updatedConditions = [...conditions];
    updatedConditions[index].parameters = { threshold };
    setConditions(updatedConditions);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Create Alert Rule
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Rule Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rule Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter rule name"
                required
              />
            </div>

            {/* Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Conditions
              </label>
              <div className="space-y-2 mb-2">
                {conditions.map((condition, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {condition.type === 'watchlist_earnings' && 'Watchlist company has upcoming earnings'}
                        {condition.type === 'sentiment_available' && 'AI sentiment analysis available'}
                        {condition.type === 'high_confidence' && (
                          <div className="flex items-center space-x-2">
                            <span>High confidence signal &gt;</span>
                            <input
                              type="number"
                              min="0"
                              max="1"
                              step="0.1"
                              value={condition.parameters?.threshold || 0.8}
                              onChange={(e) => updateConditionThreshold(index, parseFloat(e.target.value))}
                              className="w-16 px-1 py-0 text-xs border border-gray-300 rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                            />
                          </div>
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCondition(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => addCondition('watchlist_earnings')}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200"
                >
                  Watchlist Earnings
                </button>
                <button
                  type="button"
                  onClick={() => addCondition('sentiment_available')}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200"
                >
                  Sentiment Available
                </button>
                <button
                  type="button"
                  onClick={() => addCondition('high_confidence')}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200"
                >
                  High Confidence
                </button>
              </div>
            </div>

            {/* Actions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Actions
              </label>
              <div className="space-y-2 mb-2">
                {actions.map((action, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {action.type === 'push_notification' && 'Send push notification'}
                      {action.type === 'email' && 'Send email notification'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAction(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => addAction('push_notification')}
                  className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-200"
                >
                  Push Notification
                </button>
                <button
                  type="button"
                  onClick={() => addAction('email')}
                  className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-200"
                >
                  Email
                </button>
              </div>
            </div>

            {/* Active Toggle */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Activate rule immediately
                </span>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || conditions.length === 0 || actions.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Rule
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}