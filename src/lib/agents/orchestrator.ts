import { createSearchAgent } from "./searchAgent";
import { createPolygonAgent } from "./polygonAgent";
import { createEarningsAgent } from "./earningsAgent";
import { adminDb } from "../firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { AgentUpdateResult, BatchUpdateResult } from "@/types";

/**
 * Agent Orchestrator
 * Coordinates updates from both SearchAgent (Serper) and PolygonAgent
 */
export class AgentOrchestrator {
  private searchAgent: any;
  private polygonAgent: any;
  private earningsAgent: any;

  constructor() {
    this.searchAgent = createSearchAgent();
    this.polygonAgent = createPolygonAgent();
    this.earningsAgent = createEarningsAgent();
  }

  /**
   * Get list of tickers from earnings events or watchlists
   */
  async getActiveTickers(limitCount: number = 20): Promise<string[]> {
    try {
      // Get upcoming earnings events
      const earningsSnapshot = await adminDb.collection('earnings_events')
        .where('expectedDate', '>=', new Date())
        .orderBy('expectedDate', 'asc')
        .limit(limitCount)
        .get();

      const tickers = earningsSnapshot.docs.map(doc => doc.data().ticker);
      
      // Remove duplicates
      return [...new Set(tickers)];
    } catch (error) {
      console.error('Error getting active tickers:', error);
      return [];
    }
  }

