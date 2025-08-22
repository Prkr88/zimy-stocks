import { NextRequest, NextResponse } from 'next/server';
import { EnhancedAnalystTracker } from '@/lib/analysts/enhancedAnalystTracker';

const tracker = new EnhancedAnalystTracker();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'record_recommendation':
        return await recordRecommendation(body);
      case 'get_consensus':
        return await getWeightedConsensus(body);
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: record_recommendation, get_consensus'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in recommendations API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

async function recordRecommendation(data: {
  analystId: string;
  ticker: string;
  action: 'BUY' | 'HOLD' | 'SELL';
  confidence?: number;
  horizonDays?: number;
  targetPrice?: number;
  note?: string;
  sector?: string;
}) {
  try {
    const { analystId, ticker, action, confidence, horizonDays, targetPrice, note, sector } = data;
    
    if (!analystId || !ticker || !action) {
      return NextResponse.json({
        success: false,
        error: 'analystId, ticker, and action are required'
      }, { status: 400 });
    }
    
    if (!['BUY', 'HOLD', 'SELL'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'action must be BUY, HOLD, or SELL'
      }, { status: 400 });
    }
    
    const recommendationId = await tracker.recordRecommendation({
      analystId,
      ticker: ticker.toUpperCase(),
      action,
      confidence,
      horizonDays,
      targetPrice,
      note,
      sector
    });
    
    return NextResponse.json({
      success: true,
      recommendation_id: recommendationId,
      message: `Recorded ${action} recommendation for ${ticker}`
    });
  } catch (error) {
    console.error('Error recording recommendation:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record recommendation'
    }, { status: 500 });
  }
}

async function getWeightedConsensus(data: {
  ticker: string;
  maxAge?: number;
}) {
  try {
    const { ticker, maxAge = 30 } = data;
    
    if (!ticker) {
      return NextResponse.json({
        success: false,
        error: 'ticker is required'
      }, { status: 400 });
    }
    
    const consensus = await tracker.getWeightedConsensus(ticker.toUpperCase(), maxAge);
    
    return NextResponse.json({
      success: true,
      ticker: ticker.toUpperCase(),
      ...consensus
    });
  } catch (error) {
    console.error('Error getting weighted consensus:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get weighted consensus'
    }, { status: 500 });
  }
}