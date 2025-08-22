import { adminDb } from '@/lib/firebase-admin';
import { createPolygonTool } from '@/lib/tools/polygonTool';

export interface Analyst {
  id: string;
  name: string;
  firm: string;
  score: number; // 0-100, starts at 50
  lifetime_calls: number;
  created_at: Date;
  updated_at: Date;
  specializations?: string[];
  tier?: 'TOP_TIER' | 'RISING' | 'NEW';
}

export interface AnalystRecommendation {
  id: string;
  analyst_id: string;
  ticker: string;
  action: 'BUY' | 'HOLD' | 'SELL';
  confidence?: number; // 0-1
  horizon_days: number; // default 30
  target_price?: number;
  note?: string;
  t0: Date; // recommendation timestamp
  p0: number; // price at t0
  benchmark: string; // default 'SPY'
  status: 'OPEN' | 'CLOSED';
  created_at: Date;
}

export interface AnalystEvaluation {
  id: string;
  recommendation_id: string;
  horizon_days: number;
  t1: Date; // evaluation timestamp
  p1: number; // price at t1
  bench_return: number;
  abs_return: number;
  alpha: number; // abs_return - bench_return
  outcome: 'CORRECT' | 'NEUTRAL' | 'INCORRECT';
  score_delta: number;
  created_at: Date;
}

export interface BenchmarkMapping {
  sector: string;
  etf: string;
}

export class EnhancedAnalystTracker {
  private polygonTool: any;
  
  // Sector to ETF mapping
  private static SECTOR_BENCHMARKS: Record<string, string> = {
    'Technology': 'XLK',
    'Consumer Discretionary': 'XLY', 
    'Financials': 'XLF',
    'Health Care': 'XLV',
    'Industrials': 'XLI',
    'Energy': 'XLE',
    'Utilities': 'XLU',
    'Materials': 'XLB',
    'Real Estate': 'XLRE',
    'Communication Services': 'XLC',
    'Consumer Staples': 'XLP'
  };

  // Configuration thresholds
  private static CONFIG = {
    SCORE_K_BASE: 6,
    OUTCOME_THRESHOLDS: {
      POS: 0.02, // +2% for Buy success
      NEG: -0.02, // -2% for Sell success  
      HOLD_UPPER: 0.01, // +1% for Hold upper bound
      HOLD_LOWER: -0.01 // -1% for Hold lower bound
    },
    DEFAULT_HORIZON_DAYS: 30,
    BENCHMARK_DEFAULT: 'SPY',
    FRESHNESS_DECAY_DAYS: 180,
    TIER_THRESHOLDS: {
      TOP_TIER: 80,
      RISING: 65,
      MIN_CALLS_FOR_TIER: 5
    }
  };

  constructor() {
    this.polygonTool = createPolygonTool();
  }

  /**
   * Create or update an analyst profile
   */
  async createAnalyst(analystData: Omit<Analyst, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const now = new Date();
    
    const analyst: Omit<Analyst, 'id'> = {
      ...analystData,
      score: analystData.score || 50,
      lifetime_calls: analystData.lifetime_calls || 0,
      created_at: now,
      updated_at: now,
      tier: this.calculateTier(analystData.score || 50, analystData.lifetime_calls || 0)
    };

    const docRef = await adminDb.collection('analysts_enhanced').add(analyst);
    return docRef.id;
  }

  /**
   * Record a new analyst recommendation
   */
  async recordRecommendation(rec: {
    analystId: string;
    ticker: string;
    action: 'BUY' | 'HOLD' | 'SELL';
    confidence?: number;
    horizonDays?: number;
    targetPrice?: number;
    note?: string;
    sector?: string;
  }): Promise<string> {
    const now = new Date();
    
    // Get current price from Polygon
    const p0 = await this.getPriceAt(rec.ticker, now);
    
    // Determine benchmark based on sector
    const benchmark = rec.sector ? 
      EnhancedAnalystTracker.SECTOR_BENCHMARKS[rec.sector] || EnhancedAnalystTracker.CONFIG.BENCHMARK_DEFAULT :
      EnhancedAnalystTracker.CONFIG.BENCHMARK_DEFAULT;

    const recommendation: Omit<AnalystRecommendation, 'id'> = {
      analyst_id: rec.analystId,
      ticker: rec.ticker,
      action: rec.action,
      confidence: rec.confidence,
      horizon_days: rec.horizonDays || EnhancedAnalystTracker.CONFIG.DEFAULT_HORIZON_DAYS,
      target_price: rec.targetPrice,
      note: rec.note,
      t0: now,
      p0,
      benchmark,
      status: 'OPEN',
      created_at: now
    };

    const docRef = await adminDb.collection('analyst_recommendations_enhanced').add(recommendation);
    
    console.log(`Recorded recommendation: ${rec.action} ${rec.ticker} at $${p0} by analyst ${rec.analystId}`);
    return docRef.id;
  }

