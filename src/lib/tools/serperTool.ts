/**
 * Serper Web Search Tool
 * Fetches fresh web data for stocks and finance news using direct API calls
 */
export class SerperTool {
  private apiKey: string;
  
  constructor() {
    if (!process.env.SERPER_API_KEY) {
      throw new Error("SERPER_API_KEY environment variable is required");
    }
    
    this.apiKey = process.env.SERPER_API_KEY;
  }

  async search(query: string): Promise<string> {
    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return JSON.stringify(data);
    } catch (error) {
      console.error('Serper search error:', error);
      throw new Error(`Failed to search for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Create a new instance of the Serper search tool
 */
export function createSerperTool(): SerperTool {
  return new SerperTool();
}

/**
 * Format a search query for stock news
 */
export function formatStockNewsQuery(ticker: string): string {
  return `${ticker} latest news earnings market updates 2025`;
}

/**
 * Format a search query for earnings calendar
 */
export function formatEarningsCalendarQuery(dateRange?: string): string {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });
  
  if (dateRange) {
    return `earnings calendar ${dateRange} ${currentYear} upcoming earnings dates schedule`;
  }
  
  return `earnings calendar ${currentMonth} ${currentYear} upcoming earnings dates this week next week`;
}

/**
 * Parse Serper search results to extract relevant news items
 */
export function parseSerperResults(searchResults: string): string[] {
  try {
    const parsed = JSON.parse(searchResults);
    const news: string[] = [];
    
    // Extract organic search results
    if (parsed.organic) {
      parsed.organic.forEach((result: any) => {
        if (result.title && result.snippet) {
          news.push(`${result.title}: ${result.snippet}`);
        }
      });
    }
    
    // Extract news results
    if (parsed.news) {
      parsed.news.forEach((result: any) => {
        if (result.title && result.snippet) {
          news.push(`${result.title}: ${result.snippet}`);
        }
      });
    }
    
    return news.slice(0, 5); // Limit to top 5 results
  } catch (error) {
    console.error('Error parsing Serper results:', error);
    return [];
  }
}

/**
 * Parse earnings calendar information from search results
 */
export function parseEarningsCalendarResults(searchResults: string): Array<{
  ticker?: string;
  companyName?: string;
  date?: string;
  source: string;
}> {
  try {
    const parsed = JSON.parse(searchResults);
    const earningsInfo: Array<{
      ticker?: string;
      companyName?: string;
      date?: string;
      source: string;
    }> = [];
    
    // Extract from organic search results
    if (parsed.organic) {
      parsed.organic.forEach((result: any) => {
        if (result.title && result.snippet) {
          const text = `${result.title} ${result.snippet}`;
          
          // Look for ticker symbols (uppercase letters, 1-5 chars)
          const tickerMatches = text.match(/\b[A-Z]{1,5}\b/g);
          
          // Look for dates (various formats)
          const dateMatches = text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:,? \d{4})?|\b\d{1,2}\/\d{1,2}\/\d{2,4}|\b\d{4}-\d{2}-\d{2}\b/gi);
          
          if (tickerMatches || dateMatches) {
            earningsInfo.push({
              ticker: tickerMatches ? tickerMatches[0] : undefined,
              companyName: result.title,
              date: dateMatches ? dateMatches[0] : undefined,
              source: result.link || 'web search'
            });
          }
        }
      });
    }
    
    // Extract from news results
    if (parsed.news) {
      parsed.news.forEach((result: any) => {
        if (result.title && result.snippet) {
          const text = `${result.title} ${result.snippet}`;
          
          const tickerMatches = text.match(/\b[A-Z]{1,5}\b/g);
          const dateMatches = text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:,? \d{4})?|\b\d{1,2}\/\d{1,2}\/\d{2,4}|\b\d{4}-\d{2}-\d{2}\b/gi);
          
          if (tickerMatches || dateMatches) {
            earningsInfo.push({
              ticker: tickerMatches ? tickerMatches[0] : undefined,
              companyName: result.title,
              date: dateMatches ? dateMatches[0] : undefined,
              source: result.source || 'news'
            });
          }
        }
      });
    }
    
    return earningsInfo.slice(0, 10); // Limit to top 10 results
  } catch (error) {
    console.error('Error parsing earnings calendar results:', error);
    return [];
  }
}