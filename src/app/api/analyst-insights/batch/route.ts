import { NextRequest, NextResponse } from 'next/server';
import { createAnalystConsensusAgent } from '@/lib/agents/analystConsensusAgent';
import { createEnhancedEarningsAgent } from '@/lib/agents/enhancedEarningsAgent';
import { createSentimentAgent } from '@/lib/agents/sentimentAgent';

/**
 * Batch Analyst Insights API Endpoint
 * POST /api/analyst-insights/batch
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tickers, 
      action = 'refresh',
      updateConsensus = true,
      updateEarnings = true,
      updateSentiment = true,
      maxConcurrent = 2
    } = body;
    
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid tickers array. Provide an array of ticker symbols.' },
        { status: 400 }
      );
    }
    
    if (tickers.length > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 tickers allowed per batch request (production limit).' },
        { status: 400 }
      );
    }
    
    console.log(`Batch processing analyst insights for ${tickers.length} tickers: ${tickers.join(', ')}`);
    
    if (action === 'refresh') {
      const results = await batchRefreshInsights(tickers, {
        updateConsensus,
        updateEarnings,
        updateSentiment,
        maxConcurrent
      });
      
      return NextResponse.json({
        success: true,
        action: 'batch_refresh',
        tickers,
        results
      });
    } else if (action === 'consensus') {
      const consensusAgent = createAnalystConsensusAgent();
      const results = await consensusAgent.batchUpdateConsensus(tickers);
      
      return NextResponse.json({
        success: true,
        action: 'batch_consensus',
        tickers,
        results
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "refresh" or "consensus".' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in batch analyst insights:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process batch analyst insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Batch analyst insights endpoint. Use POST with tickers array.',
    endpoints: {
      'POST /api/analyst-insights/batch': {
        description: 'Process multiple tickers in batch',
        params: {
          tickers: 'Array of ticker symbols (max 20)',
          action: '"refresh" or "consensus"',
          updateConsensus: 'boolean (default: true)',
          updateEarnings: 'boolean (default: true)', 
          updateSentiment: 'boolean (default: true)',
          maxConcurrent: 'number (default: 2, max: 5)'
        }
      }
    },
    examples: {
      refresh: {
        tickers: ['AAPL', 'GOOGL', 'MSFT'],
        action: 'refresh',
        updateConsensus: true,
        updateEarnings: true,
        updateSentiment: true
      },
      consensus_only: {
        tickers: ['AAPL', 'GOOGL', 'MSFT'],
        action: 'consensus'
      }
    }
  });
}

/**
 * Batch refresh insights with concurrency control
 */
async function batchRefreshInsights(
  tickers: string[],
  options: {
    updateConsensus: boolean;
    updateEarnings: boolean;
    updateSentiment: boolean;
    maxConcurrent: number;
  }
) {
  const results: Array<{
    ticker: string;
    consensus?: any;
    earnings?: any;
    sentiment?: any;
    success: boolean;
    error?: string;
  }> = [];
  
  // Process tickers in batches to respect rate limits
  const maxConcurrent = Math.min(options.maxConcurrent, 5); // Cap at 5 for safety
  
  for (let i = 0; i < tickers.length; i += maxConcurrent) {
    const batch = tickers.slice(i, i + maxConcurrent);
    console.log(`Processing batch ${Math.floor(i / maxConcurrent) + 1}: ${batch.join(', ')}`);
    
    const batchPromises = batch.map(async (ticker) => {
      return await processSingleTicker(ticker, options);
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
      const ticker = batch[index];
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error(`Error processing ${ticker}:`, result.reason);
        results.push({
          ticker,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
        });
      }
    });
    
    // Wait between batches to respect rate limits
    if (i + maxConcurrent < tickers.length) {
      console.log('Waiting between batches...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Calculate summary statistics
  const summary = {
    total: tickers.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    consensus_updated: results.filter(r => r.consensus?.success).length,
    earnings_updated: results.filter(r => r.earnings?.success).length,
    sentiment_updated: results.filter(r => r.sentiment?.success).length
  };
  
  console.log(`Batch processing completed: ${summary.successful}/${summary.total} successful`);
  
  return {
    results,
    summary
  };
}

/**
 * Process a single ticker
 */
async function processSingleTicker(
  ticker: string,
  options: {
    updateConsensus: boolean;
    updateEarnings: boolean;
    updateSentiment: boolean;
  }
) {
  const result: any = {
    ticker,
    success: true
  };
  
  try {
    console.log(`Processing ${ticker}...`);
    
    // Update consensus if requested
    if (options.updateConsensus) {
      try {
        const consensusAgent = createAnalystConsensusAgent();
        result.consensus = await consensusAgent.updateDatabaseWithConsensus(ticker);
        
        // Add delay after consensus to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error updating consensus for ${ticker}:`, error);
        result.consensus = {
          success: false,
          action: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    // Update earnings if requested
    if (options.updateEarnings) {
      try {
        const earningsAgent = createEnhancedEarningsAgent();
        result.earnings = await earningsAgent.updateDatabaseWithEarningsSummary(ticker);
        
        // Add delay after earnings to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error updating earnings for ${ticker}:`, error);
        result.earnings = {
          success: false,
          action: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    // Update sentiment if requested
    if (options.updateSentiment) {
      try {
        const sentimentAgent = createSentimentAgent();
        result.sentiment = await sentimentAgent.updateDatabaseWithSentiment(ticker);
        
        // Add delay after sentiment to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error updating sentiment for ${ticker}:`, error);
        result.sentiment = {
          success: false,
          action: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    // Determine overall success
    const hasAnySuccess = (
      (result.consensus?.success !== false) ||
      (result.earnings?.success !== false) ||
      (result.sentiment?.success !== false)
    );
    
    result.success = hasAnySuccess;
    
    console.log(`Completed ${ticker}: consensus=${result.consensus?.success}, earnings=${result.earnings?.success}, sentiment=${result.sentiment?.success}`);
    
    return result;
  } catch (error) {
    console.error(`Error processing ${ticker}:`, error);
    return {
      ticker,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}