import { createPolygonTool } from "../tools/polygonTool";
import { createSerperTool, formatEarningsCalendarQuery, parseEarningsCalendarResults } from "../tools/serperTool";
import { createSP500EarningsManager, getSP500Companies, getTopSP500Companies, DateQuarterUtils } from "../utils/sp500Tickers";
import { adminDb } from "../firebase-admin";
import type { EarningsEvent } from "@/types";

/**
 * Earnings Calendar Agent
 * Combines Polygon.io and web search to fetch real earnings dates
 */
export class EarningsAgent {
  private polygonTool: any;
  private serperTool: any;
  private sp500Manager: any;
  
  constructor() {
    this.polygonTool = createPolygonTool();
    this.serperTool = createSerperTool();
    this.sp500Manager = createSP500EarningsManager();
  }

  /**
   * Fetch comprehensive earnings calendar from multiple sources using S&P 500 companies
   */
  async fetchEarningsCalendar(
    startDate?: string,
    endDate?: string,
    useWebSearch: boolean = true,
    limit: number = 50
  ): Promise<{
    sp500: Array<any>;
    polygon: Array<any>;
    webSearch: Array<any>;
    combined: Array<{
      ticker: string;
      companyName: string;
      expectedDate: Date;
      expectedTime: 'before_market' | 'after_market' | 'during_market';
      fiscalPeriod: string;
      fiscalYear: number;
      source: 'sp500' | 'polygon' | 'web' | 'combined';
      confidence: number;
    }>;
    totalFound: number;
  }> {
    try {
      console.log(`Fetching earnings calendar for ${limit} S&P 500 companies...`);

      // Fetch real earnings dates from S&P 500 companies
      console.log('Fetching S&P 500 earnings calendar...');
      const sp500Results = await this.sp500Manager.fetchEarningsCalendarForSP500(limit);
      
      // Convert S&P 500 results to standard format
      const formattedSP500Results = sp500Results
        .filter((company: any) => company.nextEarningsDate) // Only include companies with earnings dates
        .map((company: any) => ({
          ticker: company.ticker,
          companyName: company.companyName,
          reportDate: company.nextEarningsDate!,
          fiscalPeriod: company.quarterlyPattern || 'Q4',
          fiscalYear: company.nextEarningsDate!.getFullYear(),
          reportTime: this.determineReportTime(company.ticker),
          confidence: company.confidence,
          sector: company.sector,
          industry: company.industry
        }));

      // Fetch from Polygon for top companies as backup
      console.log('Fetching backup data from Polygon...');
      const polygonResults = await this.polygonTool.getEarningsCalendar();
      
      let webResults: Array<any> = [];
      
      // Fetch additional web search data if enabled
      if (useWebSearch) {
        console.log('Fetching additional earnings data from web search...');
        const topTickers = getTopSP500Companies(10).map(c => c.ticker);
        
        // Search for specific high-profile companies with dynamic season focus
        for (const ticker of topTickers.slice(0, 5)) {
          try {
            const companyName = getTopSP500Companies().find(c => c.ticker === ticker)?.companyName || ticker;
            const query = DateQuarterUtils.buildDynamicEarningsQuery(ticker, companyName);
            const searchResponse = await this.serperTool.search(query);
            const tickerResults = parseEarningsCalendarResults(searchResponse);
            webResults.push(...tickerResults);
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.warn(`Web search failed for ${ticker}:`, error);
          }
        }
      }

      // Combine all results with S&P 500 data prioritized
      const combined = this.combineEarningsDataWithSP500(formattedSP500Results, polygonResults.results, webResults);

      console.log(`Earnings calendar fetch completed: ${formattedSP500Results.length} S&P 500, ${polygonResults.results.length} Polygon, ${webResults.length} web results`);

      return {
        sp500: formattedSP500Results,
        polygon: polygonResults.results,
        webSearch: webResults,
        combined,
        totalFound: combined.length
      };
    } catch (error) {
      console.error('Error fetching earnings calendar:', error);
      throw error;
    }
  }

