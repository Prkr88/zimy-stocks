import { createPolygonTool } from "../tools/polygonTool";
import { createSerperTool } from "../tools/serperTool";
import { adminDb } from "../firebase-admin";

/**
 * Enhanced Earnings Agent
 * Compares actual earnings results vs analyst consensus expectations
 */
export class EnhancedEarningsAgent {
  private polygonTool: any;
  private serperTool: any;
  private openaiModel: string;
  
  constructor() {
    this.polygonTool = createPolygonTool();
    this.serperTool = createSerperTool();
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  /**
   * Analyze earnings results vs consensus
   */
  async analyzeEarningsResults(ticker: string): Promise<{
    ticker: string;
    earnings_summary: {
      revenue_expected: number | null;
      revenue_actual: number | null;
      revenue_result: 'Beat' | 'Miss' | 'Inline' | 'Unknown';
      eps_expected: number | null;
      eps_actual: number | null;
      eps_result: 'Beat' | 'Miss' | 'Inline' | 'Unknown';
      guidance: string | null;
      analyst_reaction: string | null;
      market_reaction: string | null;
    };
    confidence: number;
    lastUpdated: Date;
  }> {
    try {
      console.log(`Analyzing earnings results for ${ticker}...`);
      
      // Get analyst consensus from database
      const consensus = await this.getAnalystConsensus(ticker);
      
      // Get actual earnings data from Polygon
      const actualResults = await this.getActualEarningsData(ticker);
      
      // Get market and analyst reaction from news
      const marketReaction = await this.getMarketReaction(ticker);
      
      // Analyze and compare results
      const analysis = this.compareResults(consensus, actualResults, marketReaction);
      
      return {
        ticker,
        earnings_summary: analysis,
        confidence: this.calculateAnalysisConfidence(consensus, actualResults, marketReaction),
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error analyzing earnings for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Get analyst consensus from database
   */
  private async getAnalystConsensus(ticker: string): Promise<{
    eps_estimate: number | null;
    revenue_estimate: number | null;
  }> {
    try {
      const consensusQuery = adminDb.collection('analyst_consensus')
        .where('ticker', '==', ticker)
        .orderBy('updatedAt', 'desc')
        .limit(1);
      
      const snapshot = await consensusQuery.get();
      
      if (snapshot.empty) {
        console.warn(`No analyst consensus found for ${ticker}`);
        return { eps_estimate: null, revenue_estimate: null };
      }
      
      const data = snapshot.docs[0].data();
      return {
        eps_estimate: data.eps_estimate || null,
        revenue_estimate: data.revenue_estimate || null
      };
    } catch (error) {
      console.warn(`Error getting consensus for ${ticker}:`, error);
      return { eps_estimate: null, revenue_estimate: null };
    }
  }

  /**
   * Get actual earnings data from Polygon
   */
  private async getActualEarningsData(ticker: string): Promise<{
    eps_actual: number | null;
    revenue_actual: number | null;
    reportDate: Date | null;
  }> {
    try {
      // Get recent earnings data from Polygon
      const financials = await this.polygonTool.getAggregates(ticker, 1, 'day', 
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
        new Date().toISOString().split('T')[0]
      );
      
      // For now, we'll simulate actual earnings data since Polygon's earnings endpoint may require subscription
      // In production, you would use: await this.polygonTool.getEarningsData(ticker)
      
      // Search for actual earnings results via web
      const earningsResults = await this.searchActualEarnings(ticker);
      
      return earningsResults;
    } catch (error) {
      console.warn(`Error getting actual earnings for ${ticker}:`, error);
      return { eps_actual: null, revenue_actual: null, reportDate: null };
    }
  }

  /**
   * Search for actual earnings results
   */
  private async searchActualEarnings(ticker: string): Promise<{
    eps_actual: number | null;
    revenue_actual: number | null;
    reportDate: Date | null;
  }> {
    try {
      const query = `${ticker} earnings results actual EPS revenue Q4 2024 Q1 2025 site:finance.yahoo.com OR site:marketwatch.com OR site:reuters.com`;
      
      console.log(`Searching for actual earnings: ${query}`);
      const searchResults = await this.serperTool.search(query);
      
      // Parse actual results using LLM
      const parsedResults = await this.parseActualEarnings(ticker, searchResults);
      
      return parsedResults;
    } catch (error) {
      console.warn(`Error searching actual earnings for ${ticker}:`, error);
      return { eps_actual: null, revenue_actual: null, reportDate: null };
    }
  }

  /**
   * Parse actual earnings using LLM
   */
  private async parseActualEarnings(ticker: string, searchResults: string): Promise<{
    eps_actual: number | null;
    revenue_actual: number | null;
    reportDate: Date | null;
  }> {
    try {
      const prompt = `
You are a financial analyst. Extract the MOST RECENT actual earnings results for ${ticker} from these search results.

Search Results:
${searchResults}

Look for phrases like:
- "reported earnings of $X.XX per share"
- "revenue of $X.X billion"
- "actual EPS $X.XX"
- "beat/missed estimates"

Return ONLY a JSON object:
{
  "eps_actual": <number in dollars per share or null>,
  "revenue_actual": <number in dollars or null>,
  "reportDate": <"YYYY-MM-DD" or null>
}

Rules:
- Only extract data you are confident about from the MOST RECENT earnings report
- Revenue should be in actual dollars (convert millions/billions)
- EPS should be in dollars per share
- Use null if you cannot find reliable data
- Return only valid JSON, no other text
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: this.openaiModel,
          messages: [
            {
              role: 'system',
              content: 'You are a financial data extraction assistant. Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsedData = JSON.parse(content);
      
      return {
        eps_actual: typeof parsedData.eps_actual === 'number' ? parsedData.eps_actual : null,
        revenue_actual: typeof parsedData.revenue_actual === 'number' ? parsedData.revenue_actual : null,
        reportDate: parsedData.reportDate ? new Date(parsedData.reportDate) : null
      };
    } catch (error) {
      console.error('Error parsing actual earnings:', error);
      return { eps_actual: null, revenue_actual: null, reportDate: null };
    }
  }

  /**
   * Get market reaction and analyst commentary
   */
  private async getMarketReaction(ticker: string): Promise<{
    guidance: string | null;
    analyst_reaction: string | null;
    market_reaction: string | null;
  }> {
    try {
      const query = `${ticker} earnings reaction guidance analyst commentary stock price after hours site:cnbc.com OR site:bloomberg.com OR site:marketwatch.com`;
      
      console.log(`Searching for market reaction: ${query}`);
      const searchResults = await this.serperTool.search(query);
      
      // Parse reaction using LLM
      const reaction = await this.parseMarketReaction(ticker, searchResults);
      
      return reaction;
    } catch (error) {
      console.warn(`Error getting market reaction for ${ticker}:`, error);
      return { guidance: null, analyst_reaction: null, market_reaction: null };
    }
  }

  /**
   * Parse market reaction using LLM
   */
  private async parseMarketReaction(ticker: string, searchResults: string): Promise<{
    guidance: string | null;
    analyst_reaction: string | null;
    market_reaction: string | null;
  }> {
    try {
      const prompt = `
Extract earnings reaction information for ${ticker} from these search results.

Search Results:
${searchResults}

Return ONLY a JSON object:
{
  "guidance": <string describing company guidance or null>,
  "analyst_reaction": <string describing analyst commentary or null>,
  "market_reaction": <string describing stock price movement or null>
}

Look for:
- Forward guidance: "raised guidance", "lowered outlook", "maintained forecast"
- Analyst reactions: what analysts are saying about the results
- Market reaction: stock price movement, after-hours trading

Keep each field to 1-2 sentences max. Use null if no clear information found.
Return only valid JSON, no other text.
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: this.openaiModel,
          messages: [
            {
              role: 'system',
              content: 'You are a financial analysis assistant. Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 400
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsedData = JSON.parse(content);
      
      return {
        guidance: parsedData.guidance || null,
        analyst_reaction: parsedData.analyst_reaction || null,
        market_reaction: parsedData.market_reaction || null
      };
    } catch (error) {
      console.error('Error parsing market reaction:', error);
      return { guidance: null, analyst_reaction: null, market_reaction: null };
    }
  }

  /**
   * Compare actual vs expected results
   */
  private compareResults(
    consensus: { eps_estimate: number | null; revenue_estimate: number | null },
    actual: { eps_actual: number | null; revenue_actual: number | null },
    reaction: { guidance: string | null; analyst_reaction: string | null; market_reaction: string | null }
  ): {
    revenue_expected: number | null;
    revenue_actual: number | null;
    revenue_result: 'Beat' | 'Miss' | 'Inline' | 'Unknown';
    eps_expected: number | null;
    eps_actual: number | null;
    eps_result: 'Beat' | 'Miss' | 'Inline' | 'Unknown';
    guidance: string | null;
    analyst_reaction: string | null;
    market_reaction: string | null;
  } {
    return {
      revenue_expected: consensus.revenue_estimate,
      revenue_actual: actual.revenue_actual,
      revenue_result: this.determineResult(consensus.revenue_estimate, actual.revenue_actual),
      eps_expected: consensus.eps_estimate,
      eps_actual: actual.eps_actual,
      eps_result: this.determineResult(consensus.eps_estimate, actual.eps_actual),
      guidance: reaction.guidance,
      analyst_reaction: reaction.analyst_reaction,
      market_reaction: reaction.market_reaction
    };
  }

  /**
   * Determine if result is Beat/Miss/Inline
   */
  private determineResult(expected: number | null, actual: number | null): 'Beat' | 'Miss' | 'Inline' | 'Unknown' {
    if (expected === null || actual === null) {
      return 'Unknown';
    }
    
    const tolerance = 0.02; // 2% tolerance for "inline"
    const difference = (actual - expected) / Math.abs(expected);
    
    if (difference > tolerance) {
      return 'Beat';
    } else if (difference < -tolerance) {
      return 'Miss';
    } else {
      return 'Inline';
    }
  }

  /**
   * Calculate confidence score
   */
  private calculateAnalysisConfidence(
    consensus: any,
    actual: any,
    reaction: any
  ): number {
    let confidence = 0.2; // Base confidence
    
    // Add confidence based on available data
    if (consensus.eps_estimate !== null) confidence += 0.2;
    if (consensus.revenue_estimate !== null) confidence += 0.2;
    if (actual.eps_actual !== null) confidence += 0.2;
    if (actual.revenue_actual !== null) confidence += 0.2;
    if (reaction.guidance !== null) confidence += 0.1;
    if (reaction.analyst_reaction !== null) confidence += 0.05;
    if (reaction.market_reaction !== null) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Update database with earnings summary
   */
  async updateDatabaseWithEarningsSummary(ticker: string): Promise<{
    success: boolean;
    action: 'created' | 'updated' | 'error';
    message: string;
    data?: any;
  }> {
    try {
      console.log(`Updating database with earnings summary for ${ticker}...`);
      
      const analysisData = await this.analyzeEarningsResults(ticker);
      
      // Check if earnings summary already exists for this ticker
      const existingQuery = adminDb.collection('earnings_summary')
        .where('ticker', '==', ticker);
      
      const existingSnapshot = await existingQuery.get();
      
      const recordData = {
        ticker: analysisData.ticker,
        ...analysisData.earnings_summary,
        confidence: analysisData.confidence,
        dataSource: 'polygon_serper_llm',
        updatedAt: new Date()
      };
      
      if (!existingSnapshot.empty) {
        // Update existing record
        const doc = existingSnapshot.docs[0];
        await doc.ref.update(recordData);
        
        return {
          success: true,
          action: 'updated',
          message: `Updated earnings summary for ${ticker}`,
          data: analysisData
        };
      } else {
        // Create new record
        await adminDb.collection('earnings_summary').add({
          ...recordData,
          createdAt: new Date()
        });
        
        return {
          success: true,
          action: 'created',
          message: `Created earnings summary for ${ticker}`,
          data: analysisData
        };
      }
    } catch (error) {
      console.error(`Error updating database with earnings summary for ${ticker}:`, error);
      return {
        success: false,
        action: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Create a new EnhancedEarningsAgent instance
 */
export function createEnhancedEarningsAgent(): EnhancedEarningsAgent {
  return new EnhancedEarningsAgent();
}