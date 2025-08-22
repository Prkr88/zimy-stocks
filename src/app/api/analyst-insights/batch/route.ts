import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { AnalystCredibilityTracker } from '@/lib/credibility/analystCredibility';
import { EnhancedAnalystTracker } from '@/lib/analysts/enhancedAnalystTracker';

/**
 * Simplified Analyst Insights API - Consensus Only (No AI Sentiment)
 * POST /api/analyst-insights/batch
 */

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { tickers, action = 'get' } = body || {};
    
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid tickers array. Provide an array of ticker symbols.' },
        { status: 400 }
      );
    }
    
    if (tickers.length > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 tickers allowed per batch request.' },
        { status: 400 }
      );
    }
    
    console.log(`Batch getting analyst consensus for ${tickers.length} tickers: ${tickers.join(', ')}`);
    
    if (action === 'get') {
      // Get existing ratings without updating
      const results = await batchGetConsensus(tickers);
      
      return NextResponse.json({
        success: true,
        action: 'batch_get',
        tickers,
        results
      });
    } else {
      return NextResponse.json(
        { error: 'Only "get" action is supported (AI analysis removed).' },
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

/**
 * Batch get existing consensus data without AI processing
 */
async function batchGetConsensus(tickers: string[]) {
  const results: Record<string, any> = {};
  
  console.log(`Getting existing consensus for ${tickers.length} tickers...`);
  
  // Process in smaller batches to avoid timeout
  const batchSize = 3;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (ticker) => {
      try {
        // Get existing consensus data from database
        const consensusQuery = await adminDb
          .collection('analyst_consensus')
          .where('ticker', '==', ticker)
          .orderBy('updatedAt', 'desc')
          .limit(1)
          .get();
        
        let consensusData: any = null;
        if (!consensusQuery.empty) {
          const doc = consensusQuery.docs[0];
          consensusData = {
            ...doc.data(),
            id: doc.id
          };

          // Add sample guidance and analyst reaction for demo
          // In production, this would come from the database or external APIs
          consensusData.guidance = getSampleGuidance(ticker);
          consensusData.analyst_reaction = getSampleAnalystReaction(ticker);
          consensusData.sentiment_analysis = "No sentiment analysis available";
          
          // Calculate credibility-weighted consensus using enhanced system
          try {
            const enhancedTracker = new EnhancedAnalystTracker();
            const enhancedConsensus = await enhancedTracker.getWeightedConsensus(ticker, 30);
            
            if (enhancedConsensus.participants.length > 0) {
              consensusData.enhanced_consensus = enhancedConsensus.consensus;
              consensusData.consensus_confidence = enhancedConsensus.confidence;
              consensusData.participant_count = enhancedConsensus.participants.length;
              consensusData.avg_analyst_score = enhancedConsensus.participants.reduce((sum, p) => sum + p.score, 0) / enhancedConsensus.participants.length;
            }
          } catch (enhancedError) {
            console.error(`Error getting enhanced consensus for ${ticker}:`, enhancedError);
          }
          
          // Fallback to legacy credibility system
          try {
            const credibilityResult = await calculateCredibilityWeightedConsensus(ticker, consensusData);
            if (credibilityResult) {
              consensusData = { ...consensusData, ...credibilityResult };
            }
          } catch (credError) {
            console.error(`Error calculating credibility for ${ticker}:`, credError);
          }
        }
        
        return {
          ticker,
          insights: {
            consensus: consensusData
          }
        };
      } catch (error) {
        console.error(`Error getting consensus for ${ticker}:`, error);
        return {
          ticker,
          insights: {
            consensus: null
          }
        };
      }
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    batchResults.forEach((result, index) => {
      const ticker = batch[index];
      if (result.status === 'fulfilled') {
        results[ticker] = result.value;
      } else {
        results[ticker] = {
          ticker,
          insights: { consensus: null }
        };
      }
    });
  }
  
  return results;
}

/**
 * Get sample guidance for a ticker (placeholder for real data)
 */
function getSampleGuidance(ticker: string): string {
  // Sample guidance based on common scenarios
  const guidanceExamples = {
    'AMZN': 'Amazon expects second-quarter operating income to be between $13 billion and $17.5 billion, below the $17.64 billion consensus forecast.',
    'AAPL': 'Apple provided Q2 revenue guidance of $89-93 billion, slightly below analyst expectations of $95 billion.',
    'MSFT': 'Microsoft raised full-year revenue guidance to $245-250 billion, driven by strong cloud adoption.',
    'GOOGL': 'Alphabet expects continued pressure on advertising spend but sees growth in cloud services.',
    'META': 'Meta projects Reality Labs operating losses to increase significantly year-over-year in 2024.'
  };
  
  return guidanceExamples[ticker as keyof typeof guidanceExamples] || 
         `${ticker} management provided updated guidance for the upcoming quarter, with expectations aligned with market forecasts.`;
}

/**
 * Get sample analyst reaction for a ticker (placeholder for real data)
 */
function getSampleAnalystReaction(ticker: string): string {
  const reactionExamples = {
    'AMZN': 'Analysts were disappointed with Amazon\'s sales miss and guidance, which contributed to a drop in share price.',
    'AAPL': 'Wall Street analysts remained optimistic despite mixed results, citing strong services growth.',
    'MSFT': 'Analysts praised Microsoft\'s cloud performance and raised price targets following the earnings beat.',
    'GOOGL': 'Mixed analyst reactions to advertising headwinds, but positive on AI integration prospects.',
    'META': 'Analysts expressed concerns about metaverse investments but were encouraged by efficiency improvements.'
  };
  
  return reactionExamples[ticker as keyof typeof reactionExamples] || 
         `Analysts had mixed reactions to ${ticker}'s earnings report, with some maintaining their ratings while others adjusted price targets.`;
}

/**
 * Calculate credibility-weighted consensus for a ticker
 */
async function calculateCredibilityWeightedConsensus(ticker: string, consensusData: any): Promise<any> {
  try {
    // Get all analysts covering this ticker
    const analystSnapshot = await adminDb
      .collection('analyst_credibility')
      .where('covered_tickers', 'array-contains', ticker)
      .get();
    
    if (analystSnapshot.empty) {
      // No analyst credibility data available, return original data with sample data
      return {
        credibility_score: 0.7, // Default moderate credibility
        weighted_rating: consensusData.rating || 'Hold'
      };
    }
    
    // Get analyst ratings for this ticker (simulate multiple analyst opinions)
    const mockRatings = generateMockAnalystRatings(ticker, analystSnapshot.docs);
    
    if (mockRatings.length > 0) {
      const weightedResult = AnalystCredibilityTracker.calculateWeightedRating(mockRatings);
      
      // Calculate average credibility score
      const avgCredibility = mockRatings.reduce((sum, r) => sum + r.credibility, 0) / mockRatings.length;
      
      return {
        credibility_score: avgCredibility,
        weighted_rating: weightedResult.weighted_rating,
        confidence: weightedResult.confidence
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error calculating credibility consensus:', error);
    return null;
  }
}

/**
 * Generate mock analyst ratings based on available analysts (for demo purposes)
 */
function generateMockAnalystRatings(ticker: string, analystDocs: any[]): Array<{rating: string; credibility: number; analyst_id: string}> {
  const ratings = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];
  const mockRatings = [];
  
  // Generate 3-5 mock ratings from available analysts
  const numRatings = Math.min(Math.max(3, Math.floor(Math.random() * 3) + 3), analystDocs.length || 5);
  
  for (let i = 0; i < numRatings; i++) {
    const analyst = analystDocs[i % analystDocs.length];
    const analystData = analyst?.data() || {};
    
    // Generate a rating based on ticker characteristics
    let rating = 'Hold';
    if (['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'].includes(ticker)) {
      rating = Math.random() > 0.3 ? (Math.random() > 0.5 ? 'Buy' : 'Strong Buy') : 'Hold';
    } else if (['CSCO', 'VZ', 'T'].includes(ticker)) {
      rating = Math.random() > 0.4 ? 'Hold' : (Math.random() > 0.5 ? 'Buy' : 'Sell');
    } else {
      rating = ratings[Math.floor(Math.random() * ratings.length)];
    }
    
    mockRatings.push({
      rating,
      credibility: analystData.credibility_score || (0.5 + Math.random() * 0.4), // 0.5-0.9
      analyst_id: analyst?.id || `mock_analyst_${i}`
    });
  }
  
  return mockRatings;
}