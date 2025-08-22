import { adminDb } from '@/lib/firebase-admin';
import { AnalystCredibility } from '@/lib/credibility/analystCredibility';

/**
 * Initialize sample analyst credibility data for demonstration
 */
async function initializeAnalystCredibilityData() {
  const sampleAnalysts: AnalystCredibility[] = [
    {
      analyst_id: 'analyst_1',
      analyst_name: 'Sarah Chen',
      firm: 'Goldman Sachs',
      credibility_score: 0.85,
      track_record: {
        total_predictions: 127,
        accurate_predictions: 108,
        accuracy_rate: 0.85,
        last_updated: new Date()
      },
      specializations: ['tech', 'cloud'],
      historical_performance: {
        rating_accuracy: 0.87,
        price_target_accuracy: 0.82,
        timing_accuracy: 0.79,
        eps_accuracy: 0.86
      },
      recent_performance: {
        last_30_days: 0.88,
        last_90_days: 0.85,
        last_year: 0.84
      },
      weight_multiplier: 1.2
    },
    {
      analyst_id: 'analyst_2',
      analyst_name: 'Michael Rodriguez',
      firm: 'Morgan Stanley',
      credibility_score: 0.78,
      track_record: {
        total_predictions: 95,
        accurate_predictions: 74,
        accuracy_rate: 0.78,
        last_updated: new Date()
      },
      specializations: ['tech', 'semiconductors'],
      historical_performance: {
        rating_accuracy: 0.81,
        price_target_accuracy: 0.75,
        timing_accuracy: 0.72,
        eps_accuracy: 0.83
      },
      recent_performance: {
        last_30_days: 0.82,
        last_90_days: 0.78,
        last_year: 0.76
      },
      weight_multiplier: 1.1
    },
    {
      analyst_id: 'analyst_3',
      analyst_name: 'Jennifer Park',
      firm: 'JP Morgan',
      credibility_score: 0.72,
      track_record: {
        total_predictions: 83,
        accurate_predictions: 60,
        accuracy_rate: 0.72,
        last_updated: new Date()
      },
      specializations: ['tech', 'e-commerce'],
      historical_performance: {
        rating_accuracy: 0.74,
        price_target_accuracy: 0.69,
        timing_accuracy: 0.71,
        eps_accuracy: 0.75
      },
      recent_performance: {
        last_30_days: 0.75,
        last_90_days: 0.72,
        last_year: 0.70
      },
      weight_multiplier: 1.0
    },
    {
      analyst_id: 'analyst_4',
      analyst_name: 'David Thompson',
      firm: 'Barclays',
      credibility_score: 0.91,
      track_record: {
        total_predictions: 156,
        accurate_predictions: 142,
        accuracy_rate: 0.91,
        last_updated: new Date()
      },
      specializations: ['tech', 'saas', 'cloud'],
      historical_performance: {
        rating_accuracy: 0.93,
        price_target_accuracy: 0.89,
        timing_accuracy: 0.88,
        eps_accuracy: 0.92
      },
      recent_performance: {
        last_30_days: 0.94,
        last_90_days: 0.91,
        last_year: 0.90
      },
      weight_multiplier: 1.5
    },
    {
      analyst_id: 'analyst_5',
      analyst_name: 'Lisa Wang',
      firm: 'Credit Suisse',
      credibility_score: 0.65,
      track_record: {
        total_predictions: 72,
        accurate_predictions: 47,
        accuracy_rate: 0.65,
        last_updated: new Date()
      },
      specializations: ['tech', 'hardware'],
      historical_performance: {
        rating_accuracy: 0.68,
        price_target_accuracy: 0.62,
        timing_accuracy: 0.61,
        eps_accuracy: 0.69
      },
      recent_performance: {
        last_30_days: 0.67,
        last_90_days: 0.65,
        last_year: 0.63
      },
      weight_multiplier: 0.8
    }
  ];

  console.log('Initializing analyst credibility data...');

  const batch = adminDb.batch();
  
  sampleAnalysts.forEach((analyst) => {
    const docRef = adminDb.collection('analyst_credibility').doc(analyst.analyst_id);
    
    // Add covered tickers for demo
    const analystWithTickers = {
      ...analyst,
      covered_tickers: [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 
        'TSLA', 'CRM', 'ADBE', 'ORCL', 'AVGO', 'CSCO'
      ]
    };
    
    batch.set(docRef, analystWithTickers);
  });

  try {
    await batch.commit();
    console.log(`Successfully initialized ${sampleAnalysts.length} analyst credibility records`);
    
    // Verify data was created
    const snapshot = await adminDb.collection('analyst_credibility').get();
    console.log(`Total analyst records in database: ${snapshot.docs.length}`);
    
    return {
      success: true,
      count: sampleAnalysts.length,
      message: 'Analyst credibility data initialized successfully'
    };
  } catch (error) {
    console.error('Error initializing analyst data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export { initializeAnalystCredibilityData };