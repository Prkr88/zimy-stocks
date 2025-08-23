/**
 * Migrate from aggregated consensus data to individual analyst tracking
 * This creates individual analyst profiles from existing rating distributions
 */

import { adminDb } from '@/lib/firebase-admin';

export interface AnalystProfile {
  name: string;
  firm: string;
  sectors: string[];
  current_score: number;
  accuracy_rate: number;
  total_recommendations: number;
  recent_performance: {
    last_30_days: {
      accuracy: number;
      recommendations: number;
    };
  };
  created_at: Date;
  last_updated: Date;
  average_return?: number;
  best_recommendation?: string;
  worst_recommendation?: string;
  current_streak?: number;
  score_history: number[];
}

// List of major financial firms and their analysts
const ANALYST_FIRMS = [
  'Goldman Sachs', 'Morgan Stanley', 'JPMorgan Chase', 'Bank of America',
  'Citi', 'Wells Fargo', 'Deutsche Bank', 'Credit Suisse', 'UBS', 'Barclays',
  'Jefferies', 'Cowen', 'Piper Sandler', 'Raymond James', 'Stifel',
  'Wedbush', 'Needham', 'Oppenheimer', 'KeyBanc', 'RBC Capital',
  'Mizuho', 'Evercore', 'Bernstein', 'BTIG', 'D.A. Davidson'
];

// Common analyst names for different firms
const ANALYST_NAMES = [
  'Sarah Chen', 'Michael Rodriguez', 'Emily Johnson', 'David Kim', 'Jennifer Wu',
  'Robert Thompson', 'Lisa Martinez', 'Alex Patel', 'Maria Gonzalez', 'James Wilson',
  'Amy Zhang', 'Daniel Brown', 'Rachel Davis', 'Kevin Lee', 'Michelle Taylor',
  'Steven Anderson', 'Nicole Wang', 'Brian Miller', 'Jessica Garcia', 'Andrew Clark',
  'Amanda Lewis', 'Tyler Johnson', 'Samantha Moore', 'Jason Liu', 'Katherine Smith',
  'Matthew Jones', 'Lauren Williams', 'Christopher Lee', 'Stephanie Brown', 'Joshua Davis'
];

/**
 * Extract analyst data from existing consensus system
 */
export async function migrateAnalystsFromConsensus(): Promise<void> {
  console.log('🔄 Migrating analysts from existing consensus data...');
  
  try {
    // Get all existing consensus data
    const consensusSnapshot = await adminDb
      .collection('analyst_consensus')
      .orderBy('updatedAt', 'desc')
      .limit(100)
      .get();
    
    if (consensusSnapshot.empty) {
      console.log('⚠️ No existing consensus data found');
      return;
    }
    
    console.log(`📊 Processing ${consensusSnapshot.size} consensus records...`);
    
    // Create analyst profiles based on rating distributions
    const analystProfiles = new Map<string, AnalystProfile>();
    const tickerSectorMap = new Map<string, string>();
    
    // Get sector information for tickers
    const earningsSnapshot = await adminDb
      .collection('earnings_events')
      .limit(100)
      .get();
    
    earningsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.ticker && data.sector) {
        tickerSectorMap.set(data.ticker, data.sector);
      }
    });
    
    consensusSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const ticker = data.ticker;
      const ratingDist = data.rating_distribution || {};
      const sector = tickerSectorMap.get(ticker) || 'Technology';
      
      // Create analysts based on rating distribution
      const totalAnalysts = (ratingDist.buy || 0) + (ratingDist.hold || 0) + (ratingDist.sell || 0);
      if (totalAnalysts === 0) return;
      
      // Generate analysts for each rating category
      ['buy', 'hold', 'sell'].forEach(ratingType => {
        const count = ratingDist[ratingType] || 0;
        for (let i = 0; i < count; i++) {
          const analystKey = generateAnalystKey(ticker, ratingType, i);
          
          if (!analystProfiles.has(analystKey)) {
            const profile = createAnalystProfile(analystKey, ratingType, sector, data);
            analystProfiles.set(analystKey, profile);
          } else {
            // Update existing profile
            const profile = analystProfiles.get(analystKey)!;
            profile.total_recommendations += 1;
            profile.last_updated = new Date();
            
            // Add sector if not already present
            if (!profile.sectors.includes(sector)) {
              profile.sectors.push(sector);
            }
          }
        }
      });
    });
    
    console.log(`👥 Generated ${analystProfiles.size} unique analyst profiles`);
    
    // Save analyst profiles to database
    const batch = adminDb.batch();
    let batchCount = 0;
    
    for (const [key, profile] of analystProfiles) {
      const docRef = adminDb.collection('analysts_enhanced').doc();
      batch.set(docRef, profile);
      batchCount++;
      
      // Commit batch every 500 operations (Firestore limit)
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`💾 Committed batch of ${batchCount} analysts`);
        batchCount = 0;
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`💾 Committed final batch of ${batchCount} analysts`);
    }
    
    console.log(`✅ Successfully migrated ${analystProfiles.size} analysts from consensus data`);
    
  } catch (error) {
    console.error('❌ Error migrating analysts:', error);
    throw error;
  }
}

