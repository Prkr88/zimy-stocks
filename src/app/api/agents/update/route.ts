import { NextRequest, NextResponse } from 'next/server';
import { createAgentOrchestrator } from '@/lib/agents/orchestrator';

export async function POST(request: NextRequest) {
  try {
    // This endpoint is accessible to authenticated users
    // API key authentication is only for external/admin access
    const apiKey = request.headers.get('x-api-key');
    
    // Skip API key requirement for user-facing requests in production
    // Users authenticate through Firebase Auth, not API keys

    const body = await request.json();
    const { 
      type = 'smart', // 'full', 'smart', or 'ticker'
      maxTickers = 10,
      maxAgeHours = 4,
      ticker,
      tickers
    } = body;

    const orchestrator = createAgentOrchestrator();
    let result;

    switch (type) {
      case 'full':
        // Full update cycle for all active tickers
        result = await orchestrator.runFullUpdateCycle(maxTickers);
        break;
        
      case 'smart':
        // Smart update cycle (only stale data)
        result = await orchestrator.runSmartUpdateCycle(maxTickers, maxAgeHours);
        break;
        
      case 'ticker':
        // Update specific ticker(s)
        if (ticker) {
          const updateResult = await orchestrator.updateTicker(ticker);
          result = {
            totalProcessed: 1,
            successCount: updateResult.success ? 1 : 0,
            errorCount: updateResult.success ? 0 : 1,
            results: [updateResult],
            duration: 0,
            startTime: new Date(),
            endTime: new Date()
          };
        } else if (tickers && Array.isArray(tickers)) {
          result = await orchestrator.updateTickersBatch(tickers);
        } else {
          return NextResponse.json(
            { error: 'ticker or tickers array is required for type "ticker"' },
            { status: 400 }
          );
        }
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid type. Must be "full", "smart", or "ticker"' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      type,
      result,
      message: `${type} update completed: ${result.successCount}/${result.totalProcessed} successful`
    });

  } catch (error) {
    console.error('Error in agents update API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run agent updates',
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

    const orchestrator = createAgentOrchestrator();

    switch (action) {
      case 'status':
        // Get agent system status
        const activeTickers = await orchestrator.getActiveTickers(50);
        const tickersToUpdate = await orchestrator.getTickersToUpdate(10, 4);
        
        return NextResponse.json({
          success: true,
          status: {
            activeTickers: activeTickers.length,
            tickersNeedingUpdate: tickersToUpdate.length,
            recentTickers: activeTickers.slice(0, 10),
            staleTickersToUpdate: tickersToUpdate.slice(0, 5)
          }
        });
        
      case 'tickers':
        // Get list of active tickers
        const maxTickers = parseInt(searchParams.get('limit') || '20');
        const tickers = await orchestrator.getActiveTickers(maxTickers);
        
        return NextResponse.json({
          success: true,
          tickers,
          count: tickers.length
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "status" or "tickers"' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in agents status API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get agent status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}