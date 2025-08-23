/**
 * Browser Cache Manager for Analyst Data
 * Implements intelligent caching with Firestore change detection
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  lastModified?: string; // Firestore document updateAt timestamp
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Default 5 minutes
  maxSize?: number; // Max cache entries
  enablePersistence?: boolean; // Use localStorage
}

export class BrowserCache {
  private cache = new Map<string, CacheItem<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxSize = 100;
  private readonly enablePersistence: boolean;
  private readonly STORAGE_KEY = 'zimystocks_analyst_cache';

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || this.defaultTTL;
    this.enablePersistence = options.enablePersistence ?? true;
    
    if (this.enablePersistence && typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  /**
   * Get cached data if valid, otherwise return null
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      console.log(`🔴 Cache miss: ${key}`);
      return null;
    }

    // Check if expired
    if (Date.now() > item.timestamp + item.ttl) {
      console.log(`⏰ Cache expired: ${key}`);
      this.cache.delete(key);
      this.persistToStorage();
      return null;
    }

    console.log(`🟢 Cache hit: ${key}`);
    return item.data as T;
  }

  /**
   * Set data in cache with optional TTL and lastModified timestamp
   */
  set<T>(key: string, data: T, options: { ttl?: number; lastModified?: string } = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      lastModified: options.lastModified,
      ttl
    });

    console.log(`💾 Cache set: ${key} (TTL: ${ttl/1000}s)`);
    this.persistToStorage();
  }

  /**
   * Check if cached data is valid based on Firestore lastModified timestamp
   */
  isValid(key: string, serverLastModified?: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Check TTL expiration
    if (Date.now() > item.timestamp + item.ttl) {
      return false;
    }

    // Check if server data is newer
    if (serverLastModified && item.lastModified) {
      return new Date(item.lastModified) >= new Date(serverLastModified);
    }

    return true;
  }

  /**
   * Remove specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.persistToStorage();
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.persistToStorage();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{ key: string; age: number; size: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      age: Date.now() - item.timestamp,
      size: JSON.stringify(item.data).length
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Filter out expired entries
        const now = Date.now();
        Object.entries(data).forEach(([key, item]: [string, any]) => {
          if (now <= item.timestamp + item.ttl) {
            this.cache.set(key, item);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  /**
   * Persist cache to localStorage
   */
  private persistToStorage(): void {
    if (!this.enablePersistence || typeof window === 'undefined') {
      return;
    }

    try {
      const data = Object.fromEntries(this.cache.entries());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist cache to storage:', error);
    }
  }
}

// Singleton instance
export const analystCache = new BrowserCache({
  ttl: 10 * 60 * 1000, // 10 minutes for analyst data
  enablePersistence: true
});

/**
 * Cache keys for different data types
 */
export const CACHE_KEYS = {
  ANALYST_INSIGHTS: (ticker: string) => `analyst_insights_${ticker}`,
  ANALYST_PROFILE: (id: string) => `analyst_profile_${id}`,
  TOP_ANALYSTS: (orderBy: string, limit: number) => `top_analysts_${orderBy}_${limit}`,
  ANALYST_LEADERBOARD: (orderBy: string, sector: string) => `analyst_leaderboard_${orderBy}_${sector}`,
  WEIGHTED_CONSENSUS: (ticker: string) => `weighted_consensus_${ticker}`,
  EARNINGS_GRID: 'earnings_grid_data',
  SECTOR_DATA: (sector: string) => `sector_data_${sector}`
};

/**
 * Cached fetch wrapper that checks cache before making API calls
 */
export async function cachedFetch<T>(
  url: string,
  options: RequestInit & { cacheKey: string; ttl?: number } = { cacheKey: '' }
): Promise<T> {
  const { cacheKey, ttl, ...fetchOptions } = options;
  
  // Try to get from cache first
  const cached = analystCache.get<T>(cacheKey);
  if (cached) {
    console.log(`Cache hit for ${cacheKey}`);
    return cached;
  }

  console.log(`Cache miss for ${cacheKey}, fetching from API`);
  
  // Fetch from API
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract lastModified from response if available
  const lastModified = data.updatedAt || data.updated_at || data.lastModified;
  
  // Cache the result
  analystCache.set(cacheKey, data, { ttl, lastModified });
  
  return data;
}

/**
 * Invalidate cache entries by pattern
 */
export function invalidateCache(pattern: string | RegExp): number {
  const stats = analystCache.getStats();
  let deletedCount = 0;

  stats.entries.forEach(({ key }) => {
    const matches = typeof pattern === 'string' 
      ? key.includes(pattern)
      : pattern.test(key);
      
    if (matches) {
      analystCache.delete(key);
      deletedCount++;
    }
  });

  console.log(`Invalidated ${deletedCount} cache entries matching pattern:`, pattern);
  return deletedCount;
}