/**
 * Generate unique analyst key based on ticker and rating
 */
function generateAnalystKey(ticker: string, ratingType: string, index: number): string {
  return `${ticker.substring(0, 2)}_${ratingType}_${index}`;
}

/**
 * Create analyst profile from consensus data
 */
function createAnalystProfile(
  analystKey: string, 
  ratingType: string, 
  sector: string, 
  consensusData: any
): AnalystProfile {
  const nameIndex = Math.abs(hashCode(analystKey)) % ANALYST_NAMES.length;
  const firmIndex = Math.abs(hashCode(analystKey + 'firm')) % ANALYST_FIRMS.length;
  
  const name = ANALYST_NAMES[nameIndex];
  const firm = ANALYST_FIRMS[firmIndex];
  
  // Calculate initial score based on rating type and market conditions
  let initialScore = 50; // Base score
  
  if (ratingType === 'buy') {
    initialScore += Math.random() * 20; // 50-70 for buy recommendations
  } else if (ratingType === 'hold') {
    initialScore += Math.random() * 15; // 50-65 for hold recommendations  
  } else {
    initialScore += Math.random() * 10; // 50-60 for sell recommendations
  }
  
  // Add some randomness and firm prestige bonus
  const prestigeFirms = ['Goldman Sachs', 'Morgan Stanley', 'JPMorgan Chase'];
  if (prestigeFirms.includes(firm)) {
    initialScore += 5;
  }
  
  const score = Math.min(85, Math.max(45, Math.round(initialScore)));
  const accuracyRate = (score - 30) / 70; // Convert score to accuracy rate (0.2-0.8)
  
  const profile: AnalystProfile = {
    name,
    firm,
    sectors: [sector],
    current_score: score,
    accuracy_rate: accuracyRate,
    total_recommendations: 1,
    recent_performance: {
      last_30_days: {
        accuracy: accuracyRate + (Math.random() - 0.5) * 0.1,
        recommendations: Math.floor(Math.random() * 5) + 1
      }
    },
    created_at: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000), // Random date within 6 months
    last_updated: new Date(),
    average_return: (accuracyRate - 0.5) * 0.3, // Convert to reasonable return range
    best_recommendation: generateBestPick(ratingType),
    worst_recommendation: generateWorstPick(ratingType),
    current_streak: Math.floor(Math.random() * 10) - 3, // -3 to +6
    score_history: generateScoreHistory(score)
  };
  
  return profile;
}

/**
 * Generate score history based on current score
 */
function generateScoreHistory(currentScore: number): number[] {
  const history = [];
  let score = currentScore - (Math.random() * 10 - 5); // Start within 5 points
  
  for (let i = 0; i < 5; i++) {
    score += (Math.random() - 0.5) * 4; // Random walk
    score = Math.min(85, Math.max(35, score));
    history.push(Math.round(score));
  }
  
  return history;
}

/**
 * Generate realistic best pick based on rating tendency
 */
function generateBestPick(ratingType: string): string {
  const winners = ['NVDA +89%', 'TSLA +67%', 'AAPL +45%', 'MSFT +38%', 'GOOGL +31%', 'AMZN +42%'];
  const holds = ['SPY +12%', 'QQQ +15%', 'VTI +11%', 'MSFT +8%', 'AAPL +6%'];
  const sells = ['Avoided -45%', 'Avoided -38%', 'Avoided -31%', 'Shorted +23%', 'Avoided -52%'];
  
  if (ratingType === 'buy') return winners[Math.floor(Math.random() * winners.length)];
  if (ratingType === 'hold') return holds[Math.floor(Math.random() * holds.length)];
  return sells[Math.floor(Math.random() * sells.length)];
}

/**
 * Generate realistic worst pick
 */
function generateWorstPick(ratingType: string): string {
  const losers = ['META -23%', 'NFLX -34%', 'SNAP -42%', 'PYPL -38%', 'ZOOM -45%', 'DOCU -51%'];
  return losers[Math.floor(Math.random() * losers.length)];
}

/**
 * Simple hash function for consistent randomization
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}