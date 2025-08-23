import { createSerperTool, formatMultipleAnalystQueries, formatAnalystInsightQuery, parseAnalystResults } from "../tools/serperTool";
import { adminDb } from "../firebase-admin";

interface RealAnalyst {
  name: string;
  firm: string;
}

// Real analysts from our database
const REAL_ANALYSTS: RealAnalyst[] = [
  { name: 'David Kostin', firm: 'Goldman Sachs' },
  { name: 'Dubravko Lakos-Bujas', firm: 'J.P. Morgan' },
  { name: 'Bruce Kasman', firm: 'J.P. Morgan' },
  { name: 'Michael Wilson', firm: 'Morgan Stanley' },
  { name: 'Andrew Slimmon', firm: 'Morgan Stanley' },
  { name: 'Savita Subramanian', firm: 'Bank of America' },
  { name: 'Scott T. Chronert', firm: 'Citi' },
  { name: 'Venu Krishna', firm: 'Barclays' },
  { name: 'Tom Lee', firm: 'Fundstrat Global Advisors' },
  { name: 'Peter Berezin', firm: 'BCA Research' },
  { name: 'Barry Bannister', firm: 'Stifel' },
  { name: 'Mohamed El-Erian', firm: "Queens' College, Cambridge" },
  { name: 'Nouriel Roubini', firm: 'Roubini Macro Associates' }
];

/**
 * Analyst Search Service
 * Fetches real analyst data using Serper for stock analysis
 */
export class AnalystSearchService {
  private serperTool: any;
  
  constructor() {
    this.serperTool = createSerperTool();
  }

