import { EnhancedAnalystTracker, Analyst } from '@/lib/analysts/enhancedAnalystTracker';

/**
 * Initialize sample analysts for the enhanced tracking system
 */
async function initializeEnhancedAnalysts() {
  const tracker = new EnhancedAnalystTracker();

  const sampleAnalysts: Array<Omit<Analyst, 'id' | 'created_at' | 'updated_at'>> = [
    {
      name: 'Sarah Chen',
      firm: 'Goldman Sachs',
      score: 75,
      lifetime_calls: 15,
      specializations: ['Technology', 'Communication Services']
    },
    {
      name: 'Michael Rodriguez', 
      firm: 'Morgan Stanley',
      score: 68,
      lifetime_calls: 12,
      specializations: ['Technology', 'Industrials']
    },
    {
      name: 'Jennifer Park',
      firm: 'JP Morgan',
      score: 82,
      lifetime_calls: 22,
      specializations: ['Health Care', 'Consumer Staples']
    },
    {
      name: 'David Thompson',
      firm: 'Barclays',
      score: 59,
      lifetime_calls: 8,
      specializations: ['Financials', 'Real Estate']
    },
    {
      name: 'Lisa Wang',
      firm: 'Credit Suisse',
      score: 71,
      lifetime_calls: 18,
      specializations: ['Energy', 'Materials']
    },
    {
      name: 'Robert Kim',
      firm: 'Deutsche Bank',
      score: 85,
      lifetime_calls: 31,
      specializations: ['Technology', 'Consumer Discretionary']
    },
    {
      name: 'Maria Gonzalez',
      firm: 'UBS',
      score: 63,
      lifetime_calls: 9,
      specializations: ['Utilities', 'Energy']
    },
    {
      name: 'James Wilson',
      firm: 'Wells Fargo',
      score: 78,
      lifetime_calls: 25,
      specializations: ['Financials', 'Technology']
    }
  ];

  console.log('Initializing enhanced analyst tracking system...');

  const results = [];
  for (const analystData of sampleAnalysts) {
    try {
      const analystId = await tracker.createAnalyst(analystData);
      console.log(`Created analyst: ${analystData.name} (${analystData.firm}) - ID: ${analystId}`);
      
      results.push({
        id: analystId,
        name: analystData.name,
        firm: analystData.firm,
        score: analystData.score
      });
    } catch (error) {
      console.error(`Failed to create analyst ${analystData.name}:`, error);
    }
  }

  // Add some sample recommendations for demonstration
  console.log('\nAdding sample recommendations...');
  
  if (results.length > 0) {
    const sampleRecommendations = [
      {
        analystId: results[0].id,
        ticker: 'AAPL',
        action: 'BUY' as const,
        confidence: 0.8,
        horizonDays: 30,
        targetPrice: 200,
        note: 'Strong iPhone sales expected',
        sector: 'Technology'
      },
      {
        analystId: results[1].id,
        ticker: 'MSFT',
        action: 'BUY' as const,
        confidence: 0.9,
        horizonDays: 90,
        targetPrice: 450,
        note: 'Azure growth continuing strong',
        sector: 'Technology'
      },
      {
        analystId: results[2].id,
        ticker: 'JNJ',
        action: 'HOLD' as const,
        confidence: 0.7,
        horizonDays: 60,
        note: 'Waiting for drug pipeline updates',
        sector: 'Health Care'
      },
      {
        analystId: results[3].id,
        ticker: 'JPM',
        action: 'BUY' as const,
        confidence: 0.75,
        horizonDays: 45,
        targetPrice: 180,
        note: 'Interest rate environment favorable',
        sector: 'Financials'
      },
      {
        analystId: results[4].id,
        ticker: 'XOM',
        action: 'SELL' as const,
        confidence: 0.6,
        horizonDays: 30,
        note: 'Oil price concerns',
        sector: 'Energy'
      }
    ];

    for (const rec of sampleRecommendations) {
      try {
        const recId = await tracker.recordRecommendation(rec);
        console.log(`Recorded: ${rec.action} ${rec.ticker} by ${results.find(r => r.id === rec.analystId)?.name} - ID: ${recId}`);
      } catch (error) {
        console.error(`Failed to record recommendation for ${rec.ticker}:`, error);
      }
    }
  }

  console.log(`\n✅ Enhanced analyst system initialized:`);
  console.log(`- ${results.length} analysts created`);
  console.log(`- Sample recommendations added`);
  console.log(`- Ready for evaluation and consensus tracking`);

  return {
    success: true,
    analysts: results,
    message: 'Enhanced analyst system initialized successfully'
  };
}

export { initializeEnhancedAnalysts };