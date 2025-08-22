/**
 * S&P 500 Ticker Utilities
 * Fetches and manages S&P 500 company listings with real earnings dates
 */

import { createSerperTool } from "../tools/serperTool";

/**
 * Dynamic date and quarter utilities
 */
export class DateQuarterUtils {
  static getCurrentQuarter(date: Date = new Date()): {
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    year: number;
    quarterNumber: number;
  } {
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();
    const quarterNumber = Math.floor(month / 3) + 1;
    const quarter = `Q${quarterNumber}` as 'Q1' | 'Q2' | 'Q3' | 'Q4';
    
    return { quarter, year, quarterNumber };
  }
  
  static getReportingContext(date: Date = new Date()): {
    currentQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    reportingQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    nextQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    year: number;
    reportingMonths: string[];
    nextReportingMonths: string[];
  } {
    const current = this.getCurrentQuarter(date);
    const month = date.getMonth();
    
    // Companies typically report the previous quarter's results
    // Q1 results reported in April-May, Q2 in July-August, Q3 in October-November, Q4 in January-March
    
    let reportingQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    let reportingMonths: string[];
    let nextQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    let nextReportingMonths: string[];
    
    if (month >= 0 && month <= 2) { // January-March: Q4 results being reported
      reportingQuarter = 'Q4';
      reportingMonths = ['January', 'February', 'March'];
      nextQuarter = 'Q1';
      nextReportingMonths = ['April', 'May'];
    } else if (month >= 3 && month <= 5) { // April-June: Q1 results being reported
      reportingQuarter = 'Q1';
      reportingMonths = ['April', 'May', 'June'];
      nextQuarter = 'Q2';
      nextReportingMonths = ['July', 'August'];
    } else if (month >= 6 && month <= 8) { // July-September: Q2 results being reported
      reportingQuarter = 'Q2';
      reportingMonths = ['July', 'August', 'September'];
      nextQuarter = 'Q3';
      nextReportingMonths = ['October', 'November'];
    } else { // October-December: Q3 results being reported
      reportingQuarter = 'Q3';
      reportingMonths = ['October', 'November', 'December'];
      nextQuarter = 'Q4';
      nextReportingMonths = ['January', 'February', 'March'];
    }
    
    return {
      currentQuarter: current.quarter,
      reportingQuarter,
      nextQuarter,
      year: current.year,
      reportingMonths,
      nextReportingMonths
    };
  }
  
  static buildDynamicEarningsQuery(ticker: string, companyName: string): string {
    const context = this.getReportingContext();
    const currentDate = new Date();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    
    // Build dynamic query based on current reporting season
    const reportingMonthsStr = context.reportingMonths.join(' ');
    const nextReportingMonthsStr = context.nextReportingMonths.join(' ');
    
    return `${ticker} ${companyName} earnings date ${context.reportingQuarter} ${context.nextQuarter} ${context.year} when next report ${reportingMonthsStr} ${nextReportingMonthsStr} site:finance.yahoo.com OR site:marketwatch.com OR site:zacks.com`;
  }
  
  static buildDynamicLLMPrompt(ticker: string, searchResults: string): string {
    const context = this.getReportingContext();
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    return `
Today's date: ${currentDate}. Extract the next earnings date for ${ticker} from these search results.

Current Earnings Context:
- Current quarter: ${context.currentQuarter} ${context.year}
- Companies are reporting ${context.reportingQuarter} ${context.year} results during: ${context.reportingMonths.join(', ')} ${context.year}
- Next reporting season: ${context.nextQuarter} results in ${context.nextReportingMonths.join(', ')} ${context.nextQuarter === 'Q1' ? context.year + 1 : context.year}
- Only consider dates AFTER today (${currentDate})

Search Results:
\${searchResults}

Look for:
- "next earnings date" or "earnings call"
- "${context.reportingQuarter} ${context.year}" or "${context.nextQuarter} ${context.year}" results
- Specific dates in current or next reporting months
- "after market close", "before market open"

Return ONLY a JSON object:
{
  "date": "YYYY-MM-DD" or null,
  "quarter": "${context.reportingQuarter}" | "${context.nextQuarter}" or null,
  "confidence": <0.0-1.0 confidence score>
}

Rules:
- Only extract dates AFTER ${currentDate}
- Focus on ${context.reportingQuarter} ${context.year} or ${context.nextQuarter} ${context.year} earnings
- Ignore historical dates from previous quarters/years
- Higher confidence for specific dates with quarter info
- Return only valid JSON
`;
  }
}

