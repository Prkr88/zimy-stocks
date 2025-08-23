'use client';

import { useState, useEffect, useCallback } from 'react';
import { cachedFetch, CACHE_KEYS, analystCache } from '@/lib/cache/browserCache';
import { Analyst, AnalystRecommendation, AnalystEvaluation } from '@/lib/analysts/enhancedAnalystTracker';

interface AnalystProfile {
  analyst: Analyst;
  recentCalls: AnalystRecommendation[];
  evaluations: AnalystEvaluation[];
  performance: {
    winRate: number;
    avgAlpha: number;
    callsByAction: Record<string, number>;
    outcomesByAction: Record<string, Record<string, number>>;
  };
}

interface UseCachedAnalystProfileResult {
  profile: AnalystProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  cacheStatus: 'fresh' | 'cached' | 'stale';
  lastUpdated: Date | null;
}

export function useCachedAnalystProfile(analystId: string): UseCachedAnalystProfileResult {
  const [profile, setProfile] = useState<AnalystProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<'fresh' | 'cached' | 'stale'>('fresh');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadProfile = useCallback(async (forceRefresh = false) => {
    if (!analystId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const cacheKey = CACHE_KEYS.ANALYST_PROFILE(analystId);

      // Clear cache if force refresh
      if (forceRefresh) {
        analystCache.delete(cacheKey);
      }

      // Try cache first
      const cachedData = analystCache.get<{
        profile: AnalystProfile;
        timestamp: number;
      }>(cacheKey);

      if (cachedData && !forceRefresh) {
        console.log(`Using cached analyst profile for ${analystId}`);
        setProfile(cachedData.profile);
        setCacheStatus('cached');
        setLastUpdated(new Date(cachedData.timestamp));
        setLoading(false);
        return;
      }

      // Fetch fresh data
      console.log(`Fetching fresh analyst profile for ${analystId}`);
      const data = await cachedFetch<{
        success: boolean;
        analyst: Analyst;
        recentCalls: AnalystRecommendation[];
        evaluations: AnalystEvaluation[];
        performance: any;
      }>(`/api/analysts-enhanced/${analystId}`, {
        cacheKey,
        ttl: 5 * 60 * 1000 // 5 minutes
      });

      if (data.success) {
        const profileData: AnalystProfile = {
          analyst: data.analyst,
          recentCalls: data.recentCalls,
          evaluations: data.evaluations,
          performance: data.performance
        };

        setProfile(profileData);
        setCacheStatus('fresh');
        setLastUpdated(new Date());

        // Update cache with timestamp
        analystCache.set(cacheKey, {
          profile: profileData,
          timestamp: Date.now()
        }, {
          ttl: 5 * 60 * 1000,
          lastModified: data.analyst.updated_at?.toString()
        });
      } else {
        setError('Failed to load analyst profile');
      }
    } catch (err) {
      console.error('Error loading analyst profile:', err);
      setError('Failed to load analyst profile');
      
      // Try to use stale cache data as fallback
      const staleData = analystCache.get(CACHE_KEYS.ANALYST_PROFILE(analystId));
      if ((staleData as any)?.profile) {
        console.log('Using stale cache data as fallback');
        setProfile((staleData as any).profile);
        setCacheStatus('stale');
        setError('Using cached data (may be outdated)');
      }
    } finally {
      setLoading(false);
    }
  }, [analystId]);

  const refresh = useCallback(async () => {
    await loadProfile(true);
  }, [loadProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    error,
    refresh,
    cacheStatus,
    lastUpdated
  };
}

/**
 * Hook for cached top analysts list
 */
export function useCachedTopAnalysts(limit = 50, orderBy: 'score' | 'lifetime_calls' = 'score') {
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<'fresh' | 'cached' | 'stale'>('fresh');

  const loadAnalysts = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const cacheKey = CACHE_KEYS.TOP_ANALYSTS(orderBy, limit);

      // Clear cache if force refresh
      if (forceRefresh) {
        analystCache.delete(cacheKey);
      }

      // Try cache first
      const cachedData = analystCache.get<{
        analysts: Analyst[];
        timestamp: number;
      }>(cacheKey);

      if (cachedData && !forceRefresh) {
        console.log(`Using cached top analysts (${orderBy}, ${limit})`);
        setAnalysts(cachedData.analysts);
        setCacheStatus('cached');
        setLoading(false);
        return;
      }

      // Fetch fresh data
      console.log(`Fetching fresh top analysts (${orderBy}, ${limit})`);
      const data = await cachedFetch<{
        success: boolean;
        analysts: Analyst[];
      }>(`/api/analysts-enhanced?limit=${limit}&orderBy=${orderBy}`, {
        cacheKey,
        ttl: 10 * 60 * 1000 // 10 minutes
      });

      if (data.success) {
        setAnalysts(data.analysts);
        setCacheStatus('fresh');

        // Cache with timestamp
        analystCache.set(cacheKey, {
          analysts: data.analysts,
          timestamp: Date.now()
        }, {
          ttl: 10 * 60 * 1000
        });
      } else {
        setError('Failed to load analysts');
      }
    } catch (err) {
      console.error('Error loading top analysts:', err);
      setError('Failed to load analysts');
      
      // Try stale cache
      const staleData = analystCache.get(CACHE_KEYS.TOP_ANALYSTS(orderBy, limit));
      if ((staleData as any)?.analysts) {
        setAnalysts((staleData as any).analysts);
        setCacheStatus('stale');
        setError('Using cached data (may be outdated)');
      }
    } finally {
      setLoading(false);
    }
  }, [limit, orderBy]);

  const refresh = useCallback(async () => {
    await loadAnalysts(true);
  }, [loadAnalysts]);

  useEffect(() => {
    loadAnalysts();
  }, [loadAnalysts]);

  return {
    analysts,
    loading,
    error,
    refresh,
    cacheStatus
  };
}