  /**
   * Fetch earnings for specific tickers
   */
  async fetchEarningsForTickers(tickers: string[]): Promise<Array<{
    ticker: string;
    companyName: string;
    expectedDate: Date;
    expectedTime: 'before_market' | 'after_market' | 'during_market';
    fiscalPeriod: string;
    fiscalYear: number;
    source: 'polygon' | 'web';
    confidence: number;
  }>> {
    try {
      console.log(`Fetching earnings for specific tickers: ${tickers.join(', ')}`);
      
      // Get upcoming earnings from Polygon for specific tickers
      const polygonResults = await this.polygonTool.getUpcomingEarnings(tickers);
      
      // Enhance with web search for each ticker
      const enhancedResults = [];
      
      for (const result of polygonResults) {
        enhancedResults.push({
          ...result,
          source: 'polygon' as const,
          confidence: 0.9 // High confidence for Polygon data
        });
      }

      // Add web search results for tickers not found in Polygon
      const foundTickers = polygonResults.map((r: any) => r.ticker);
      const missingTickers = tickers.filter((t: string) => !foundTickers.includes(t));
      
      if (missingTickers.length > 0) {
        console.log(`Searching web for missing tickers: ${missingTickers.join(', ')}`);
        
        for (const ticker of missingTickers) {
          try {
            const searchQuery = `${ticker} earnings date 2025 when next earnings call`;
            const searchResponse = await this.serperTool.search(searchQuery);
            const webResults = parseEarningsCalendarResults(searchResponse);
            
            const tickerResult = webResults.find(r => r.ticker === ticker);
            if (tickerResult && tickerResult.date) {
              enhancedResults.push({
                ticker: tickerResult.ticker!,
                companyName: tickerResult.companyName || ticker,
                expectedDate: this.parseDate(tickerResult.date),
                expectedTime: 'after_market' as const, // Default assumption
                fiscalPeriod: 'Q1', // Default assumption
                fiscalYear: new Date().getFullYear(),
                source: 'web' as const,
                confidence: 0.6 // Lower confidence for web data
              });
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error searching for ${ticker}:`, error);
          }
        }
      }

      return enhancedResults;
    } catch (error) {
      console.error('Error fetching earnings for tickers:', error);
      throw error;
    }
  }

  /**
   * Update database with real earnings data from S&P 500 companies
   */
  async updateDatabaseWithRealEarnings(
    startDate?: string,
    endDate?: string,
    limit: number = 50
  ): Promise<{
    updated: number;
    created: number;
    errors: number;
    results: Array<{
      ticker: string;
      action: 'updated' | 'created' | 'error';
      message: string;
    }>;
  }> {
    try {
      console.log(`Updating database with real earnings data for ${limit} S&P 500 companies...`);
      
      const earningsData = await this.fetchEarningsCalendar(startDate, endDate, true, limit);
      
      const results = [];
      let updated = 0;
      let created = 0;
      let errors = 0;

      for (const earnings of earningsData.combined) {
        try {
          // Check if earnings event already exists (simplified to avoid index requirement)
          const existingQuery = adminDb.collection('earnings_events')
            .where('ticker', '==', earnings.ticker);
          
          const existingSnapshot = await existingQuery.get();
          
          if (!existingSnapshot.empty) {
            // Update the most recent existing record for this ticker (strict duplicate prevention)
            const mostRecentDoc = existingSnapshot.docs.reduce((latest, current) => {
              const latestDate = latest.data().updatedAt?.toDate() || latest.data().createdAt?.toDate() || new Date(0);
              const currentDate = current.data().updatedAt?.toDate() || current.data().createdAt?.toDate() || new Date(0);
              return currentDate > latestDate ? current : latest;
            });
            
            // Build update object, filtering out undefined values
            const updateData: any = {
              companyName: earnings.companyName || earnings.ticker, // Fallback to ticker
              expectedDate: earnings.expectedDate,
              quarter: earnings.fiscalPeriod || 'Q4', // Default to Q4
              fiscalYear: earnings.fiscalYear || new Date().getFullYear(),
              dataSource: earnings.source || 'unknown',
              confidence: earnings.confidence || 0.5,
              updatedAt: new Date()
            };
            
            // Only add expectedTime if it's defined
            if (earnings.expectedTime) {
              updateData.expectedTime = earnings.expectedTime;
            } else {
              updateData.expectedTime = 'after_market'; // Default value
            }
            
            await mostRecentDoc.ref.update(updateData);
            
            updated++;
            results.push({
              ticker: earnings.ticker,
              action: 'updated' as const,
              message: `Updated existing earnings record with ${earnings.source} data`
            });
          } else {
            // Create new record with proper defaults
            const newRecordData = {
              ticker: earnings.ticker,
              companyName: earnings.companyName || earnings.ticker,
              expectedDate: earnings.expectedDate,
              expectedTime: earnings.expectedTime || 'after_market',
              market: this.guessMarket(earnings.ticker),
              sector: 'Unknown', // Will be updated by other agents
              quarter: earnings.fiscalPeriod || 'Q4',
              fiscalYear: earnings.fiscalYear || new Date().getFullYear(),
              dataSource: earnings.source || 'unknown',
              confidence: earnings.confidence || 0.5,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            await adminDb.collection('earnings_events').add(newRecordData);
            
            created++;
            results.push({
              ticker: earnings.ticker,
              action: 'created' as const,
              message: `Created new earnings record from ${earnings.source} data`
            });
          }
        } catch (error) {
          console.error(`Error updating earnings for ${earnings.ticker}:`, error);
          errors++;
          results.push({
            ticker: earnings.ticker,
            action: 'error' as const,
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log(`Database update completed: ${created} created, ${updated} updated, ${errors} errors`);
      
      return {
        updated,
        created,
        errors,
        results
      };
    } catch (error) {
      console.error('Error updating database with real earnings:', error);
      throw error;
    }
  }

  /**
   * Determine report time based on company patterns
   */
  private determineReportTime(ticker: string): 'before_market' | 'after_market' | 'during_market' {
    // Most companies report after market close
    // Some known before-market reporters: JPM, WFC, GS, etc.
    const beforeMarketTickers = ['JPM', 'WFC', 'GS', 'BAC', 'C'];
    return beforeMarketTickers.includes(ticker) ? 'before_market' : 'after_market';
  }

  /**
   * Combine earnings data with S&P 500 prioritization
   */
  private combineEarningsDataWithSP500(sp500Results: Array<any>, polygonResults: Array<any>, webResults: Array<any>): Array<any> {
    const combined = new Map();
    
    // Start with S&P 500 results (highest priority)
    sp500Results.forEach(result => {
      const key = `${result.ticker}-${result.reportDate.toISOString().split('T')[0]}`;
      combined.set(key, {
        ticker: result.ticker,
        companyName: result.companyName,
        expectedDate: result.reportDate,
        expectedTime: result.reportTime || 'after_market',
        fiscalPeriod: result.fiscalPeriod || 'Q4',
        fiscalYear: result.fiscalYear || new Date().getFullYear(),
        source: 'sp500',
        confidence: result.confidence || 0.8,
        sector: result.sector,
        industry: result.industry
      });
    });
    
    // Add Polygon results (medium priority, don't overwrite S&P 500)
    polygonResults.forEach(result => {
      const key = `${result.ticker}-${result.reportDate.toISOString().split('T')[0]}`;
      
      if (!combined.has(key)) {
        combined.set(key, {
          ticker: result.ticker,
          companyName: result.companyName || result.ticker,
          expectedDate: result.reportDate,
          expectedTime: result.reportTime || 'after_market',
          fiscalPeriod: result.fiscalPeriod || 'Q4',
          fiscalYear: result.fiscalYear || new Date().getFullYear(),
          source: 'polygon',
          confidence: 0.9
        });
      }
    });
    
    // Add web results (lowest priority)
    webResults.forEach(result => {
      if (result.ticker && result.date) {
        const parsedDate = this.parseDate(result.date);
        const key = `${result.ticker}-${parsedDate.toISOString().split('T')[0]}`;
        
        if (!combined.has(key)) {
          combined.set(key, {
            ticker: result.ticker,
            companyName: result.companyName || result.ticker,
            expectedDate: parsedDate,
            expectedTime: 'after_market',
            fiscalPeriod: 'Q4',
            fiscalYear: parsedDate.getFullYear(),
            source: 'web',
            confidence: 0.6
          });
        }
      }
    });
    
    return Array.from(combined.values());
  }

  /**
   * Combine and deduplicate earnings data from multiple sources (legacy method)
   */
  private combineEarningsData(polygonResults: Array<any>, webResults: Array<any>): Array<any> {
    const combined = new Map();
    
    // Add Polygon results (higher priority)
    polygonResults.forEach(result => {
      const key = `${result.ticker}-${result.reportDate.toISOString().split('T')[0]}`;
      combined.set(key, {
        ticker: result.ticker,
        companyName: result.companyName || result.ticker,
        expectedDate: result.reportDate,
        expectedTime: result.reportTime || 'after_market',
        fiscalPeriod: result.fiscalPeriod || 'Q4',
        fiscalYear: result.fiscalYear || new Date().getFullYear(),
        source: 'polygon',
        confidence: 0.9
      });
    });
    
    // Add web results (lower priority, don't overwrite Polygon data)
    webResults.forEach(result => {
      if (result.ticker && result.date) {
        const parsedDate = this.parseDate(result.date);
        const key = `${result.ticker}-${parsedDate.toISOString().split('T')[0]}`;
        
        if (!combined.has(key)) {
          combined.set(key, {
            ticker: result.ticker,
            companyName: result.companyName || result.ticker,
            expectedDate: parsedDate,
            expectedTime: 'after_market',
            fiscalPeriod: 'Q4', // Default to Q4
            fiscalYear: parsedDate.getFullYear(),
            source: 'web',
            confidence: 0.6
          });
        }
      }
    });
    
    return Array.from(combined.values());
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateStr: string): Date {
    try {
      // Handle various date formats
      const normalizedDate = dateStr
        .replace(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, (match, m, d, y) => {
          const year = y.length === 2 ? `20${y}` : y;
          return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        });
      
      const parsed = new Date(normalizedDate);
      
      // If parsing failed, return a date 30 days from now as fallback
      if (isNaN(parsed.getTime())) {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
      
      return parsed;
    } catch (error) {
      // Fallback to 30 days from now
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Guess market based on ticker (simple heuristic)
   */
  private guessMarket(ticker: string): 'SP500' | 'TA125' {
    // Very basic heuristic - in reality you'd want a proper mapping
    return 'SP500'; // Default to S&P 500
  }

  /**
   * Guess quarter based on date
   */
  private guessQuarter(date: Date): string {
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    
    if (month >= 1 && month <= 3) {
      return 'Q1';
    } else if (month >= 4 && month <= 6) {
      return 'Q2';
    } else if (month >= 7 && month <= 9) {
      return 'Q3';
    } else {
      return 'Q4';
    }
  }

  /**
   * Fetch S&P 500 tech sector companies with intelligent filtering
   * Returns all tech companies but identifies which need analysis
   */
  async fetchTechSectorWithIntelligentFiltering(): Promise<{
    allTechCompanies: Array<any>;
    companiesForAnalysis: string[];
    summary: {
      totalTechCompanies: number;
      companiesWithUpcomingEarnings: number;
      companiesNeedingAnalysis: number;
    };
  }> {
    try {
      console.log('Fetching S&P 500 tech sector with intelligent filtering...');
      
      const result = await this.sp500Manager.fetchTechSectorEarningsCalendar();
      
      console.log(`Tech sector filtering complete: ${result.summary.totalTechCompanies} companies found, ${result.summary.companiesNeedingAnalysis} need analysis`);
      
      return result;
    } catch (error) {
      console.error('Error in fetchTechSectorWithIntelligentFiltering:', error);
      throw error;
    }
  }

  /**
   * Update database with S&P 500 tech sector companies (all companies, selective analysis)
   */
  async updateDatabaseWithTechSector(): Promise<{
    created: number;
    updated: number;
    errors: number;
    companiesForAnalysis: string[];
    summary: {
      totalTechCompanies: number;
      companiesWithUpcomingEarnings: number;
      companiesNeedingAnalysis: number;
    };
  }> {
    try {
      console.log('Updating database with S&P 500 tech sector companies...');
      
      // Fetch tech sector data with intelligent filtering
      const techData = await this.fetchTechSectorWithIntelligentFiltering();
      
      let created = 0;
      let updated = 0;
      let errors = 0;

      // Process all tech companies (add to database)
      for (const company of techData.allTechCompanies) {
        try {
          if (!company.nextEarningsDate) {
            console.log(`Skipping ${company.ticker} - no earnings date found`);
            continue;
          }

          // Prepare earnings event data first
          const earningsEvent = {
            ticker: company.ticker,
            companyName: company.companyName,
            expectedDate: company.nextEarningsDate,
            expectedTime: this.determineReportTime(company.ticker),
            market: 'SP500' as const,
            sector: company.sector,
            quarter: company.quarterlyPattern || this.guessQuarter(company.nextEarningsDate),
            fiscalYear: company.nextEarningsDate.getFullYear(),
            confidence: company.confidence,
            dataSource: 'sp500_tech_filtered',
            needsAnalysis: company.needsAnalysis,
            daysUntilEarnings: company.daysUntilEarnings,
            updatedAt: new Date(),
          };

          // Strict duplicate prevention: check for any existing records with same ticker
          const existingQuery = adminDb.collection('earnings_events')
            .where('ticker', '==', company.ticker);
          
          const existing = await existingQuery.get();
          
          if (!existing.empty) {
            // Ticker already exists - update the most recent record instead of creating duplicates
            const mostRecentDoc = existing.docs.reduce((latest, current) => {
              const latestDate = latest.data().updatedAt?.toDate() || latest.data().createdAt?.toDate() || new Date(0);
              const currentDate = current.data().updatedAt?.toDate() || current.data().createdAt?.toDate() || new Date(0);
              return currentDate > latestDate ? current : latest;
            });
            
            // Always update existing record to prevent any duplicates
            await adminDb.collection('earnings_events').doc(mostRecentDoc.id).update(earningsEvent);
            updated++;
            console.log(`Updated existing earnings event for ${company.ticker} (strict duplicate prevention)`);
            continue;
          }

          // Create new earnings event (only reached if no existing ticker found)
          await adminDb.collection('earnings_events').add({
            ...earningsEvent,
            createdAt: new Date(),
          });
          created++;
          console.log(`Created new earnings event for ${company.ticker}`);
        } catch (error) {
          console.error(`Error processing ${company.ticker}:`, error);
          errors++;
        }
      }

      const result = {
        created,
        updated,
        errors,
        companiesForAnalysis: techData.companiesForAnalysis,
        summary: techData.summary
      };

      console.log(`Tech sector database update complete: ${created} created, ${updated} updated, ${errors} errors`);
      console.log(`Companies needing analysis: ${techData.companiesForAnalysis.join(', ')}`);

      return result;
    } catch (error) {
      console.error('Error in updateDatabaseWithTechSector:', error);
      throw error;
    }
  }
}

/**
 * Create a new EarningsAgent instance
 */
export function createEarningsAgent(): EarningsAgent {
  return new EarningsAgent();
}