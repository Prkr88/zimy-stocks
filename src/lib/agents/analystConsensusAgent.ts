import { createSerperTool } from "../tools/serperTool";
import { createPolygonTool } from "../tools/polygonTool";
import { adminDb } from "../firebase-admin";

/**
 * Analyst Consensus Agent
 * Gathers EPS/revenue forecasts, price targets, and analyst ratings
 */
export class AnalystConsensusAgent {
  private serperTool: any;
  private polygonTool: any;
  private openaiModel: string;
  
  constructor() {
    this.serperTool = createSerperTool();
    this.polygonTool = createPolygonTool();
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  /**
   * Fetch comprehensive analyst consensus for a ticker
   */
  async fetchAnalystConsensus(ticker: string): Promise<{
    ticker: string;
    consensus: {
      eps_estimate: number | null;
      revenue_estimate: number | null;
      avg_price_target: number | null;
      rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' | null;
      distribution: {
        buy: number;
        hold: number;
        sell: number;
      };
    };
    confidence: number;
    lastUpdated: Date;
  }> {
    try {
      console.log(`Fetching analyst consensus for ${ticker}...`);
      
      // Get basic company info from Polygon
      const companyDetails = await this.getCompanyContext(ticker);
      const companyName = companyDetails?.name || ticker;
      
      // Search for analyst consensus data
      const consensusData = await this.searchAnalystConsensus(ticker, companyName);
      
      // Parse and structure the data using LLM
      const structuredConsensus = await this.parseConsensusData(ticker, consensusData);
      
      return {
        ticker,
        consensus: structuredConsensus,
        confidence: this.calculateConfidence(consensusData, structuredConsensus),
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error fetching analyst consensus for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Get company context from Polygon
   */
  private async getCompanyContext(ticker: string): Promise<{ name: string } | null> {
    try {
      const details = await this.polygonTool.getTickerDetails(ticker);
      return { name: details.name };
    } catch (error) {
      console.warn(`Could not get company details for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Search for analyst consensus using Serper
   */
  private async searchAnalystConsensus(ticker: string, companyName: string): Promise<string> {
    try {
      // Multi-query approach for comprehensive data
      const queries = [
        `${ticker} ${companyName} earnings consensus FactSet Refinitiv site:barrons.com OR site:reuters.com OR site:marketwatch.com`,
        `${ticker} analyst estimates EPS revenue consensus site:finance.yahoo.com OR site:investing.com`,
        `${ticker} price target analyst rating buy hold sell site:tipranks.com OR site:zacks.com`,
        `${ticker} Wall Street consensus forecast estimates 2025`
      ];
      
      let allResults = '';
      
      for (const query of queries) {
        try {
          console.log(`Searching: ${query}`);
          const searchResult = await this.serperTool.search(query);
          allResults += `\\n\\n=== Query: ${query} ===\\n${searchResult}`;
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn(`Search failed for query: ${query}`, error);
        }
      }
      
      return allResults;
    } catch (error) {
      console.error('Error searching analyst consensus:', error);
      throw error;
    }
  }

  /**
   * Parse consensus data using LLM
   */
  private async parseConsensusData(ticker: string, searchResults: string): Promise<{
    eps_estimate: number | null;
    revenue_estimate: number | null;
    avg_price_target: number | null;
    rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' | null;
    distribution: {
      buy: number;
      hold: number;
      sell: number;
    };
  }> {
    try {
      const prompt = `
You are a financial data analyst. Extract analyst consensus information for ${ticker} from the following search results.

Search Results:
${searchResults}

Extract and return ONLY a JSON object with this exact structure:
{
  "eps_estimate": <number or null>,
  "revenue_estimate": <number in dollars or null>,
  "avg_price_target": <number or null>,
  "rating": <"Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell" | null>,
  "distribution": {
    "buy": <number of buy ratings>,
    "hold": <number of hold ratings>,  
    "sell": <number of sell ratings>
  }
}

Rules:
- Only extract data you are confident about
- Revenue should be in dollars (convert millions/billions to actual numbers)
- EPS should be in dollars per share
- Price targets should be in dollars per share
- Use null for any field you cannot determine with confidence
- Default distribution to {buy: 0, hold: 0, sell: 0} if no data found
- Return only valid JSON, no other text
`;

      // Use OpenAI to parse the data
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
          max_tokens: 500
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

      // Parse the JSON response
      const parsedData = JSON.parse(content);
      
      // Validate and sanitize the data
      return {
        eps_estimate: typeof parsedData.eps_estimate === 'number' ? parsedData.eps_estimate : null,
        revenue_estimate: typeof parsedData.revenue_estimate === 'number' ? parsedData.revenue_estimate : null,
        avg_price_target: typeof parsedData.avg_price_target === 'number' ? parsedData.avg_price_target : null,
        rating: this.validateRating(parsedData.rating),
        distribution: {
          buy: Number(parsedData.distribution?.buy) || 0,
          hold: Number(parsedData.distribution?.hold) || 0,
          sell: Number(parsedData.distribution?.sell) || 0
        }
      };
    } catch (error) {
      console.error('Error parsing consensus data:', error);
      // Return default structure on error
      return {
        eps_estimate: null,
        revenue_estimate: null,
        avg_price_target: null,
        rating: null,
        distribution: { buy: 0, hold: 0, sell: 0 }
      };
    }
  }

  /**
   * Validate rating values
   */
  private validateRating(rating: string): 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' | null {
    const validRatings = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];
    return validRatings.includes(rating) ? rating as any : null;
  }

  /**
   * Calculate confidence score based on data quality
   */
  private calculateConfidence(searchResults: string, parsedData: any): number {
    let confidence = 0.3; // Base confidence
    
    // Increase confidence based on available data
    if (parsedData.eps_estimate !== null) confidence += 0.2;
    if (parsedData.revenue_estimate !== null) confidence += 0.2;
    if (parsedData.avg_price_target !== null) confidence += 0.15;
    if (parsedData.rating !== null) confidence += 0.1;
    if (parsedData.distribution.buy + parsedData.distribution.hold + parsedData.distribution.sell > 0) confidence += 0.05;
    
    // Increase confidence based on source quality
    const qualitySources = ['barrons.com', 'reuters.com', 'marketwatch.com', 'finance.yahoo.com'];
    const foundSources = qualitySources.filter(source => searchResults.includes(source));
    confidence += foundSources.length * 0.05;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Update database with analyst consensus
   */
  async updateDatabaseWithConsensus(ticker: string): Promise<{
    success: boolean;
    action: 'created' | 'updated' | 'error';
    message: string;
    data?: any;
  }> {
    try {
      console.log(`Updating database with analyst consensus for ${ticker}...`);
      
      const consensusData = await this.fetchAnalystConsensus(ticker);
      
      // Check if consensus already exists for this ticker
      const existingQuery = adminDb.collection('analyst_consensus')
        .where('ticker', '==', ticker);
      
      const existingSnapshot = await existingQuery.get();
      
      const recordData = {
        ticker: consensusData.ticker,
        eps_estimate: consensusData.consensus.eps_estimate,
        revenue_estimate: consensusData.consensus.revenue_estimate,
        avg_price_target: consensusData.consensus.avg_price_target,
        rating: consensusData.consensus.rating,
        rating_distribution: consensusData.consensus.distribution,
        confidence: consensusData.confidence,
        dataSource: 'serper_llm',
        updatedAt: new Date()
      };
      
      if (!existingSnapshot.empty) {
        // Update existing record
        const doc = existingSnapshot.docs[0];
        await doc.ref.update(recordData);
        
        return {
          success: true,
          action: 'updated',
          message: `Updated analyst consensus for ${ticker}`,
          data: consensusData
        };
      } else {
        // Create new record
        await adminDb.collection('analyst_consensus').add({
          ...recordData,
          createdAt: new Date()
        });
        
        return {
          success: true,
          action: 'created',
          message: `Created analyst consensus for ${ticker}`,
          data: consensusData
        };
      }
    } catch (error) {
      console.error(`Error updating database with consensus for ${ticker}:`, error);
      return {
        success: false,
        action: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Batch update multiple tickers
   */
  async batchUpdateConsensus(tickers: string[]): Promise<{
    results: Array<{
      ticker: string;
      success: boolean;
      action: 'created' | 'updated' | 'error';
      message: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      created: number;
      updated: number;
    };
  }> {
    const results: Array<{
      ticker: string;
      success: boolean;
      action: 'created' | 'updated' | 'error';
      message: string;
    }> = [];
    let successful = 0;
    let failed = 0;
    let created = 0;
    let updated = 0;
    
    console.log(`Batch updating analyst consensus for ${tickers.length} tickers...`);
    
    for (const ticker of tickers) {
      try {
        const result = await this.updateDatabaseWithConsensus(ticker);
        
        results.push({
          ticker,
          success: result.success,
          action: result.action,
          message: result.message
        });
        
        if (result.success) {
          successful++;
          if (result.action === 'created') created++;
          if (result.action === 'updated') updated++;
        } else {
          failed++;
        }
        
        // Rate limiting between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error processing ${ticker}:`, error);
        results.push({
          ticker,
          success: false,
          action: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        failed++;
      }
    }
    
    return {
      results,
      summary: {
        total: tickers.length,
        successful,
        failed,
        created,
        updated
      }
    };
  }
}

/**
 * Create a new AnalystConsensusAgent instance
 */
export function createAnalystConsensusAgent(): AnalystConsensusAgent {
  return new AnalystConsensusAgent();
}