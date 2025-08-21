import { NextRequest, NextResponse } from 'next/server';
import { createAnalystConsensusAgent } from '@/lib/agents/analystConsensusAgent';
import { createEnhancedEarningsAgent } from '@/lib/agents/enhancedEarningsAgent';
import { createSentimentAgent } from '@/lib/agents/sentimentAgent';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Analyst Insights API Endpoint
 * GET /api/stocks/[ticker]/analyst-insights
 * POST /api/stocks/[ticker]/analyst-insights
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'get';
    
    console.log(`GET analyst insights for ${ticker}, action: ${action}`);
    
    if (action === 'get') {
      // Retrieve existing analyst insights from database
      const insights = await getStoredAnalystInsights(ticker);
      
      return NextResponse.json({
        success: true,
        ticker,
        insights,
        cached: true
      });
    } else if (action === 'status') {
      // Check what data is available
      const status = await checkDataAvailability(ticker);
      
      return NextResponse.json({
        success: true,
        ticker,
        status
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "get" or "status".' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in analyst insights GET:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve analyst insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const body = await request.json();
    const { action, updateConsensus = true, updateEarnings = true, updateSentiment = true } = body;
    
    console.log(`POST analyst insights for ${ticker}, action: ${action}`);
    
    if (action === 'refresh') {
      // Refresh all analyst insights
      const results = await refreshAnalystInsights(ticker, {
        updateConsensus,
        updateEarnings,
        updateSentiment
      });
      
      return NextResponse.json({
        success: true,
        ticker,
        action: 'refresh',
        results
      });
    } else if (action === 'consensus') {
      // Update only consensus data
      const consensusAgent = createAnalystConsensusAgent();
      const result = await consensusAgent.updateDatabaseWithConsensus(ticker);
      
      return NextResponse.json({
        success: result.success,
        ticker,
        action: 'consensus',
        result
      });
    } else if (action === 'earnings') {
      // Update only earnings analysis
      const earningsAgent = createEnhancedEarningsAgent();
      const result = await earningsAgent.updateDatabaseWithEarningsSummary(ticker);
      
      return NextResponse.json({
        success: result.success,
        ticker,
        action: 'earnings',
        result
      });
    } else if (action === 'sentiment') {
      // Update only sentiment analysis
      const sentimentAgent = createSentimentAgent();
      const result = await sentimentAgent.updateDatabaseWithSentiment(ticker);
      
      return NextResponse.json({
        success: result.success,
        ticker,
        action: 'sentiment',
        result
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "refresh", "consensus", "earnings", or "sentiment".' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in analyst insights POST:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update analyst insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Retrieve stored analyst insights from database
 */
async function getStoredAnalystInsights(ticker: string) {
  try {
    const [consensusSnapshot, earningsSnapshot, sentimentSnapshot] = await Promise.all([
      adminDb.collection('analyst_consensus')
        .where('ticker', '==', ticker)
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get(),
      adminDb.collection('earnings_summary')
        .where('ticker', '==', ticker)
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get(),
      adminDb.collection('sentiment_analysis')
        .where('ticker', '==', ticker)
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get()
    ]);
    
    const consensus = consensusSnapshot.empty ? null : {
      id: consensusSnapshot.docs[0].id,
      ...consensusSnapshot.docs[0].data()
    };
    
    const earnings = earningsSnapshot.empty ? null : {
      id: earningsSnapshot.docs[0].id,
      ...earningsSnapshot.docs[0].data()
    };
    
    const sentiment = sentimentSnapshot.empty ? null : {
      id: sentimentSnapshot.docs[0].id,
      ...sentimentSnapshot.docs[0].data()
    };
    
    return {
      consensus,
      earnings,
      sentiment,
      lastUpdated: new Date(),
      dataAvailable: {
        consensus: consensus !== null,
        earnings: earnings !== null,
        sentiment: sentiment !== null
      }
    };
  } catch (error) {
    console.error('Error retrieving stored insights:', error);
    return {
      consensus: null,
      earnings: null,
      sentiment: null,
      lastUpdated: new Date(),
      dataAvailable: {
        consensus: false,
        earnings: false,
        sentiment: false
      }
    };
  }
}

/**
 * Check data availability for a ticker
 */
async function checkDataAvailability(ticker: string) {
  try {
    const [consensusCount, earningsCount, sentimentCount] = await Promise.all([
      adminDb.collection('analyst_consensus').where('ticker', '==', ticker).get(),
      adminDb.collection('earnings_summary').where('ticker', '==', ticker).get(),
      adminDb.collection('sentiment_analysis').where('ticker', '==', ticker).get()
    ]);
    
    return {
      consensus: {
        available: !consensusCount.empty,
        count: consensusCount.size,
        lastUpdated: consensusCount.empty ? null : consensusCount.docs[0].data().updatedAt
      },
      earnings: {
        available: !earningsCount.empty,
        count: earningsCount.size,
        lastUpdated: earningsCount.empty ? null : earningsCount.docs[0].data().updatedAt
      },
      sentiment: {
        available: !sentimentCount.empty,
        count: sentimentCount.size,
        lastUpdated: sentimentCount.empty ? null : sentimentCount.docs[0].data().updatedAt
      }
    };
  } catch (error) {
    console.error('Error checking data availability:', error);
    return {
      consensus: { available: false, count: 0, lastUpdated: null },
      earnings: { available: false, count: 0, lastUpdated: null },
      sentiment: { available: false, count: 0, lastUpdated: null }
    };
  }
}

/**
 * Refresh all analyst insights for a ticker
 */
async function refreshAnalystInsights(
  ticker: string,
  options: {
    updateConsensus: boolean;
    updateEarnings: boolean;
    updateSentiment: boolean;
  }
) {
  const results: any = {
    consensus: null,
    earnings: null,
    sentiment: null,
    summary: {
      total: 0,
      successful: 0,
      failed: 0
    }
  };
  
  let total = 0;
  let successful = 0;
  let failed = 0;
  
  if (options.updateConsensus) {
    total++;
    try {
      console.log(`Updating consensus for ${ticker}...`);
      const consensusAgent = createAnalystConsensusAgent();
      const result = await consensusAgent.updateDatabaseWithConsensus(ticker);
      results.consensus = result;
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Error updating consensus for ${ticker}:`, error);
      results.consensus = {
        success: false,
        action: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      failed++;
    }
  }
  
  if (options.updateEarnings) {
    total++;
    try {
      console.log(`Updating earnings analysis for ${ticker}...`);
      const earningsAgent = createEnhancedEarningsAgent();
      const result = await earningsAgent.updateDatabaseWithEarningsSummary(ticker);
      results.earnings = result;
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Error updating earnings for ${ticker}:`, error);
      results.earnings = {
        success: false,
        action: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      failed++;
    }
  }
  
  if (options.updateSentiment) {
    total++;
    try {
      console.log(`Updating sentiment analysis for ${ticker}...`);
      const sentimentAgent = createSentimentAgent();
      const result = await sentimentAgent.updateDatabaseWithSentiment(ticker);
      results.sentiment = result;
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Error updating sentiment for ${ticker}:`, error);
      results.sentiment = {
        success: false,
        action: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      failed++;
    }
  }
  
  results.summary = {
    total,
    successful,
    failed
  };
  
  console.log(`Analyst insights refresh completed for ${ticker}: ${successful}/${total} successful`);
  
  return results;
}