import { createSerperTool, formatStockNewsQuery, parseSerperResults } from "../tools/serperTool";
import { adminDb } from "../firebase-admin";

/**
 * Web Search Agent
 * Uses Serper to fetch latest stock news and updates
 */
export class SearchAgent {
  private serperTool: any;
  
  constructor() {
    this.serperTool = createSerperTool();
  }

  /**
   * Search for news and updates for a specific ticker
   */
  async searchForTicker(ticker: string): Promise<{
    ticker: string;
    news: string[];
    summary: string;
    lastUpdated: Date;
  }> {
    try {
      const query = formatStockNewsQuery(ticker);
      const searchResults = await this.serperTool.search(query);
      
      // Parse the search results
      const newsItems = parseSerperResults(searchResults);
      
      // Create a simple summary based on the news items
      const summary = `Recent news summary for ${ticker}: Found ${newsItems.length} relevant news items covering earnings, market updates, and analyst reports.`;

      return {
        ticker,
        news: newsItems,
        summary,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error(`Error searching for ticker ${ticker}:`, error);
      throw new Error(`Failed to search for ticker ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for multiple tickers in batch
   */
  async searchForTickers(tickers: string[]): Promise<Array<{
    ticker: string;
    news: string[];
    summary: string;
    lastUpdated: Date;
    success: boolean;
    error?: string;
  }>> {
    const results = [];
    
    for (const ticker of tickers) {
      try {
        console.log(`Searching for news: ${ticker}`);
        const result = await this.searchForTicker(ticker);
        results.push({ ...result, success: true });
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error searching for ${ticker}:`, error);
        results.push({
          ticker,
          news: [],
          summary: '',
          lastUpdated: new Date(),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  /**
   * Update database with news data for a ticker
   */
  async updateTickerNews(ticker: string, newsData: {
    news: string[];
    summary: string;
    lastUpdated: Date;
  }): Promise<void> {
    try {
      // Update the earnings_events collection with news data
      const earningsQuery = adminDb.collection('earnings_events')
        .where('ticker', '==', ticker);
      
      const snapshot = await earningsQuery.get();
      
      const updatePromises = snapshot.docs.map(doc => {
        return doc.ref.update({
          news: newsData.news,
          newsSummary: newsData.summary,
          newsLastUpdated: newsData.lastUpdated,
          updatedAt: new Date()
        });
      });
      
      await Promise.all(updatePromises);
      
      // Also create/update a dedicated news collection
      const newsDoc = adminDb.collection('stock_news').doc(ticker);
      await newsDoc.set({
        ticker,
        news: newsData.news,
        summary: newsData.summary,
        lastUpdated: newsData.lastUpdated,
        updatedAt: new Date()
      }, { merge: true });
      
      console.log(`Updated news data for ${ticker}`);
    } catch (error) {
      console.error(`Error updating news for ${ticker}:`, error);
      throw error;
    }
  }
}

/**
 * Create a new SearchAgent instance
 */
export function createSearchAgent(): SearchAgent {
  return new SearchAgent();
}