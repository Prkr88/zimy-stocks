import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { createCacheAwareResponse, extractFirestoreCacheMetadata } from '@/lib/cache/cacheAwareResponse';
import type { Query, CollectionReference, DocumentData } from 'firebase-admin/firestore';

/**
 * GET /api/analysts - Get analyst leaderboard and rankings
 * Query params:
 * - orderBy: 'score' | 'accuracy' | 'total_recommendations' | 'recent_performance' (default: 'score')
 * - limit: number (default: 50)
 * - sector: string (optional filter)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderBy = searchParams.get('orderBy') || 'score';
    const limit = parseInt(searchParams.get('limit') || '50');
    const sector = searchParams.get('sector');
    
    console.log(`Getting analyst rankings - orderBy: ${orderBy}, limit: ${limit}, sector: ${sector}`);
    
    // Get enhanced analysts from new system
    let query: Query<DocumentData> = adminDb.collection('analysts_enhanced');
    
    // Apply sector filter if specified
    if (sector) {
      query = query.where('sectors', 'array-contains', sector);
    }
    
    // Apply ordering
    switch (orderBy) {
      case 'score':
        query = query.orderBy('current_score', 'desc');
        break;
      case 'accuracy':
        query = query.orderBy('accuracy_rate', 'desc');
        break;
      case 'total_recommendations':
        query = query.orderBy('total_recommendations', 'desc');
        break;
      case 'recent_performance':
        query = query.orderBy('recent_performance.last_30_days.accuracy', 'desc');
        break;
      default:
        query = query.orderBy('current_score', 'desc');
    }
    
    const snapshot = await query.limit(limit).get();
    const allDocs = snapshot.docs;
    
    const analysts = allDocs.map((doc) => {
      const data = doc.data();
      
      // Calculate performance metrics
      const performanceMetrics = calculatePerformanceMetrics(data);
      
      return {
        id: doc.id,
        name: data.name || 'Unknown Analyst',
        firm: data.firm || 'Independent',
        current_score: Math.round(data.current_score || 50),
        accuracy_rate: Math.round((data.accuracy_rate || 0) * 100),
        total_recommendations: data.total_recommendations || 0,
        sectors: data.sectors || [],
        recent_recommendations: data.recent_performance?.last_30_days?.recommendations || 0,
        performance_metrics: performanceMetrics,
        last_updated: data.last_updated,
        joined_date: data.created_at,
        avatar: generateAvatarUrl(data.name || 'Unknown', data.firm || 'Independent'),
        tier: getAnalystTier(data.current_score || 50)
      };
    });
    
    // Add ranking positions
    const rankedAnalysts = analysts.map((analyst, index) => ({
      ...analyst,
      rank: index + 1,
      rank_change: calculateRankChange(analyst.id, index + 1) // Placeholder for now
    }));
    
    // Get cache metadata
    const cacheMetadata = extractFirestoreCacheMetadata(allDocs);
    
    return createCacheAwareResponse({
      success: true,
      analysts: rankedAnalysts,
      total_count: rankedAnalysts.length,
      filters: {
        orderBy,
        limit,
        sector
      },
      last_updated: new Date().toISOString()
    }, cacheMetadata);
    
  } catch (error) {
    console.error('Error fetching analysts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch analysts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate performance metrics for an analyst
 */
function calculatePerformanceMetrics(analystData: any) {
  const score = analystData.current_score || 50;
  const accuracy = analystData.accuracy_rate || 0;
  const totalRecs = analystData.total_recommendations || 0;
  
  return {
    win_rate: Math.round(accuracy * 100),
    avg_return: analystData.average_return ? `${(analystData.average_return * 100).toFixed(1)}%` : 'N/A',
    best_pick: analystData.best_recommendation || 'N/A',
    worst_pick: analystData.worst_recommendation || 'N/A',
    streak: analystData.current_streak || 0,
    score_trend: calculateScoreTrend(analystData.score_history || []),
    specialization: getTopSector(analystData.sectors || [])
  };
}

/**
 * Get analyst tier based on score
 */
function getAnalystTier(score: number): { name: string; color: string; icon: string } {
  if (score >= 80) return { name: 'Elite', color: 'text-purple-600 bg-purple-100', icon: '👑' };
  if (score >= 70) return { name: 'Expert', color: 'text-blue-600 bg-blue-100', icon: '🥇' };
  if (score >= 60) return { name: 'Senior', color: 'text-green-600 bg-green-100', icon: '🥈' };
  if (score >= 50) return { name: 'Analyst', color: 'text-yellow-600 bg-yellow-100', icon: '🥉' };
  return { name: 'Rookie', color: 'text-gray-600 bg-gray-100', icon: '📊' };
}

/**
 * Calculate score trend (simplified)
 */
function calculateScoreTrend(scoreHistory: number[]): 'up' | 'down' | 'stable' {
  if (scoreHistory.length < 2) return 'stable';
  const recent = scoreHistory.slice(-5);
  const trend = recent[recent.length - 1] - recent[0];
  if (trend > 2) return 'up';
  if (trend < -2) return 'down';
  return 'stable';
}

/**
 * Get top sector for specialization
 */
function getTopSector(sectors: string[]): string {
  if (sectors.length === 0) return 'General';
  return sectors[0]; // Simplified - in reality would count recommendations per sector
}

/**
 * Generate avatar URL based on name and firm
 */
function generateAvatarUrl(name: string, firm: string): string {
  // Use a simple initial-based avatar service
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=64&rounded=true`;
}

/**
 * Calculate rank change (placeholder - would need historical ranking data)
 */
function calculateRankChange(analystId: string, currentRank: number): number {
  // Placeholder - would compare with previous ranking
  return Math.floor(Math.random() * 6) - 3; // Random -3 to +3 for demo
}