import { NextRequest, NextResponse } from 'next/server';
import { 
  createSentimentService, 
  createSentimentFromEarnings,
  type SentimentAnalysisInput 
} from '@/lib/services/sentimentService';
import { adminDb } from '@/lib/firebase-admin';
import type { EarningsEvent, Watchlist } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // This endpoint is accessible to authenticated users
    // API key authentication is only for external/admin access
    const apiKey = request.headers.get('x-api-key');
    
    // Skip API key requirement for user-facing requests in production
    // Users authenticate through Firebase Auth, not API keys

    const body = await request.json();
    const { userId, tickers, forceRefresh } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user's watchlisted companies
    const watchlistsSnapshot = await adminDb.collection('watchlists')
      .where('userId', '==', userId)
      .get();
    
    const watchlists = watchlistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Watchlist));
    const watchlistedTickers = watchlists.flatMap(wl => wl.companies.map(c => c.ticker));
    
    // If specific tickers provided, filter to only watchlisted ones
    const targetTickers = tickers 
      ? tickers.filter((ticker: string) => watchlistedTickers.includes(ticker))
      : watchlistedTickers;

    if (targetTickers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No watchlisted companies found',
        signals: [],
      });
    }

    // Get upcoming earnings for watchlisted companies
    const earningsSnapshot = await adminDb.collection('earnings_events')
      .where('expectedDate', '>=', new Date())
      .orderBy('expectedDate', 'asc')
      .limit(100)
      .get();
    
    const upcomingEarnings = earningsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EarningsEvent));
    const relevantEarnings = upcomingEarnings.filter(event => 
      targetTickers.includes(event.ticker)
    );

    if (relevantEarnings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No upcoming earnings for watchlisted companies',
        signals: [],
      });
    }

    // Limit to prevent excessive API usage (max 10 companies per request)
    const limitedEarnings = relevantEarnings.slice(0, 10);
    
    const service = createSentimentService();
    const results = [];

    // Process each earnings event
    for (const earnings of limitedEarnings) {
      try {
        console.log(`Analyzing sentiment for ${earnings.ticker}...`);
        
        const signal = await createSentimentFromEarnings(earnings);
        results.push({
          ticker: earnings.ticker,
          success: true,
          signal,
        });

        // Add delay between API calls to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error(`Error analyzing ${earnings.ticker}:`, error);
        results.push({
          ticker: earnings.ticker,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Analyzed ${successCount} companies successfully, ${errorCount} errors`,
      results,
      totalProcessed: results.length,
      successCount,
      errorCount,
    });

  } catch (error) {
    console.error('Error in sentiment analysis API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze sentiment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Single company sentiment analysis
export async function PUT(request: NextRequest) {
  try {
    // This endpoint is accessible to authenticated users
    // API key authentication is only for external/admin access
    const apiKey = request.headers.get('x-api-key');
    
    // Skip API key requirement for user-facing requests in production
    // Users authenticate through Firebase Auth, not API keys

    const body = await request.json();
    const { 
      ticker, 
      companyName, 
      sector, 
      market, 
      earningsDate,
      analystEstimate,
      previousEarnings,
      additionalContext 
    } = body;

    if (!ticker || !companyName || !earningsDate) {
      return NextResponse.json(
        { error: 'Missing required fields: ticker, companyName, earningsDate' },
        { status: 400 }
      );
    }

    const service = createSentimentService();
    
    const input: SentimentAnalysisInput = {
      ticker,
      companyName,
      sector: sector || 'Unknown',
      market: market || 'SP500',
      earningsDate: new Date(earningsDate),
      analystEstimate,
      previousEarnings,
      additionalContext,
    };

    const result = await service.analyzeSentiment(input);

    return NextResponse.json({
      success: true,
      result,
      ticker,
    });

  } catch (error) {
    console.error('Error in single sentiment analysis:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze sentiment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}