export interface SP500Company {
  ticker: string;
  companyName: string;
  sector: string;
  industry: string;
  marketCap?: number;
  nextEarningsDate?: Date;
  lastEarningsDate?: Date;
  quarterlyPattern?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
}

/**
 * S&P 500 companies with sector information
 * This is a curated list of major S&P 500 companies with sector data
 */
const SP500_COMPANIES: Partial<SP500Company>[] = [
  // Technology - Complete S&P 500 Tech Sector List
  { ticker: 'ACN', companyName: 'Accenture plc', sector: 'Technology', industry: 'IT Services' },
  { ticker: 'ADBE', companyName: 'Adobe Inc.', sector: 'Technology', industry: 'Software' },
  { ticker: 'AVGO', companyName: 'Broadcom Inc.', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'CDNS', companyName: 'Cadence Design Systems Inc.', sector: 'Technology', industry: 'Software' },
  { ticker: 'CSCO', companyName: 'Cisco Systems Inc.', sector: 'Technology', industry: 'Network Equipment' },
  { ticker: 'GLW', companyName: 'Corning Incorporated', sector: 'Technology', industry: 'Electronic Components' },
  { ticker: 'CRWD', companyName: 'CrowdStrike Holdings Inc.', sector: 'Technology', industry: 'Cybersecurity' },
  { ticker: 'ENPH', companyName: 'Enphase Energy Inc.', sector: 'Technology', industry: 'Solar Technology' },
  { ticker: 'EPAM', companyName: 'EPAM Systems Inc.', sector: 'Technology', industry: 'IT Services' },
  { ticker: 'HPE', companyName: 'Hewlett Packard Enterprise Co.', sector: 'Technology', industry: 'IT Hardware' },
  { ticker: 'HPQ', companyName: 'HP Inc.', sector: 'Technology', industry: 'Computer Hardware' },
  { ticker: 'KLAC', companyName: 'KLA Corporation', sector: 'Technology', industry: 'Semiconductor Equipment' },
  { ticker: 'LRCX', companyName: 'Lam Research Corporation', sector: 'Technology', industry: 'Semiconductor Equipment' },
  { ticker: 'MCHP', companyName: 'Microchip Technology Incorporated', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'MU', companyName: 'Micron Technology Inc.', sector: 'Technology', industry: 'Memory Semiconductors' },
  { ticker: 'MSFT', companyName: 'Microsoft Corporation', sector: 'Technology', industry: 'Software' },
  { ticker: 'MPWR', companyName: 'Monolithic Power Systems Inc.', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'MSI', companyName: 'Motorola Solutions Inc.', sector: 'Technology', industry: 'Communication Equipment' },
  { ticker: 'NTAP', companyName: 'NetApp Inc.', sector: 'Technology', industry: 'Data Storage' },
  { ticker: 'NVDA', companyName: 'NVIDIA Corporation', sector: 'Technology', industry: 'Graphics Processors' },
  { ticker: 'NXPI', companyName: 'NXP Semiconductors N.V.', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'ON', companyName: 'ON Semiconductor Corporation', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'ORCL', companyName: 'Oracle Corporation', sector: 'Technology', industry: 'Database Software' },
  { ticker: 'PLTR', companyName: 'Palantir Technologies Inc.', sector: 'Technology', industry: 'Big Data Analytics' },
  { ticker: 'PANW', companyName: 'Palo Alto Networks Inc.', sector: 'Technology', industry: 'Cybersecurity' },
  { ticker: 'CRM', companyName: 'Salesforce Inc.', sector: 'Technology', industry: 'Cloud Software' },
  { ticker: 'STX', companyName: 'Seagate Technology Holdings plc', sector: 'Technology', industry: 'Data Storage' },
  { ticker: 'NOW', companyName: 'ServiceNow Inc.', sector: 'Technology', industry: 'Enterprise Software' },
  { ticker: 'SWKS', companyName: 'Skyworks Solutions Inc.', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'SMCI', companyName: 'Super Micro Computer Inc.', sector: 'Technology', industry: 'Computer Hardware' },
  { ticker: 'SNPS', companyName: 'Synopsys Inc.', sector: 'Technology', industry: 'Software' },
  { ticker: 'TEL', companyName: 'TE Connectivity Ltd.', sector: 'Technology', industry: 'Electronic Components' },
  { ticker: 'TDY', companyName: 'Teledyne Technologies Incorporated', sector: 'Technology', industry: 'Aerospace & Defense Technology' },
  { ticker: 'TER', companyName: 'Teradyne Inc.', sector: 'Technology', industry: 'Semiconductor Test Equipment' },
  { ticker: 'TXN', companyName: 'Texas Instruments Incorporated', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'TRMB', companyName: 'Trimble Inc.', sector: 'Technology', industry: 'Technology Hardware' },
  { ticker: 'TYL', companyName: 'Tyler Technologies Inc.', sector: 'Technology', industry: 'Government Software' },
  
  // Financial Services
  { ticker: 'JPM', companyName: 'JPMorgan Chase & Co.', sector: 'Financial Services', industry: 'Banking' },
  { ticker: 'BAC', companyName: 'Bank of America Corp.', sector: 'Financial Services', industry: 'Banking' },
  { ticker: 'WFC', companyName: 'Wells Fargo & Co.', sector: 'Financial Services', industry: 'Banking' },
  { ticker: 'GS', companyName: 'Goldman Sachs Group Inc.', sector: 'Financial Services', industry: 'Investment Banking' },
  { ticker: 'MS', companyName: 'Morgan Stanley', sector: 'Financial Services', industry: 'Investment Banking' },
  { ticker: 'V', companyName: 'Visa Inc.', sector: 'Financial Services', industry: 'Payment Processing' },
  { ticker: 'MA', companyName: 'Mastercard Inc.', sector: 'Financial Services', industry: 'Payment Processing' },
  { ticker: 'AXP', companyName: 'American Express Co.', sector: 'Financial Services', industry: 'Credit Services' },
  
  // Healthcare
  { ticker: 'JNJ', companyName: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { ticker: 'PFE', companyName: 'Pfizer Inc.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { ticker: 'UNH', companyName: 'UnitedHealth Group Inc.', sector: 'Healthcare', industry: 'Health Insurance' },
  { ticker: 'ABBV', companyName: 'AbbVie Inc.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { ticker: 'TMO', companyName: 'Thermo Fisher Scientific Inc.', sector: 'Healthcare', industry: 'Life Sciences' },
  { ticker: 'ABT', companyName: 'Abbott Laboratories', sector: 'Healthcare', industry: 'Medical Devices' },
  { ticker: 'LLY', companyName: 'Eli Lilly and Co.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  
  // Consumer Discretionary
  { ticker: 'HD', companyName: 'Home Depot Inc.', sector: 'Consumer Discretionary', industry: 'Home Improvement' },
  { ticker: 'MCD', companyName: 'McDonald\'s Corp.', sector: 'Consumer Discretionary', industry: 'Restaurants' },
  { ticker: 'DIS', companyName: 'Walt Disney Co.', sector: 'Consumer Discretionary', industry: 'Entertainment' },
  { ticker: 'NKE', companyName: 'Nike Inc.', sector: 'Consumer Discretionary', industry: 'Footwear & Apparel' },
  { ticker: 'SBUX', companyName: 'Starbucks Corp.', sector: 'Consumer Discretionary', industry: 'Restaurants' },
  { ticker: 'LOW', companyName: 'Lowe\'s Companies Inc.', sector: 'Consumer Discretionary', industry: 'Home Improvement' },
  
  // Consumer Staples
  { ticker: 'PG', companyName: 'Procter & Gamble Co.', sector: 'Consumer Staples', industry: 'Household Products' },
  { ticker: 'KO', companyName: 'Coca-Cola Co.', sector: 'Consumer Staples', industry: 'Beverages' },
  { ticker: 'WMT', companyName: 'Walmart Inc.', sector: 'Consumer Staples', industry: 'Retail' },
  { ticker: 'PEP', companyName: 'PepsiCo Inc.', sector: 'Consumer Staples', industry: 'Beverages' },
  
  // Energy
  { ticker: 'XOM', companyName: 'Exxon Mobil Corp.', sector: 'Energy', industry: 'Oil & Gas' },
  { ticker: 'CVX', companyName: 'Chevron Corp.', sector: 'Energy', industry: 'Oil & Gas' },
  
  // Industrials
  { ticker: 'BA', companyName: 'Boeing Co.', sector: 'Industrials', industry: 'Aerospace' },
  { ticker: 'CAT', companyName: 'Caterpillar Inc.', sector: 'Industrials', industry: 'Heavy Machinery' },
  { ticker: 'UPS', companyName: 'United Parcel Service Inc.', sector: 'Industrials', industry: 'Logistics' },
  { ticker: 'GE', companyName: 'General Electric Co.', sector: 'Industrials', industry: 'Conglomerate' },
  
  // Communication Services
  { ticker: 'VZ', companyName: 'Verizon Communications Inc.', sector: 'Communication Services', industry: 'Telecommunications' },
  { ticker: 'T', companyName: 'AT&T Inc.', sector: 'Communication Services', industry: 'Telecommunications' },
  
  // Utilities
  { ticker: 'NEE', companyName: 'NextEra Energy Inc.', sector: 'Utilities', industry: 'Electric Utilities' },
  
  // Materials
  { ticker: 'LIN', companyName: 'Linde plc', sector: 'Materials', industry: 'Industrial Gases' },
  
  // Real Estate
  { ticker: 'AMT', companyName: 'American Tower Corp.', sector: 'Real Estate', industry: 'REITs' }
];

/**
 * Get all S&P 500 companies
 */
export function getSP500Companies(): SP500Company[] {
  return SP500_COMPANIES.map(company => ({
    ticker: company.ticker!,
    companyName: company.companyName!,
    sector: company.sector!,
    industry: company.industry!,
    marketCap: company.marketCap,
    nextEarningsDate: company.nextEarningsDate,
    lastEarningsDate: company.lastEarningsDate,
    quarterlyPattern: company.quarterlyPattern
  }));
}

/**
 * Get S&P 500 companies by sector
 */
export function getSP500CompaniesBySector(sector: string): SP500Company[] {
  return getSP500Companies().filter(company => company.sector === sector);
}

/**
 * Get top S&P 500 companies (by typical market cap ranking)
 */
export function getTopSP500Companies(limit: number = 20): SP500Company[] {
  return getSP500Companies().slice(0, limit);
}

/**
 * Get S&P 500 tickers only
 */
export function getSP500Tickers(): string[] {
  return getSP500Companies().map(company => company.ticker);
}

/**
 * Get random sample of S&P 500 companies
 */
export function getRandomSP500Companies(count: number = 10): SP500Company[] {
  const companies = getSP500Companies();
  const shuffled = [...companies].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Enhanced S&P 500 fetcher with earnings dates
 */
export class SP500EarningsManager {
  private serperTool: any;
  private openaiModel: string;
  
  constructor() {
    this.serperTool = createSerperTool();
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  /**
   * Enhanced fetch for S&P 500 tech sector companies with intelligent filtering
   * Returns all tech companies but marks which ones need full analysis based on upcoming earnings
   */
  async fetchTechSectorEarningsCalendar(): Promise<{
    allTechCompanies: Array<{
      ticker: string;
      companyName: string;
      sector: string;
      industry: string;
      nextEarningsDate: Date | null;
      quarterlyPattern: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;
      confidence: number;
      needsAnalysis: boolean;
      daysUntilEarnings: number | null;
    }>;
    companiesForAnalysis: string[];
    summary: {
      totalTechCompanies: number;
      companiesWithUpcomingEarnings: number;
      companiesNeedingAnalysis: number;
    };
  }> {
    try {
      console.log('Fetching S&P 500 technology sector earnings calendar...');
      
      // Get all S&P 500 companies filtered by technology sector
      const allCompanies = getSP500Companies();
      const techCompanies = allCompanies.filter(company => 
        company.sector === 'Information Technology' || 
        company.sector === 'Technology' ||
        company.sector === 'Communication Services' // Sometimes includes tech companies
      );

      console.log(`Found ${techCompanies.length} technology companies in S&P 500`);

      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      const processedCompanies = [];
      const companiesForAnalysis = [];

      // Process each tech company to determine earnings dates and analysis needs
      for (const company of techCompanies) {
        try {
          console.log(`Processing ${company.ticker} (${company.companyName})...`);
          
          // Fetch earnings date using existing logic
          const earningsInfo = await this.fetchEarningsDateForCompany(company);
          
          let needsAnalysis = false;
          let daysUntilEarnings = null;

          if (earningsInfo.nextEarningsDate) {
            const earningsDate = new Date(earningsInfo.nextEarningsDate);
            daysUntilEarnings = Math.floor((earningsDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
            
            // Company needs analysis if earnings are within next 30 days
            if (earningsDate >= today && earningsDate <= thirtyDaysFromNow) {
              needsAnalysis = true;
              companiesForAnalysis.push(company.ticker);
            }
          }

          processedCompanies.push({
            ticker: company.ticker,
            companyName: company.companyName,
            sector: company.sector,
            industry: company.industry,
            nextEarningsDate: earningsInfo.nextEarningsDate,
            quarterlyPattern: earningsInfo.quarterlyPattern,
            confidence: earningsInfo.confidence,
            needsAnalysis,
            daysUntilEarnings
          });

          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error processing ${company.ticker}:`, error);
          
          // Add company without earnings data but don't mark for analysis
          processedCompanies.push({
            ticker: company.ticker,
            companyName: company.companyName,
            sector: company.sector,
            industry: company.industry,
            nextEarningsDate: null,
            quarterlyPattern: null,
            confidence: 0,
            needsAnalysis: false,
            daysUntilEarnings: null
          });
        }
      }

      // Sort by: companies needing analysis first, then by days until earnings
      processedCompanies.sort((a, b) => {
        if (a.needsAnalysis && !b.needsAnalysis) return -1;
        if (!a.needsAnalysis && b.needsAnalysis) return 1;
        
        if (a.daysUntilEarnings !== null && b.daysUntilEarnings !== null) {
          return a.daysUntilEarnings - b.daysUntilEarnings;
        }
        
        if (a.daysUntilEarnings !== null) return -1;
        if (b.daysUntilEarnings !== null) return 1;
        
        return a.ticker.localeCompare(b.ticker);
      });

      const summary = {
        totalTechCompanies: processedCompanies.length,
        companiesWithUpcomingEarnings: processedCompanies.filter(c => c.daysUntilEarnings !== null && c.daysUntilEarnings >= 0 && c.daysUntilEarnings <= 30).length,
        companiesNeedingAnalysis: companiesForAnalysis.length
      };

      console.log(`Tech sector summary: ${summary.totalTechCompanies} total, ${summary.companiesWithUpcomingEarnings} with upcoming earnings, ${summary.companiesNeedingAnalysis} need analysis`);

      return {
        allTechCompanies: processedCompanies,
        companiesForAnalysis,
        summary
      };

    } catch (error) {
      console.error('Error in fetchTechSectorEarningsCalendar:', error);
      throw error;
    }
  }

  /**
   * Fetch real earnings dates for S&P 500 companies
   */
  async fetchEarningsCalendarForSP500(
    limit: number = 3,
    sector?: string
  ): Promise<Array<{
    ticker: string;
    companyName: string;
    sector: string;
    industry: string;
    nextEarningsDate: Date | null;
    quarterlyPattern: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;
    confidence: number;
  }>> {
    try {
      console.log(`Fetching earnings calendar for S&P 500 companies (limit: ${limit})...`);
      
      let companies = getSP500Companies();
      
      // Filter by sector if specified
      if (sector) {
        companies = companies.filter(company => company.sector === sector);
      }
      
      // Limit the companies to process
      companies = companies.slice(0, limit);
      
      const results: Array<{
        ticker: string;
        companyName: string;
        sector: string;
        industry: string;
        nextEarningsDate: Date | null;
        quarterlyPattern: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;
        confidence: number;
      }> = [];
      
      // Process companies in small batches to respect rate limits
      const batchSize = 5;
      for (let i = 0; i < companies.length; i += batchSize) {
        const batch = companies.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(companies.length / batchSize)}: ${batch.map(c => c.ticker).join(', ')}`);
        
        const batchPromises = batch.map(company => this.fetchEarningsDateForCompany(company));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error(`Error processing ${batch[index].ticker}:`, result.reason);
            // Add company with null earnings date on error
            results.push({
              ...batch[index],
              nextEarningsDate: null,
              quarterlyPattern: null,
              confidence: 0.1
            });
          }
        });
        
        // Rate limiting between batches
        if (i + batchSize < companies.length) {
          console.log('Waiting between batches...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      console.log(`Completed earnings calendar fetch: ${results.length} companies processed`);
      return results;
    } catch (error) {
      console.error('Error fetching S&P 500 earnings calendar:', error);
      throw error;
    }
  }

  /**
   * Fetch earnings date for individual company
   */
  private async fetchEarningsDateForCompany(company: SP500Company): Promise<{
    ticker: string;
    companyName: string;
    sector: string;
    industry: string;
    nextEarningsDate: Date | null;
    quarterlyPattern: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;
    confidence: number;
  }> {
    try {
      console.log(`Fetching earnings date for ${company.ticker} (${company.companyName})...`);
      
      // Search for earnings date - dynamic based on current date
      const query = DateQuarterUtils.buildDynamicEarningsQuery(company.ticker, company.companyName);
      const searchResults = await this.serperTool.search(query);
      
      // Parse earnings date using LLM
      const earningsInfo = await this.parseEarningsDate(company.ticker, searchResults);
      
      return {
        ticker: company.ticker,
        companyName: company.companyName,
        sector: company.sector,
        industry: company.industry,
        nextEarningsDate: earningsInfo.date,
        quarterlyPattern: earningsInfo.quarter,
        confidence: earningsInfo.confidence
      };
    } catch (error) {
      console.error(`Error fetching earnings for ${company.ticker}:`, error);
      return {
        ...company,
        nextEarningsDate: null,
        quarterlyPattern: null,
        confidence: 0.1
      };
    }
  }

  /**
   * Parse earnings date from search results using LLM
   */
  private async parseEarningsDate(ticker: string, searchResults: string): Promise<{
    date: Date | null;
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;
    confidence: number;
  }> {
    try {
      const prompt = DateQuarterUtils.buildDynamicLLMPrompt(ticker, searchResults);

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
              content: 'You are a financial data extraction expert. Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        return { date: null, quarter: null, confidence: 0.1 };
      }

      // Clean the content to extract JSON from markdown blocks
      const cleanedContent = this.extractJSONFromResponse(content);
      const parsed = JSON.parse(cleanedContent);
      
      return {
        date: parsed.date ? new Date(parsed.date) : null,
        quarter: parsed.quarter || null,
        confidence: Math.max(0.1, Math.min(1.0, parsed.confidence || 0.5))
      };
    } catch (error) {
      console.error(`Error parsing earnings date for ${ticker}:`, error);
      return { date: null, quarter: null, confidence: 0.1 };
    }
  }

  /**
   * Extract JSON from LLM response that might be wrapped in markdown code blocks
   */
  private extractJSONFromResponse(content: string): string {
    // Remove markdown code blocks if present
    let cleaned = content.trim();
    
    // Check for ```json code blocks
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '');
    }
    
    // Find the first { and last } to extract JSON
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    
    return cleaned.trim();
  }

  /**
   * Generate realistic earnings dates for companies without real data (dynamic)
   */
  generateRealisticEarningsDate(company: SP500Company): {
    date: Date;
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  } {
    const context = DateQuarterUtils.getReportingContext();
    const now = new Date();
    
    // 60% chance for current reporting season, 40% for next season
    const isCurrentReportingSeason = Math.random() < 0.6;
    
    if (isCurrentReportingSeason) {
      // Generate date in current reporting season
      const reportingMonths = context.reportingMonths;
      const monthName = reportingMonths[Math.floor(Math.random() * reportingMonths.length)];
      const monthNumber = new Date(Date.parse(monthName + " 1, " + context.year)).getMonth();
      
      // Ensure the date is after today
      let day = Math.floor(Math.random() * 25) + 1;
      let targetDate = new Date(context.year, monthNumber, day);
      
      // If the generated date is in the past, move it forward
      if (targetDate <= now) {
        const daysToAdd = Math.floor(Math.random() * 30) + 1;
        targetDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      }
      
      return {
        date: targetDate,
        quarter: context.reportingQuarter
      };
    } else {
      // Generate date in next reporting season
      const nextReportingMonths = context.nextReportingMonths;
      const monthName = nextReportingMonths[Math.floor(Math.random() * nextReportingMonths.length)];
      
      // Handle year rollover for Q4->Q1 transition
      const year = context.nextQuarter === 'Q1' && context.currentQuarter === 'Q4' 
        ? context.year + 1 
        : context.year;
        
      const monthNumber = new Date(Date.parse(monthName + " 1, " + year)).getMonth();
      const day = Math.floor(Math.random() * 25) + 5;
      
      return {
        date: new Date(year, monthNumber, day),
        quarter: context.nextQuarter
      };
    }
  }
}

/**
 * Create SP500EarningsManager instance
 */
export function createSP500EarningsManager(): SP500EarningsManager {
  return new SP500EarningsManager();
}