'use client';

import { useState } from 'react';

interface RecommendationFormProps {
  analysts: Array<{ id: string; name: string; firm: string }>;
  onRecommendationAdded?: () => void;
}

export default function RecommendationForm({ analysts, onRecommendationAdded }: RecommendationFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({
    analystId: '',
    ticker: '',
    action: 'BUY' as 'BUY' | 'HOLD' | 'SELL',
    confidence: 0.7,
    horizonDays: 30,
    targetPrice: '',
    note: '',
    sector: ''
  });

  const sectors = [
    'Technology',
    'Consumer Discretionary', 
    'Financials',
    'Health Care',
    'Industrials',
    'Energy',
    'Utilities',
    'Materials',
    'Real Estate',
    'Communication Services',
    'Consumer Staples'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestAction: 'record_recommendation',
          ...formData,
          targetPrice: formData.targetPrice ? parseFloat(formData.targetPrice) : undefined
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(`✅ ${result.message}`);
        setFormData({
          analystId: '',
          ticker: '',
          action: 'BUY',
          confidence: 0.7,
          horizonDays: 30,
          targetPrice: '',
          note: '',
          sector: ''
        });
        
        setTimeout(() => {
          setIsOpen(false);
          setMessage('');
          if (onRecommendationAdded) {
            onRecommendationAdded();
          }
        }, 2000);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error) {
      console.error('Error recording recommendation:', error);
      setMessage('❌ Failed to record recommendation');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <span className="mr-2">📝</span>
        Record Recommendation
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Record New Recommendation
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Analyst Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Analyst
            </label>
            <select
              value={formData.analystId}
              onChange={(e) => handleInputChange('analystId', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Analyst</option>
              {analysts.map((analyst) => (
                <option key={analyst.id} value={analyst.id}>
                  {analyst.name} - {analyst.firm}
                </option>
              ))}
            </select>
          </div>

          {/* Ticker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ticker
            </label>
            <input
              type="text"
              value={formData.ticker}
              onChange={(e) => handleInputChange('ticker', e.target.value.toUpperCase())}
              placeholder="e.g., AAPL"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Action
            </label>
            <select
              value={formData.action}
              onChange={(e) => handleInputChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="BUY">📈 BUY</option>
              <option value="HOLD">⚖️ HOLD</option>
              <option value="SELL">📉 SELL</option>
            </select>
          </div>

          {/* Sector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sector (Optional)
            </label>
            <select
              value={formData.sector}
              onChange={(e) => handleInputChange('sector', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Sector</option>
              {sectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </div>

          {/* Confidence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confidence ({Math.round(formData.confidence * 100)}%)
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={formData.confidence}
              onChange={(e) => handleInputChange('confidence', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Horizon Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Horizon (Days)
            </label>
            <input
              type="number"
              value={formData.horizonDays}
              onChange={(e) => handleInputChange('horizonDays', parseInt(e.target.value))}
              min="1"
              max="365"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Target Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Price (Optional)
            </label>
            <input
              type="number"
              value={formData.targetPrice}
              onChange={(e) => handleInputChange('targetPrice', e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Note (Optional)
          </label>
          <textarea
            value={formData.note}
            onChange={(e) => handleInputChange('note', e.target.value)}
            placeholder="Additional context or reasoning..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.startsWith('✅') 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}>
            {message}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Recording...
              </>
            ) : (
              <>
                <span className="mr-2">💾</span>
                Record
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}