  /**
   * Update a single ticker with both news and financial data
   */
  async updateTicker(ticker: string): Promise<AgentUpdateResult> {
    const startTime = new Date();
    let newsUpdated = false;
    let financialsUpdated = false;
    let error: string | undefined;

    try {
      console.log(`Starting update for ${ticker}`);

      // Run both agents in parallel for better performance
      const [newsResult, financialResult] = await Promise.allSettled([
        this.updateTickerNews(ticker),
        this.updateTickerFinancials(ticker)
      ]);

      // Handle news result
      if (newsResult.status === 'fulfilled') {
        newsUpdated = true;
        console.log(`News updated for ${ticker}`);
      } else {
        console.error(`News update failed for ${ticker}:`, newsResult.reason);
        error = `News: ${newsResult.reason?.message || 'Unknown error'}`;
      }

      // Handle financial result
      if (financialResult.status === 'fulfilled') {
        financialsUpdated = true;
        console.log(`Financials updated for ${ticker}`);
      } else {
        console.error(`Financial update failed for ${ticker}:`, financialResult.reason);
        error = error 
          ? `${error}; Financials: ${financialResult.reason?.message || 'Unknown error'}`
          : `Financials: ${financialResult.reason?.message || 'Unknown error'}`;
      }

      const success = newsUpdated || financialsUpdated;

      return {
        ticker,
        success,
        error,
        newsUpdated,
        financialsUpdated,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error updating ticker ${ticker}:`, error);
      return {
        ticker,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        newsUpdated: false,
        financialsUpdated: false,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Update news data for a ticker
   */
  private async updateTickerNews(ticker: string): Promise<void> {
    const newsData = await this.searchAgent.searchForTicker(ticker);
    await this.searchAgent.updateTickerNews(ticker, {
      news: newsData.news,
      summary: newsData.summary,
      lastUpdated: newsData.lastUpdated
    });
  }

  /**
   * Update financial data for a ticker
   */
  private async updateTickerFinancials(ticker: string): Promise<void> {
    const financialData = await this.polygonAgent.getFinancialData(ticker);
    if (financialData.success) {
      await this.polygonAgent.updateTickerFinancials(ticker, {
        name: financialData.name,
        price: financialData.price,
        change: financialData.change,
        changePercent: financialData.changePercent,
        volume: financialData.volume,
        metrics: financialData.metrics,
        details: financialData.details,
        analysis: financialData.analysis,
        lastUpdated: financialData.lastUpdated
      });
    } else {
      throw new Error(financialData.error || 'Financial data fetch failed');
    }
  }

  /**
   * Update multiple tickers in batch
   */
  async updateTickersBatch(tickers: string[]): Promise<BatchUpdateResult> {
    const startTime = new Date();
    const results: AgentUpdateResult[] = [];

    console.log(`Starting batch update for ${tickers.length} tickers`);

    for (const ticker of tickers) {
      try {
        const result = await this.updateTicker(ticker);
        results.push(result);

        // Add delay between tickers to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      } catch (error) {
        console.error(`Batch update error for ${ticker}:`, error);
        results.push({
          ticker,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          newsUpdated: false,
          financialsUpdated: false,
          lastUpdated: new Date()
        });
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log(`Batch update completed: ${successCount} success, ${errorCount} errors in ${duration}ms`);

    return {
      totalProcessed: results.length,
      successCount,
      errorCount,
      results,
      duration,
      startTime,
      endTime
    };
  }

  /**
   * Run full update cycle for all active tickers
   */
  async runFullUpdateCycle(limitCount: number = 10): Promise<BatchUpdateResult> {
    try {
      console.log('Starting full update cycle');
      
      const tickers = await this.getActiveTickers(limitCount);
      
      if (tickers.length === 0) {
        console.log('No active tickers found');
        return {
          totalProcessed: 0,
          successCount: 0,
          errorCount: 0,
          results: [],
          duration: 0,
          startTime: new Date(),
          endTime: new Date()
        };
      }

      console.log(`Found ${tickers.length} active tickers: ${tickers.join(', ')}`);
      
      const result = await this.updateTickersBatch(tickers);
      
      // Log update cycle to usage metrics
      await this.logUpdateCycle(result);
      
      return result;
    } catch (error) {
      console.error('Error running full update cycle:', error);
      throw error;
    }
  }

  /**
   * Log update cycle metrics
   */
  private async logUpdateCycle(result: BatchUpdateResult): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const metricsRef = adminDb.collection('agent_metrics').doc(today);
      
      await metricsRef.set({
        date: today,
        updateCycles: FieldValue.increment(1),
        totalTickersProcessed: FieldValue.increment(result.totalProcessed),
        successfulUpdates: FieldValue.increment(result.successCount),
        failedUpdates: FieldValue.increment(result.errorCount),
        totalDuration: FieldValue.increment(result.duration),
        lastUpdateCycle: result.endTime,
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('Error logging update cycle metrics:', error);
    }
  }

  /**
   * Check if a ticker needs updating based on last update time
   */
  async shouldUpdateTicker(ticker: string, maxAgeHours: number = 4): Promise<boolean> {
    try {
      const stockDoc = await adminDb.collection('stock_data').doc(ticker).get();
      
      if (!stockDoc.exists) {
        return true; // No data exists, should update
      }
      
      const data = stockDoc.data();
      const lastUpdated = data?.lastUpdated?.toDate();
      
      if (!lastUpdated) {
        return true; // No last updated timestamp
      }
      
      const ageHours = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
      return ageHours > maxAgeHours;
    } catch (error) {
      console.error(`Error checking if ticker ${ticker} needs update:`, error);
      return true; // Default to update on error
    }
  }

  /**
   * Get smart list of tickers that need updating
   */
  async getTickersToUpdate(maxTickers: number = 10, maxAgeHours: number = 4): Promise<string[]> {
    try {
      const allTickers = await this.getActiveTickers(maxTickers * 2); // Get more to filter
      const tickersToUpdate: string[] = [];
      
      for (const ticker of allTickers) {
        if (tickersToUpdate.length >= maxTickers) break;
        
        const shouldUpdate = await this.shouldUpdateTicker(ticker, maxAgeHours);
        if (shouldUpdate) {
          tickersToUpdate.push(ticker);
        }
      }
      
      return tickersToUpdate;
    } catch (error) {
      console.error('Error getting tickers to update:', error);
      return [];
    }
  }

  /**
   * Run smart update cycle (only updates stale data)
   */
  async runSmartUpdateCycle(maxTickers: number = 10, maxAgeHours: number = 4): Promise<BatchUpdateResult> {
    try {
      console.log('Starting smart update cycle');
      
      const tickers = await this.getTickersToUpdate(maxTickers, maxAgeHours);
      
      if (tickers.length === 0) {
        console.log('No tickers need updating');
        return {
          totalProcessed: 0,
          successCount: 0,
          errorCount: 0,
          results: [],
          duration: 0,
          startTime: new Date(),
          endTime: new Date()
        };
      }

      console.log(`Smart update will process ${tickers.length} tickers: ${tickers.join(', ')}`);
      
      return await this.updateTickersBatch(tickers);
    } catch (error) {
      console.error('Error running smart update cycle:', error);
      throw error;
    }
  }

  /**
   * Update earnings calendar with real data from external sources
   */
  async updateEarningsCalendar(
    startDate?: string,
    endDate?: string
  ): Promise<{
    success: boolean;
    created: number;
    updated: number;
    errors: number;
    message: string;
    duration: number;
  }> {
    const startTime = new Date();
    
    try {
      console.log('Starting earnings calendar update');
      
      const result = await this.earningsAgent.updateDatabaseWithRealEarnings(
        startDate,
        endDate
      );
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      const message = `Earnings calendar update completed: ${result.created} created, ${result.updated} updated, ${result.errors} errors in ${duration}ms`;
      
      console.log(message);
      
      // Log the update to metrics
      await this.logEarningsCalendarUpdate(result, duration);
      
      return {
        success: result.errors === 0 || (result.created + result.updated) > 0,
        created: result.created,
        updated: result.updated,
        errors: result.errors,
        message,
        duration
      };
    } catch (error) {
      console.error('Error updating earnings calendar:', error);
      
      const duration = new Date().getTime() - startTime.getTime();
      
      return {
        success: false,
        created: 0,
        updated: 0,
        errors: 1,
        message: `Earnings calendar update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  /**
   * Refresh earnings data for specific tickers
   */
  async refreshEarningsForTickers(tickers: string[]): Promise<{
    success: boolean;
    results: Array<any>;
    count: number;
    message: string;
  }> {
    try {
      console.log(`Refreshing earnings data for ${tickers.length} tickers`);
      
      const results = await this.earningsAgent.fetchEarningsForTickers(tickers);
      
      // Update the database with the refreshed data
      for (const result of results) {
        try {
          // Look for existing earnings events for this ticker
          const existingQuery = adminDb.collection('earnings_events')
            .where('ticker', '==', result.ticker);
          
          const snapshot = await existingQuery.get();
          
          if (snapshot.empty) {
            // Create new earnings event
            await adminDb.collection('earnings_events').add({
              ticker: result.ticker,
              companyName: result.companyName,
              expectedDate: result.expectedDate,
              expectedTime: result.expectedTime,
              market: 'SP500', // Default
              sector: 'Unknown',
              quarter: result.fiscalPeriod,
              fiscalYear: result.fiscalYear,
              dataSource: result.source,
              confidence: result.confidence,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          } else {
            // Update existing
            const doc = snapshot.docs[0];
            await doc.ref.update({
              expectedDate: result.expectedDate,
              expectedTime: result.expectedTime,
              fiscalYear: result.fiscalYear,
              dataSource: result.source,
              confidence: result.confidence,
              updatedAt: new Date()
            });
          }
        } catch (error) {
          console.error(`Error updating earnings for ${result.ticker}:`, error);
        }
      }
      
      return {
        success: true,
        results,
        count: results.length,
        message: `Found and updated earnings data for ${results.length} tickers`
      };
    } catch (error) {
      console.error('Error refreshing earnings for tickers:', error);
      
      return {
        success: false,
        results: [],
        count: 0,
        message: `Failed to refresh earnings: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Log earnings calendar update metrics
   */
  private async logEarningsCalendarUpdate(
    result: { created: number; updated: number; errors: number },
    duration: number
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const metricsRef = adminDb.collection('agent_metrics').doc(today);
      
      await metricsRef.set({
        date: today,
        earningsCalendarUpdates: FieldValue.increment(1),
        earningsCreated: FieldValue.increment(result.created),
        earningsUpdated: FieldValue.increment(result.updated),
        earningsErrors: FieldValue.increment(result.errors),
        lastEarningsUpdate: new Date(),
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('Error logging earnings calendar metrics:', error);
    }
  }
}

/**
 * Create a new AgentOrchestrator instance
 */
export function createAgentOrchestrator(): AgentOrchestrator {
  return new AgentOrchestrator();
}