import { NextRequest, NextResponse } from 'next/server';
import { createEarningsAgent } from '@/lib/agents/earningsAgent';

export async function POST(request: NextRequest) {
  try {
    // This endpoint is accessible to authenticated users
    const body = await request.json();
    const { 
      action = 'update', // 'fetch', 'update', 'refresh'
      startDate,
      endDate,
      tickers,
      useWebSearch = true,
      updateDatabase = true,
      limit = 3 // Number of S&P 500 companies to fetch (production limit)
    } = body;

    const earningsAgent = createEarningsAgent();
    let result;

    switch (action) {
      case 'fetch':
        // Just fetch earnings calendar data without updating database
        result = await earningsAgent.fetchEarningsCalendar(startDate, endDate, useWebSearch, limit);
        break;
        
      case 'update':
        // Fetch and update database with real earnings data from S&P 500 companies
        const updateResult = await earningsAgent.updateDatabaseWithRealEarnings(startDate, endDate, limit);
        result = {
          ...updateResult,
          message: `Updated database: ${updateResult.created} created, ${updateResult.updated} updated, ${updateResult.errors} errors`
        };
        break;
        
      case 'refresh':
        // Fetch earnings for specific tickers
        if (!tickers || !Array.isArray(tickers)) {
          return NextResponse.json(
            { error: 'tickers array is required for refresh action' },
            { status: 400 }
          );
        }
        
        const tickerResults = await earningsAgent.fetchEarningsForTickers(tickers);
        result = {
          tickers: tickerResults,
          count: tickerResults.length,
          message: `Found earnings data for ${tickerResults.length} tickers`
        };
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be "fetch", "update", or "refresh"' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in earnings calendar API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process earnings calendar request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const earningsAgent = createEarningsAgent();

    switch (action) {
      case 'status':
        // Get status of current earnings data in database
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // For status, just return a quick summary
        return NextResponse.json({
          success: true,
          status: {
            message: 'Earnings calendar API is operational',
            availableActions: ['fetch', 'update', 'refresh'],
            dateRange: `${today} to ${thirtyDaysOut}`,
            lastUpdated: new Date().toISOString()
          }
        });
        
      case 'preview':
        // Preview what would be fetched without updating database
        const previewData = await earningsAgent.fetchEarningsCalendar(
          startDate || undefined,
          endDate || undefined,
          true
        );
        
        return NextResponse.json({
          success: true,
          preview: {
            polygonResults: previewData.polygon.length,
            webResults: previewData.webSearch.length,
            combinedResults: previewData.combined.length,
            sampleData: previewData.combined.slice(0, 5), // First 5 for preview
            totalFound: previewData.totalFound
          }
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "status" or "preview"' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in earnings calendar GET API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get earnings calendar information',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}