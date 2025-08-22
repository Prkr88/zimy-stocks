import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { AnalystCredibilityTracker, AnalystCredibility } from '@/lib/credibility/analystCredibility';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const analystId = searchParams.get('analyst_id');
    const ticker = searchParams.get('ticker');
    
    if (analystId) {
      // Get specific analyst credibility
      const doc = await adminDb.collection('analyst_credibility').doc(analystId).get();
      if (!doc.exists) {
        return NextResponse.json({ 
          success: false, 
          error: 'Analyst not found' 
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        analyst: doc.data()
      });
    }
    
    if (ticker) {
      // Get all analysts covering a specific ticker
      const snapshot = await adminDb
        .collection('analyst_credibility')
        .where('covered_tickers', 'array-contains', ticker)
        .orderBy('credibility_score', 'desc')
        .get();
      
      const analysts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return NextResponse.json({
        success: true,
        analysts,
        count: analysts.length
      });
    }
    
    // Get top analysts overall
    const snapshot = await adminDb
      .collection('analyst_credibility')
      .orderBy('credibility_score', 'desc')
      .limit(50)
      .get();
    
    const topAnalysts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({
      success: true,
      top_analysts: topAnalysts
    });
    
  } catch (error) {
    console.error('Error fetching analyst credibility:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analyst credibility data'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'update_performance':
        return await updateAnalystPerformance(body);
      case 'calculate_weighted_consensus':
        return await calculateWeightedConsensus(body);
      case 'initialize_analyst':
        return await initializeAnalyst(body);
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in analyst credibility API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

async function updateAnalystPerformance(data: {
  analyst_id: string;
  prediction: {
    type: 'rating' | 'price_target' | 'eps';
    predicted_value: any;
    actual_value: any;
    ticker: string;
    date: string;
  };
}) {
  const { analyst_id, prediction } = data;
  
  // Get current analyst data
  const analystRef = adminDb.collection('analyst_credibility').doc(analyst_id);
  const analystDoc = await analystRef.get();
  
  let analystData: Partial<AnalystCredibility>;
  
  if (analystDoc.exists) {
    analystData = analystDoc.data() as AnalystCredibility;
  } else {
    // Initialize new analyst
    analystData = {
      analyst_id,
      analyst_name: `Analyst_${analyst_id}`,
      firm: 'Unknown',
      credibility_score: 0.5,
      track_record: {
        total_predictions: 0,
        accurate_predictions: 0,
        accuracy_rate: 0.5,
        last_updated: new Date()
      },
      specializations: [],
      historical_performance: {
        rating_accuracy: 0.5,
        price_target_accuracy: 0.5,
        timing_accuracy: 0.5,
        eps_accuracy: 0.5
      },
      recent_performance: {
        last_30_days: 0.5,
        last_90_days: 0.5,
        last_year: 0.5
      },
      weight_multiplier: 1.0
    };
  }
  
  // Update performance based on prediction
  const performanceUpdate = AnalystCredibilityTracker.updateAnalystPerformance(analyst_id, {
    ...prediction,
    date: new Date(prediction.date)
  });
  
  // Merge updates
  if (performanceUpdate.track_record && analystData.track_record) {
    const currentTotal = analystData.track_record.total_predictions || 0;
    const currentAccurate = analystData.track_record.accurate_predictions || 0;
    
    analystData.track_record = {
      total_predictions: currentTotal + 1,
      accurate_predictions: currentAccurate + performanceUpdate.track_record.accurate_predictions,
      accuracy_rate: (currentAccurate + performanceUpdate.track_record.accurate_predictions) / (currentTotal + 1),
      last_updated: new Date()
    };
  }
  
  // Recalculate credibility score
  const credibilityCalc = AnalystCredibilityTracker.calculateCredibilityScore(analystData);
  analystData.credibility_score = credibilityCalc.final_score;
  
  // Save to database
  await analystRef.set(analystData, { merge: true });
  
  return NextResponse.json({
    success: true,
    analyst_id,
    updated_credibility: credibilityCalc,
    message: 'Analyst performance updated successfully'
  });
}

async function calculateWeightedConsensus(data: {
  ticker: string;
  ratings: Array<{
    analyst_id: string;
    rating: string;
    price_target?: number;
    date: string;
  }>;
}) {
  const { ticker, ratings } = data;
  
  // Fetch credibility scores for all analysts
  const analystIds = ratings.map(r => r.analyst_id);
  const analystDocs = await Promise.all(
    analystIds.map(id => adminDb.collection('analyst_credibility').doc(id).get())
  );
  
  const ratingsWithCredibility = ratings.map((rating, index) => {
    const analystDoc = analystDocs[index];
    const credibility = analystDoc.exists 
      ? analystDoc.data()?.credibility_score || 0.5 
      : 0.5;
    
    return {
      ...rating,
      credibility
    };
  });
  
  // Calculate weighted consensus
  const weightedResult = AnalystCredibilityTracker.calculateWeightedRating(
    ratingsWithCredibility.map(r => ({
      rating: r.rating,
      credibility: r.credibility,
      analyst_id: r.analyst_id
    }))
  );
  
  return NextResponse.json({
    success: true,
    ticker,
    weighted_consensus: weightedResult,
    analyst_breakdown: ratingsWithCredibility
  });
}

async function initializeAnalyst(data: {
  analyst_id: string;
  analyst_name: string;
  firm: string;
  specializations?: string[];
}) {
  const { analyst_id, analyst_name, firm, specializations = [] } = data;
  
  const analystData: AnalystCredibility = {
    analyst_id,
    analyst_name,
    firm,
    credibility_score: 0.5,
    track_record: {
      total_predictions: 0,
      accurate_predictions: 0,
      accuracy_rate: 0.5,
      last_updated: new Date()
    },
    specializations,
    historical_performance: {
      rating_accuracy: 0.5,
      price_target_accuracy: 0.5,
      timing_accuracy: 0.5,
      eps_accuracy: 0.5
    },
    recent_performance: {
      last_30_days: 0.5,
      last_90_days: 0.5,
      last_year: 0.5
    },
    weight_multiplier: 1.0
  };
  
  await adminDb.collection('analyst_credibility').doc(analyst_id).set(analystData);
  
  return NextResponse.json({
    success: true,
    message: 'Analyst initialized successfully',
    analyst: analystData
  });
}