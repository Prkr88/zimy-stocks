import { createPolygonTool } from "../tools/polygonTool";
import { adminDb } from "../firebase-admin";

/**
 * Polygon Financial Data Agent
 * Fetches structured financial data using Polygon.io API
 */
export class PolygonAgent {
  private polygonTool: any;
  
  constructor() {
    this.polygonTool = createPolygonTool();
  }

  /**
   * Get comprehensive financial data for a ticker
   */
  async getFinancialData(ticker: string): Promise<{
    ticker: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    metrics: {
      open: number;
      high: number;
      low: number;
      previousClose: number;
      marketCap?: number;
      sharesOutstanding?: number;
    };
    details: {
      description?: string;
      sector?: string;
      industry?: string;
      employees?: number;
      homepage?: string;
    };
    analysis: string;
    lastUpdated: Date;
    success: boolean;
    error?: string;
  }> {
    try {
      console.log(`Fetching financial data for ${ticker}`);
      
      // Get stock data from Polygon
      const stockData = await this.polygonTool.getStockData(ticker);
      
      // Create a simple technical analysis
      const change = stockData.change >= 0 ? 'positive' : 'negative';
      const momentum = Math.abs(stockData.changePercent) > 2 ? 'high' : 'moderate';
      const volumeAnalysis = stockData.volume > 1000000 ? 'above average' : 'below average';
      
      const analysis = `Technical Analysis for ${stockData.name}: Price showed ${change} momentum with ${momentum} volatility (${stockData.changePercent.toFixed(2)}%). Trading volume was ${volumeAnalysis} at ${stockData.volume.toLocaleString()} shares. Current price of $${stockData.price} is ${stockData.change >= 0 ? 'above' : 'below'} previous close.`;

      return {
        ...stockData,
        analysis,
        success: true
      };
    } catch (error) {
      console.error(`Error getting financial data for ${ticker}:`, error);
      return {
        ticker,
        name: ticker,
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        metrics: {
          open: 0,
          high: 0,
          low: 0,
          previousClose: 0
        },
        details: {},
        analysis: '',
        lastUpdated: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get financial data for multiple tickers in batch
   */
  async getFinancialDataBatch(tickers: string[]): Promise<Array<{
    ticker: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    metrics: {
      open: number;
      high: number;
      low: number;
      previousClose: number;
      marketCap?: number;
      sharesOutstanding?: number;
    };
    details: {
      description?: string;
      sector?: string;
      industry?: string;
      employees?: number;
      homepage?: string;
    };
    analysis: string;
    lastUpdated: Date;
    success: boolean;
    error?: string;
  }>> {
    const results = [];
    
    for (const ticker of tickers) {
      try {
        const result = await this.getFinancialData(ticker);
        results.push(result);
        
        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 200)); // Polygon allows 5 requests per second
      } catch (error) {
        console.error(`Error processing ticker ${ticker}:`, error);
        results.push({
          ticker,
          name: ticker,
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          metrics: {
            open: 0,
            high: 0,
            low: 0,
            previousClose: 0
          },
          details: {},
          analysis: '',
          lastUpdated: new Date(),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  /**
   * Update database with financial data for a ticker
   */
  async updateTickerFinancials(ticker: string, financialData: {
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    metrics: any;
    details: any;
    analysis: string;
    lastUpdated: Date;
  }): Promise<void> {
    try {
      // Update the earnings_events collection with financial data
      const earningsQuery = adminDb.collection('earnings_events')
        .where('ticker', '==', ticker);
      
      const snapshot = await earningsQuery.get();
      
      const updatePromises = snapshot.docs.map(doc => {
        return doc.ref.update({
          currentPrice: financialData.price,
          priceChange: financialData.change,
          priceChangePercent: financialData.changePercent,
          volume: financialData.volume,
          metrics: financialData.metrics,
          companyDetails: financialData.details,
          technicalAnalysis: financialData.analysis,
          financialsLastUpdated: financialData.lastUpdated,
          updatedAt: new Date()
        });
      });
      
      await Promise.all(updatePromises);
      
      // Also create/update a dedicated stock data collection
      const stockDoc = adminDb.collection('stock_data').doc(ticker);
      await stockDoc.set({
        ticker,
        name: financialData.name,
        price: financialData.price,
        change: financialData.change,
        changePercent: financialData.changePercent,
        volume: financialData.volume,
        metrics: financialData.metrics,
        details: financialData.details,
        analysis: financialData.analysis,
        lastUpdated: financialData.lastUpdated,
        updatedAt: new Date()
      }, { merge: true });
      
      console.log(`Updated financial data for ${ticker}`);
    } catch (error) {
      console.error(`Error updating financials for ${ticker}:`, error);
      throw error;
    }
  }
}

/**
 * Create a new PolygonAgent instance
 */
export function createPolygonAgent(): PolygonAgent {
  return new PolygonAgent();
}