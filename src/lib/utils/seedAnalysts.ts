/**
 * Utility to seed sample analyst data for testing
 * This creates realistic analyst profiles with performance metrics
 */

import { adminDb } from '@/lib/firebase-admin';

export interface SampleAnalyst {
  name: string;
  firm: string;
  current_score: number;
  accuracy_rate: number;
  total_recommendations: number;
  sectors: string[];
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

const realAnalysts: Omit<SampleAnalyst, 'created_at' | 'last_updated'>[] = [
  // Top tier firms and individual strategists
  {
    name: 'David Kostin',
    firm: 'Goldman Sachs',
    current_score: 85,
    accuracy_rate: 0.82,
    total_recommendations: 124,
    sectors: ['Financial Services', 'Technology', 'Healthcare'],
    recent_performance: {
      last_30_days: { accuracy: 0.88, recommendations: 8 }
    },
    average_return: 0.152,
    best_recommendation: 'S&P 500 2024 outlook',
    worst_recommendation: 'Q1 correction call',
    current_streak: 6,
    score_history: [80, 82, 83, 84, 85]
  },
  {
    name: 'Dubravko Lakos-Bujas',
    firm: 'J.P. Morgan',
    current_score: 83,
    accuracy_rate: 0.80,
    total_recommendations: 142,
    sectors: ['Financial Services', 'Technology', 'Energy'],
    recent_performance: {
      last_30_days: { accuracy: 0.85, recommendations: 10 }
    },
    average_return: 0.145,
    best_recommendation: 'Tech rebound call',
    worst_recommendation: 'Energy sector timing',
    current_streak: 4,
    score_history: [78, 80, 81, 82, 83]
  },
  {
    name: 'Bruce Kasman',
    firm: 'J.P. Morgan',
    current_score: 81,
    accuracy_rate: 0.78,
    total_recommendations: 156,
    sectors: ['Macro Economics', 'Financial Services'],
    recent_performance: {
      last_30_days: { accuracy: 0.82, recommendations: 6 }
    },
    average_return: 0.138,
    best_recommendation: 'Fed policy pivot',
    worst_recommendation: 'Inflation timing',
    current_streak: 3,
    score_history: [76, 78, 79, 80, 81]
  },
  {
    name: 'Michael Wilson',
    firm: 'Morgan Stanley',
    current_score: 84,
    accuracy_rate: 0.81,
    total_recommendations: 189,
    sectors: ['Technology', 'Healthcare', 'Consumer Cyclical'],
    recent_performance: {
      last_30_days: { accuracy: 0.86, recommendations: 12 }
    },
    average_return: 0.148,
    best_recommendation: 'Bear market call 2022',
    worst_recommendation: 'Tech bounce timing',
    current_streak: 5,
    score_history: [79, 81, 82, 83, 84]
  },
  {
    name: 'Andrew Slimmon',
    firm: 'Morgan Stanley',
    current_score: 79,
    accuracy_rate: 0.76,
    total_recommendations: 167,
    sectors: ['Technology', 'Consumer Cyclical', 'Industrials'],
    recent_performance: {
      last_30_days: { accuracy: 0.80, recommendations: 9 }
    },
    average_return: 0.125,
    best_recommendation: 'Value rotation call',
    worst_recommendation: 'Growth timing miss',
    current_streak: 2,
    score_history: [74, 76, 77, 78, 79]
  },
  {
    name: 'Savita Subramanian',
    firm: 'Bank of America',
    current_score: 82,
    accuracy_rate: 0.79,
    total_recommendations: 203,
    sectors: ['Financial Services', 'Technology', 'Real Estate'],
    recent_performance: {
      last_30_days: { accuracy: 0.84, recommendations: 11 }
    },
    average_return: 0.142,
    best_recommendation: 'Financials outperform',
    worst_recommendation: 'REIT weakness call',
    current_streak: 7,
    score_history: [77, 79, 80, 81, 82]
  },
  {
    name: 'Scott T. Chronert',
    firm: 'Citi',
    current_score: 76,
    accuracy_rate: 0.73,
    total_recommendations: 134,
    sectors: ['Financial Services', 'Energy', 'Materials'],
    recent_performance: {
      last_30_days: { accuracy: 0.77, recommendations: 7 }
    },
    average_return: 0.118,
    best_recommendation: 'Energy sector recovery',
    worst_recommendation: 'Materials downturn',
    current_streak: 1,
    score_history: [71, 73, 74, 75, 76]
  },
  {
    name: 'Venu Krishna',
    firm: 'Barclays',
    current_score: 78,
    accuracy_rate: 0.75,
    total_recommendations: 156,
    sectors: ['Technology', 'Healthcare', 'Communication Services'],
    recent_performance: {
      last_30_days: { accuracy: 0.79, recommendations: 8 }
    },
    average_return: 0.128,
    best_recommendation: 'Cloud infrastructure play',
    worst_recommendation: 'Telecom underweight',
    current_streak: 3,
    score_history: [73, 75, 76, 77, 78]
  },
  {
    name: 'Tom Lee',
    firm: 'Fundstrat Global Advisors',
    current_score: 87,
    accuracy_rate: 0.84,
    total_recommendations: 198,
    sectors: ['Technology', 'Communication Services', 'Consumer Cyclical'],
    recent_performance: {
      last_30_days: { accuracy: 0.90, recommendations: 15 }
    },
    average_return: 0.168,
    best_recommendation: 'Bitcoin $100k call',
    worst_recommendation: 'Q4 2022 timing',
    current_streak: 8,
    score_history: [82, 84, 85, 86, 87]
  },
  {
    name: 'Peter Berezin',
    firm: 'BCA Research',
    current_score: 75,
    accuracy_rate: 0.72,
    total_recommendations: 89,
    sectors: ['Macro Economics', 'Financial Services', 'Materials'],
    recent_performance: {
      last_30_days: { accuracy: 0.75, recommendations: 5 }
    },
    average_return: 0.112,
    best_recommendation: 'Commodity cycle top',
    worst_recommendation: 'Dollar strength timing',
    current_streak: 0,
    score_history: [70, 72, 73, 74, 75]
  },
  {
    name: 'Barry Bannister',
    firm: 'Stifel',
    current_score: 73,
    accuracy_rate: 0.70,
    total_recommendations: 112,
    sectors: ['Financial Services', 'Industrials', 'Energy'],
    recent_performance: {
      last_30_days: { accuracy: 0.73, recommendations: 6 }
    },
    average_return: 0.098,
    best_recommendation: 'Industrial recovery',
    worst_recommendation: 'Energy volatility',
    current_streak: -1,
    score_history: [68, 70, 71, 72, 73]
  },
  {
    name: 'Mohamed El-Erian',
    firm: "Queens' College, Cambridge",
    current_score: 80,
    accuracy_rate: 0.77,
    total_recommendations: 67,
    sectors: ['Macro Economics', 'Financial Services'],
    recent_performance: {
      last_30_days: { accuracy: 0.81, recommendations: 3 }
    },
    average_return: 0.135,
    best_recommendation: 'Fed policy framework',
    worst_recommendation: 'Inflation persistence',
    current_streak: 4,
    score_history: [75, 77, 78, 79, 80]
  },
  {
    name: 'Nouriel Roubini',
    firm: 'Roubini Macro Associates',
    current_score: 74,
    accuracy_rate: 0.71,
    total_recommendations: 45,
    sectors: ['Macro Economics', 'Financial Services', 'Geopolitics'],
    recent_performance: {
      last_30_days: { accuracy: 0.74, recommendations: 2 }
    },
    average_return: 0.105,
    best_recommendation: '2008 Crisis prediction',
    worst_recommendation: 'Crypto total collapse',
    current_streak: 2,
    score_history: [69, 71, 72, 73, 74]
  },
  // Additional HSBC representation (firm-level)
  {
    name: 'HSBC Research Team',
    firm: 'HSBC',
    current_score: 77,
    accuracy_rate: 0.74,
    total_recommendations: 134,
    sectors: ['Financial Services', 'Energy', 'Materials', 'Emerging Markets'],
    recent_performance: {
      last_30_days: { accuracy: 0.78, recommendations: 8 }
    },
    average_return: 0.121,
    best_recommendation: 'Asia-Pacific recovery',
    worst_recommendation: 'European banks timing',
    current_streak: 2,
    score_history: [72, 74, 75, 76, 77]
  }
];

/**
 * Seed the database with sample analyst data
 */
export async function seedRealAnalysts(): Promise<void> {
  console.log('🌱 Seeding real analyst data...');
  
  try {
    const batch = adminDb.batch();
    const now = new Date();
    
    for (const analyst of realAnalysts) {
      const docRef = adminDb.collection('analysts_enhanced').doc();
      
      const analystData: SampleAnalyst = {
        ...analyst,
        created_at: new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date within last year
        last_updated: now
      };
      
      batch.set(docRef, analystData);
    }
    
    await batch.commit();
    console.log(`✅ Successfully seeded ${realAnalysts.length} real analysts`);
    
  } catch (error) {
    console.error('❌ Error seeding real analysts:', error);
    throw error;
  }
}

/**
 * Clear all analyst data (for testing)
 */
export async function clearAnalysts(): Promise<void> {
  console.log('🧹 Clearing analyst data...');
  
  try {
    const snapshot = await adminDb.collection('analysts_enhanced').get();
    const batch = adminDb.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ Successfully cleared ${snapshot.docs.length} analyst records`);
    
  } catch (error) {
    console.error('❌ Error clearing sample analysts:', error);
    throw error;
  }
}