  /**
   * Run the daily evaluator to assess open recommendations
   */
  async runEvaluator(now: Date = new Date()): Promise<{
    evaluated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let evaluated = 0;

    try {
      // Get open recommendations that have reached their horizon
      const openRecs = await adminDb
        .collection('analyst_recommendations_enhanced')
        .where('status', '==', 'OPEN')
        .get();

      console.log(`Found ${openRecs.docs.length} open recommendations to check`);

      for (const doc of openRecs.docs) {
        const rec = { id: doc.id, ...doc.data() } as AnalystRecommendation;
        
        // Check if horizon has been reached
        const daysSinceRec = Math.floor((now.getTime() - rec.t0.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceRec < rec.horizon_days) {
          continue; // Not ready for evaluation yet
        }

        try {
          await this.evaluateRecommendation(rec, now);
          evaluated++;
        } catch (error) {
          const errorMsg = `Failed to evaluate recommendation ${rec.id}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`Evaluator completed: ${evaluated} recommendations evaluated, ${errors.length} errors`);
      return { evaluated, errors };
      
    } catch (error) {
      const errorMsg = `Evaluator failed: ${error}`;
      console.error(errorMsg);
      return { evaluated, errors: [errorMsg] };
    }
  }

  /**
   * Evaluate a single recommendation and update analyst score
   */
  private async evaluateRecommendation(rec: AnalystRecommendation, t1: Date): Promise<void> {
    // Get current price and benchmark prices
    const p1 = await this.getPriceAt(rec.ticker, t1);
    const bench0 = await this.getPriceAt(rec.benchmark, new Date(rec.t0));
    const bench1 = await this.getPriceAt(rec.benchmark, t1);

    // Calculate returns
    const absReturn = (p1 - rec.p0) / rec.p0;
    const benchReturn = (bench1 - bench0) / bench0;
    const alpha = absReturn - benchReturn;

    // Classify outcome
    const outcome = this.classifyOutcome(rec.action, alpha);
    const outcomeValue = this.outcomeToValue(outcome);

    // Get current analyst data
    const analystDoc = await adminDb.collection('analysts_enhanced').doc(rec.analyst_id).get();
    if (!analystDoc.exists) {
      throw new Error(`Analyst ${rec.analyst_id} not found`);
    }
    
    const analyst = analystDoc.data() as Analyst;

    // Calculate score update using Elo-like algorithm
    const daysSince = Math.floor((t1.getTime() - rec.t0.getTime()) / (1000 * 60 * 60 * 24));
    const freshness = Math.exp(-daysSince / EnhancedAnalystTracker.CONFIG.FRESHNESS_DECAY_DAYS);
    const confidence = rec.confidence ?? 0.7;
    const K = EnhancedAnalystTracker.CONFIG.SCORE_K_BASE * freshness * (0.5 + 0.5 * confidence);

    const expectedProb = this.expectedProbability(analyst.score);
    const scoreDelta = K * (outcomeValue - expectedProb);
    const newScore = Math.max(0, Math.min(100, analyst.score + scoreDelta));

    // Create evaluation record
    const evaluation: Omit<AnalystEvaluation, 'id'> = {
      recommendation_id: rec.id,
      horizon_days: rec.horizon_days,
      t1,
      p1,
      bench_return: benchReturn,
      abs_return: absReturn,
      alpha,
      outcome,
      score_delta: scoreDelta,
      created_at: new Date()
    };

    // Update database atomically
    const batch = adminDb.batch();

    // Add evaluation
    const evalRef = adminDb.collection('analyst_evaluations_enhanced').doc();
    batch.set(evalRef, evaluation);

    // Update recommendation status
    const recRef = adminDb.collection('analyst_recommendations_enhanced').doc(rec.id);
    batch.update(recRef, { status: 'CLOSED' });

    // Update analyst score and stats
    const analystRef = adminDb.collection('analysts_enhanced').doc(rec.analyst_id);
    const newLifetimeCalls = analyst.lifetime_calls + 1;
    batch.update(analystRef, {
      score: newScore,
      lifetime_calls: newLifetimeCalls,
      updated_at: new Date(),
      tier: this.calculateTier(newScore, newLifetimeCalls)
    });

    await batch.commit();

    console.log(`Evaluated: ${rec.ticker} ${rec.action} -> ${outcome} (α=${(alpha * 100).toFixed(2)}%, Δ${scoreDelta.toFixed(1)})`);
  }

  /**
   * Classify outcome based on action and alpha
   */
  private classifyOutcome(action: 'BUY' | 'HOLD' | 'SELL', alpha: number): 'CORRECT' | 'NEUTRAL' | 'INCORRECT' {
    const { POS, NEG, HOLD_UPPER, HOLD_LOWER } = EnhancedAnalystTracker.CONFIG.OUTCOME_THRESHOLDS;

    if (action === 'BUY') {
      return alpha >= POS ? 'CORRECT' : alpha <= NEG ? 'INCORRECT' : 'NEUTRAL';
    }
    
    if (action === 'SELL') {
      return alpha <= NEG ? 'CORRECT' : alpha >= POS ? 'INCORRECT' : 'NEUTRAL';
    }
    
    // HOLD
    return alpha > HOLD_LOWER && alpha < HOLD_UPPER ? 'CORRECT' : 'NEUTRAL';
  }

  /**
   * Convert outcome to numerical value for Elo calculation
   */
  private outcomeToValue(outcome: 'CORRECT' | 'NEUTRAL' | 'INCORRECT'): number {
    switch (outcome) {
      case 'CORRECT': return 1.0;
      case 'NEUTRAL': return 0.5;
      case 'INCORRECT': return 0.0;
    }
  }

  /**
   * Calculate expected probability for Elo-like scoring
   */
  private expectedProbability(score: number): number {
    return 1 / (1 + Math.pow(10, (50 - score) / 20));
  }

  /**
   * Calculate analyst tier based on score and experience
   */
  private calculateTier(score: number, lifetimeCalls: number): 'TOP_TIER' | 'RISING' | 'NEW' {
    const { TOP_TIER, RISING, MIN_CALLS_FOR_TIER } = EnhancedAnalystTracker.CONFIG.TIER_THRESHOLDS;
    
    if (lifetimeCalls < MIN_CALLS_FOR_TIER) {
      return 'NEW';
    }
    
    if (score >= TOP_TIER) {
      return 'TOP_TIER';
    }
    
    if (score >= RISING) {
      return 'RISING';
    }
    
    return 'NEW';
  }

  /**
   * Get price at a specific time using Polygon
   */
  private async getPriceAt(ticker: string, when: Date): Promise<number> {
    try {
      // Use the existing polygon tool
      const dateStr = when.toISOString().slice(0, 10);
      const priceData = await this.polygonTool.getStockAggregates(ticker, 1, 'day', dateStr, dateStr);
      
      if (priceData?.results?.length > 0) {
        return priceData.results[0].c; // close price
      }
      
      // Fallback: try to get latest price
      const snapshot = await this.polygonTool.getSnapshot(ticker);
      if (snapshot?.lastQuote?.price) {
        return snapshot.lastQuote.price;
      }
      
      throw new Error(`No price data available for ${ticker} on ${dateStr}`);
    } catch (error) {
      console.error(`Error fetching price for ${ticker}:`, error);
      // Return a reasonable fallback price for development
      return 100; // This should be replaced with proper error handling in production
    }
  }

  /**
   * Get analyst profile with recent performance
   */
  async getAnalystProfile(analystId: string): Promise<{
    analyst: Analyst;
    recentCalls: AnalystRecommendation[];
    evaluations: AnalystEvaluation[];
    performance: {
      winRate: number;
      avgAlpha: number;
      callsByAction: Record<string, number>;
      outcomesByAction: Record<string, Record<string, number>>;
    };
  }> {
    // Get analyst data
    const analystDoc = await adminDb.collection('analysts_enhanced').doc(analystId).get();
    if (!analystDoc.exists) {
      throw new Error(`Analyst ${analystId} not found`);
    }
    const analyst = { id: analystDoc.id, ...analystDoc.data() } as Analyst;

    // Get recent calls (last 20)
    const callsSnapshot = await adminDb
      .collection('analyst_recommendations_enhanced')
      .where('analyst_id', '==', analystId)
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();
    
    const recentCalls = callsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as AnalystRecommendation));

    // Get evaluations for these calls
    const callIds = recentCalls.map(call => call.id);
    const evaluations: AnalystEvaluation[] = [];
    
    if (callIds.length > 0) {
      // Get evaluations in batches (Firestore limit)
      const batchSize = 10;
      for (let i = 0; i < callIds.length; i += batchSize) {
        const batch = callIds.slice(i, i + batchSize);
        const evalSnapshot = await adminDb
          .collection('analyst_evaluations_enhanced')
          .where('recommendation_id', 'in', batch)
          .get();
        
        evaluations.push(...evalSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AnalystEvaluation)));
      }
    }

    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(recentCalls, evaluations);

    return {
      analyst,
      recentCalls,
      evaluations,
      performance
    };
  }

  /**
   * Calculate performance metrics for an analyst
   */
  private calculatePerformanceMetrics(
    calls: AnalystRecommendation[],
    evaluations: AnalystEvaluation[]
  ) {
    const evalMap = new Map(evaluations.map(e => [e.recommendation_id, e]));
    const evaluatedCalls = calls.filter(call => evalMap.has(call.id));

    const callsByAction: Record<string, number> = {};
    const outcomesByAction: Record<string, Record<string, number>> = {};
    
    let totalCorrect = 0;
    let totalAlpha = 0;
    let totalEvaluated = 0;

    for (const call of evaluatedCalls) {
      const evaluation = evalMap.get(call.id)!;
      
      // Count calls by action
      callsByAction[call.action] = (callsByAction[call.action] || 0) + 1;
      
      // Count outcomes by action
      if (!outcomesByAction[call.action]) {
        outcomesByAction[call.action] = {};
      }
      outcomesByAction[call.action][evaluation.outcome] = 
        (outcomesByAction[call.action][evaluation.outcome] || 0) + 1;
      
      // Aggregate metrics
      if (evaluation.outcome === 'CORRECT') totalCorrect++;
      totalAlpha += evaluation.alpha;
      totalEvaluated++;
    }

    return {
      winRate: totalEvaluated > 0 ? totalCorrect / totalEvaluated : 0,
      avgAlpha: totalEvaluated > 0 ? totalAlpha / totalEvaluated : 0,
      callsByAction,
      outcomesByAction
    };
  }

  /**
   * Get top analysts with pagination
   */
  async getTopAnalysts(limit: number = 50, orderBy: 'score' | 'lifetime_calls' = 'score') {
    const snapshot = await adminDb
      .collection('analysts_enhanced')
      .orderBy(orderBy, 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Analyst));
  }

  /**
   * Get credibility-weighted consensus for a ticker
   */
  async getWeightedConsensus(ticker: string, maxAge: number = 30): Promise<{
    consensus: 'BUY' | 'HOLD' | 'SELL';
    confidence: number;
    participants: Array<{
      analyst_id: string;
      action: string;
      weight: number;
      score: number;
    }>;
  }> {
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    
    // Get recent recommendations for this ticker
    const recsSnapshot = await adminDb
      .collection('analyst_recommendations_enhanced')
      .where('ticker', '==', ticker)
      .where('status', '==', 'OPEN')
      .where('created_at', '>=', cutoffDate)
      .get();

    if (recsSnapshot.empty) {
      return {
        consensus: 'HOLD',
        confidence: 0,
        participants: []
      };
    }

    const recommendations = recsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AnalystRecommendation));

    // Get analyst scores
    const analystIds = [...new Set(recommendations.map(r => r.analyst_id))];
    const analystScores = new Map<string, number>();
    
    for (const analystId of analystIds) {
      const analystDoc = await adminDb.collection('analysts_enhanced').doc(analystId).get();
      if (analystDoc.exists) {
        const analyst = analystDoc.data() as Analyst;
        analystScores.set(analystId, analyst.score);
      }
    }

    // Calculate weighted consensus
    let buyWeight = 0, holdWeight = 0, sellWeight = 0;
    const participants = [];

    for (const rec of recommendations) {
      const score = analystScores.get(rec.analyst_id) || 50;
      const weight = this.scoreToWeight(score);
      
      participants.push({
        analyst_id: rec.analyst_id,
        action: rec.action,
        weight,
        score
      });

      switch (rec.action) {
        case 'BUY': buyWeight += weight; break;
        case 'HOLD': holdWeight += weight; break;
        case 'SELL': sellWeight += weight; break;
      }
    }

    // Determine consensus
    const totalWeight = buyWeight + holdWeight + sellWeight;
    const consensus = buyWeight > holdWeight && buyWeight > sellWeight ? 'BUY' :
                     sellWeight > holdWeight && sellWeight > buyWeight ? 'SELL' : 'HOLD';
    
    const maxWeight = Math.max(buyWeight, holdWeight, sellWeight);
    const confidence = totalWeight > 0 ? maxWeight / totalWeight : 0;

    return {
      consensus,
      confidence,
      participants
    };
  }

  /**
   * Convert score to weight (normalized to 0.2-1.0 range)
   */
  private scoreToWeight(score: number): number {
    // Normalize score from 0-100 to 0.2-1.0 range
    return 0.2 + 0.8 * (score / 100);
  }
}
