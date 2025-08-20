'use client';

import { useState } from 'react';
import { AlertRule } from '@/types';

interface AlertRuleCardProps {
  rule: AlertRule;
  onUpdate: (ruleId: string, updates: Partial<AlertRule>) => void;
  onDelete: (ruleId: string) => void;
}

export default function AlertRuleCard({ rule, onUpdate, onDelete }: AlertRuleCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(rule.name);
  const [isActive, setIsActive] = useState(rule.isActive);

  const handleSave = () => {
    onUpdate(rule.id, { name, isActive });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(rule.name);
    setIsActive(rule.isActive);
    setIsEditing(false);
  };

  const getConditionDescription = (condition: any) => {
    switch (condition.type) {
      case 'watchlist_earnings':
        return 'Watchlist company has upcoming earnings';
      case 'sentiment_available':
        return 'AI sentiment analysis available';
      case 'high_confidence':
        return `High confidence signal (>${condition.parameters?.threshold || 80}%)`;
      default:
        return condition.type;
    }
  };

  const getActionDescription = (action: any) => {
    switch (action.type) {
      case 'push_notification':
        return 'Send push notification';
      case 'email':
        return 'Send email notification';
      default:
        return action.type;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-semibold bg-transparent border-b border-gray-300 focus:border-indigo-500 focus:outline-none text-gray-900 dark:text-white dark:border-gray-600 w-full"
            />
          ) : (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {rule.name}
            </h3>
          )}
          <div className="flex items-center mt-2">
            {isEditing ? (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Active</span>
              </label>
            ) : (
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  rule.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {rule.isActive ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(rule.id)}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Conditions */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Conditions:
        </h4>
        <div className="space-y-1">
          {rule.conditions.map((condition, index) => (
            <div
              key={index}
              className="flex items-center text-sm text-gray-600 dark:text-gray-400"
            >
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
              {getConditionDescription(condition)}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Actions:
        </h4>
        <div className="space-y-1">
          {rule.actions.map((action, index) => (
            <div
              key={index}
              className="flex items-center text-sm text-gray-600 dark:text-gray-400"
            >
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              {getActionDescription(action)}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Created: {new Date(rule.createdAt).toLocaleDateString()}</span>
          <span>Updated: {new Date(rule.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}