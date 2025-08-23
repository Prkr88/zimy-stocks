'use client';

import { useState, useEffect } from 'react';

interface StockPriceChartProps {
  ticker: string;
  className?: string;
}

interface PricePoint {
  date: string;
  price: number;
  change: number;
}

export default function StockPriceChart({ ticker, className = '' }: StockPriceChartProps) {
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Simulate fetching stock price data
    // In a real app, this would fetch from a financial data API
    const generateMockData = () => {
      const data: PricePoint[] = [];
      const basePrice = Math.random() * 200 + 50; // Random price between 50-250
      let currentPrice = basePrice;
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Random walk with slight upward bias
        const change = (Math.random() - 0.48) * 0.05; // Slight upward bias
        currentPrice = currentPrice * (1 + change);
        
        data.push({
          date: date.toISOString().split('T')[0],
          price: currentPrice,
          change: change * 100
        });
      }
      
      return data;
    };

    const loadData = async () => {
      try {
        setLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
        
        const data = generateMockData();
        setPriceData(data);
        setError(false);
      } catch (err) {
        console.error('Error loading price data:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [ticker]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-16 ${className}`}>
        <div className="text-gray-400 dark:text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || priceData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-16 ${className}`}>
        <div className="text-gray-400 dark:text-gray-600 text-sm">
          📈 Chart unavailable
        </div>
      </div>
    );
  }

  const minPrice = Math.min(...priceData.map(p => p.price));
  const maxPrice = Math.max(...priceData.map(p => p.price));
  const priceRange = maxPrice - minPrice;
  const currentPrice = priceData[priceData.length - 1]?.price || 0;
  const firstPrice = priceData[0]?.price || currentPrice;
  const totalChange = ((currentPrice - firstPrice) / firstPrice) * 100;
  const isPositive = totalChange >= 0;

  // Generate SVG path
  const width = 200;
  const height = 60;
  const padding = 4;
  
  const points = priceData.map((point, index) => {
    const x = (index / (priceData.length - 1)) * (width - 2 * padding) + padding;
    const y = height - padding - ((point.price - minPrice) / (priceRange || 1)) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          30-day trend
        </div>
        <div className={`text-xs font-medium ${
          isPositive 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-red-600 dark:text-red-400'
        }`}>
          {isPositive ? '+' : ''}{totalChange.toFixed(1)}%
        </div>
      </div>
      
      <div className="relative">
        <svg 
          width={width} 
          height={height} 
          className="w-full h-16"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="15" patternUnits="userSpaceOnUse">
              <path 
                d="M 20 0 L 0 0 0 15" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="0.5" 
                opacity="0.1"
                className="text-gray-400 dark:text-gray-600"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Price line */}
          <polyline
            fill="none"
            stroke={isPositive ? '#10B981' : '#EF4444'}
            strokeWidth="1.5"
            points={points}
            className="drop-shadow-sm"
          />
          
          {/* Fill area under line */}
          <polygon
            fill={isPositive ? '#10B981' : '#EF4444'}
            fillOpacity="0.1"
            points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
          />
          
          {/* Current price dot */}
          {priceData.length > 0 && (
            <circle
              cx={(width - 2 * padding) + padding}
              cy={height - padding - ((currentPrice - minPrice) / (priceRange || 1)) * (height - 2 * padding)}
              r="2"
              fill={isPositive ? '#10B981' : '#EF4444'}
              className="drop-shadow-sm"
            />
          )}
        </svg>
        
        {/* Price labels */}
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-600 mt-1">
          <span>${firstPrice.toFixed(2)}</span>
          <span className={`font-medium ${
            isPositive 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            ${currentPrice.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}