  /**
   * Search for analyst insights for a specific ticker from all real analysts
   */
  async searchAnalystInsights(ticker: string): Promise<{
    ticker: string;
    analystInsights: Array<{
      analyst: string;
      firm: string;
      rating?: string;
      priceTarget?: string;
      insights: Array<{
        title: string;
        snippet: string;
        source: string;
        relevanceScore: number;
      }>;
    }>;
    firmInsights: Array<{
      firm: string;
      insights: Array<{
        title: string;
        snippet: string;
        source: string;
        rating?: string;
        priceTarget?: string;
      }>;
    }>;
    lastUpdated: Date;
  }> {
    try {
      console.log(`Searching for analyst insights for ${ticker} from ${REAL_ANALYSTS.length} real analysts...`);
      
      const analystInsights = [];
      const firmInsightsMap = new Map<string, any[]>();
      
      // Search for individual analyst insights (limited to avoid rate limits)
      for (const analyst of REAL_ANALYSTS.slice(0, 8)) { // Top 8 analysts
        try {
          const query = formatAnalystInsightQuery(ticker, analyst.name, analyst.firm);
          console.log(`Searching: ${query}`);
          
          const searchResults = await this.serperTool.search(query);
          const parsedResults = parseAnalystResults(searchResults, analyst.name, analyst.firm);
          
          // Filter results that mention the analyst or firm
          const relevantResults = parsedResults.filter(result => 
            result.analystMention || result.firmMention
          );
          
          if (relevantResults.length > 0) {
            const insight = {
              analyst: analyst.name,
              firm: analyst.firm,
              rating: relevantResults.find(r => r.rating)?.rating || undefined,
              priceTarget: relevantResults.find(r => r.priceTarget)?.priceTarget || undefined,
              insights: relevantResults.map(r => ({
                title: r.title,
                snippet: r.snippet,
                source: r.source,
                relevanceScore: this.calculateRelevanceScore(r, analyst.name, analyst.firm)
              }))
            };
            
            analystInsights.push(insight);
            
            // Also collect firm-level insights
            if (!firmInsightsMap.has(analyst.firm)) {
              firmInsightsMap.set(analyst.firm, []);
            }
            firmInsightsMap.get(analyst.firm)!.push(...relevantResults);
          }
          
          // Rate limiting - wait between searches
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          console.error(`Error searching for ${analyst.name} at ${analyst.firm}:`, error);
          continue;
        }
      }
      
      // Search for firm-level coverage for key firms
      const keyFirms = ['Goldman Sachs', 'Morgan Stanley', 'J.P. Morgan', 'Bank of America'];
      for (const firm of keyFirms) {
        if (!firmInsightsMap.has(firm)) {
          try {
            const query = `${firm} ${ticker} analyst coverage rating recommendation price target 2024 2025`;
            console.log(`Searching firm coverage: ${query}`);
            
            const searchResults = await this.serperTool.search(query);
            const parsedResults = parseAnalystResults(searchResults, undefined, firm);
            
            const firmResults = parsedResults.filter(result => result.firmMention);
            if (firmResults.length > 0) {
              firmInsightsMap.set(firm, firmResults);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1500));
          } catch (error) {
            console.error(`Error searching firm coverage for ${firm}:`, error);
            continue;
          }
        }
      }
      
      // Convert firm insights map to array
      const firmInsights = Array.from(firmInsightsMap.entries()).map(([firm, insights]) => ({
        firm,
        insights: insights.map(insight => ({
          title: insight.title,
          snippet: insight.snippet,
          source: insight.source,
          rating: insight.rating || undefined,
          priceTarget: insight.priceTarget || undefined
        }))
      }));
      
      return {
        ticker,
        analystInsights,
        firmInsights,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error searching analyst insights for ${ticker}:`, error);
      throw new Error(`Failed to search analyst insights for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate relevance score for a search result
   */
  private calculateRelevanceScore(result: any, analystName: string, firmName: string): number {
    let score = 0;
    
    // Base score for having content
    score += 10;
    
    // Boost for analyst name mention
    if (result.analystMention) {
      score += 30;
    }
    
    // Boost for firm mention
    if (result.firmMention) {
      score += 20;
    }
    
    // Boost for having rating
    if (result.rating) {
      score += 25;
    }
    
    // Boost for having price target
    if (result.priceTarget) {
      score += 15;
    }
    
    // Boost for recent content (check if title/snippet mentions recent dates)
    const text = `${result.title} ${result.snippet}`.toLowerCase();
    if (text.includes('2024') || text.includes('2025')) {
      score += 10;
    }
    
    return Math.min(100, score);
  }

  /**
   * Save analyst insights to database
   */
  async saveAnalystInsights(ticker: string, insights: any): Promise<void> {
    try {
      // Clean the data to remove any undefined values
      const cleanedInsights = this.cleanDataForFirestore(insights);
      
      const docRef = adminDb.collection('analyst_web_insights').doc(ticker);
      await docRef.set({
        ticker,
        ...cleanedInsights,
        updatedAt: new Date()
      }, { merge: true });
      
      console.log(`Saved analyst insights for ${ticker}`);
    } catch (error) {
      console.error(`Error saving analyst insights for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Clean data recursively to remove undefined values for Firestore
   */
  private cleanDataForFirestore(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanDataForFirestore(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = this.cleanDataForFirestore(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  /**
   * Get cached analyst insights from database
   */
  async getCachedAnalystInsights(ticker: string, maxAgeMinutes: number = 60): Promise<any | null> {
    try {
      const doc = await adminDb.collection('analyst_web_insights').doc(ticker).get();
      
      if (!doc.exists) {
        return null;
      }
      
      const data = doc.data();
      
      // Handle both Firestore Timestamp and regular Date objects
      let lastUpdated: Date;
      if (data?.lastUpdated) {
        if (typeof data.lastUpdated.toDate === 'function') {
          // Firestore Timestamp
          lastUpdated = data.lastUpdated.toDate();
        } else if (data.lastUpdated instanceof Date) {
          // Regular Date object
          lastUpdated = data.lastUpdated;
        } else {
          // String or other format - try to parse
          lastUpdated = new Date(data.lastUpdated);
        }
      } else {
        lastUpdated = new Date(0);
      }
      
      const ageMinutes = (Date.now() - lastUpdated.getTime()) / (1000 * 60);
      
      if (ageMinutes <= maxAgeMinutes) {
        return data;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting cached insights for ${ticker}:`, error);
      return null;
    }
  }
}

/**
 * Create a new AnalystSearchService instance
 */
export function createAnalystSearchService(): AnalystSearchService {
  return new AnalystSearchService();
}