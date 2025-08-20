import { EarningsEvent } from '@/types';

// Mock earnings data for development/testing
// In production, this would connect to real APIs like Alpha Vantage, Yahoo Finance, etc.

const MOCK_EARNINGS_DATA: Omit<EarningsEvent, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    expectedDate: new Date('2025-08-22'),
    expectedTime: 'after_market',
    market: 'SP500',
    sector: 'Technology',
    quarter: 'Q1',
    fiscalYear: 2025,
    analystEstimate: 1.26,
    previousEarnings: 1.20,
  },
  {
    ticker: 'MSFT',
    companyName: 'Microsoft Corporation',
    expectedDate: new Date('2025-08-21'),
    expectedTime: 'after_market',
    market: 'SP500',
    sector: 'Technology',
    quarter: 'Q1',
    fiscalYear: 2025,
    analystEstimate: 2.45,
    previousEarnings: 2.32,
  },
  {
    ticker: 'GOOGL',
    companyName: 'Alphabet Inc.',
    expectedDate: new Date('2025-08-29'),
    expectedTime: 'after_market',
    market: 'SP500',
    sector: 'Communication Services',
    quarter: 'Q3',
    fiscalYear: 2024,
    analystEstimate: 1.85,
    previousEarnings: 1.76,
  },
  {
    ticker: 'AMZN',
    companyName: 'Amazon.com Inc.',
    expectedDate: new Date('2025-08-31'),
    expectedTime: 'after_market',
    market: 'SP500',
    sector: 'Consumer Discretionary',
    quarter: 'Q3',
    fiscalYear: 2024,
    analystEstimate: 0.74,
    previousEarnings: 0.65,
  },
  {
    ticker: 'TSLA',
    companyName: 'Tesla Inc.',
    expectedDate: new Date('2025-08-23'),
    expectedTime: 'after_market',
    market: 'SP500',
    sector: 'Consumer Discretionary',
    quarter: 'Q3',
    fiscalYear: 2024,
    analystEstimate: 0.60,
    previousEarnings: 0.52,
  },
  {
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    expectedDate: new Date('2024-11-20'),
    expectedTime: 'after_market',
    market: 'SP500',
    sector: 'Technology',
    quarter: 'Q3',
    fiscalYear: 2025,
    analystEstimate: 0.70,
    previousEarnings: 0.60,
  },
  {
    ticker: 'META',
    companyName: 'Meta Platforms Inc.',
    expectedDate: new Date('2025-08-30'),
    expectedTime: 'after_market',
    market: 'SP500',
    sector: 'Communication Services',
    quarter: 'Q3',
    fiscalYear: 2024,
    analystEstimate: 5.25,
    previousEarnings: 4.95,
  },
  {
    ticker: 'JPM',
    companyName: 'JPMorgan Chase & Co.',
    expectedDate: new Date('2025-08-15'),
    expectedTime: 'before_market',
    market: 'SP500',
    sector: 'Financial Services',
    quarter: 'Q3',
    fiscalYear: 2024,
    analystEstimate: 4.01,
    previousEarnings: 3.85,
  },
  {
    ticker: 'V',
    companyName: 'Visa Inc.',
    expectedDate: new Date('2025-08-29'),
    expectedTime: 'after_market',
    market: 'SP500',
    sector: 'Financial Services',
    quarter: 'Q4',
    fiscalYear: 2024,
    analystEstimate: 2.42,
    previousEarnings: 2.25,
  },
  {
    ticker: 'JNJ',
    companyName: 'Johnson & Johnson',
    expectedDate: new Date('2025-08-15'),
    expectedTime: 'before_market',
    market: 'SP500',
    sector: 'Healthcare',
    quarter: 'Q3',
    fiscalYear: 2024,
    analystEstimate: 2.42,
    previousEarnings: 2.35,
  },
  // Israeli TA-125 companies
  {
    ticker: 'TEVA',
    companyName: 'Teva Pharmaceutical Industries Ltd.',
    expectedDate: new Date('2024-11-01'),
    expectedTime: 'before_market',
    market: 'TA125',
    sector: 'Healthcare',
    quarter: 'Q3',
    fiscalYear: 2024,
    analystEstimate: 0.58,
    previousEarnings: 0.52,
  },
  {
    ticker: 'CHKP',
    companyName: 'Check Point Software Technologies Ltd.',
    expectedDate: new Date('2025-08-28'),
    expectedTime: 'after_market',
    market: 'TA125',
    sector: 'Technology',
    quarter: 'Q3',
    fiscalYear: 2024,
    analystEstimate: 2.25,
    previousEarnings: 2.15,
  },
  {
    ticker: 'CYBR',
    companyName: 'CyberArk Software Ltd.',
    expectedDate: new Date('2024-11-05'),
    expectedTime: 'after_market',
    market: 'TA125',
    sector: 'Technology',
    quarter: 'Q3',
    fiscalYear: 2024,
    analystEstimate: 0.35,
    previousEarnings: 0.28,
  },
  {
    ticker: 'NICE',
    companyName: 'NICE Ltd.',
    expectedDate: new Date('2024-11-12'),
    expectedTime: 'after_market',
    market: 'TA125',
    sector: 'Technology',
    quarter: 'Q3',
    fiscalYear: 2024,
    analystEstimate: 2.10,
    previousEarnings: 1.95,
  },
  {
    ticker: 'WIX',
    companyName: 'Wix.com Ltd.',
    expectedDate: new Date('2024-11-07'),
    expectedTime: 'after_market',
    market: 'TA125',
    sector: 'Technology',
    quarter: 'Q3',
    fiscalYear: 2024,
    analystEstimate: 1.45,
    previousEarnings: 1.32,
  },
];

export interface EarningsDataProvider {
  fetchUpcomingEarnings(startDate?: Date, endDate?: Date): Promise<Omit<EarningsEvent, 'id' | 'createdAt' | 'updatedAt'>[]>;
}

export class MockEarningsProvider implements EarningsDataProvider {
  async fetchUpcomingEarnings(
    startDate: Date = new Date(),
    endDate: Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  ): Promise<Omit<EarningsEvent, 'id' | 'createdAt' | 'updatedAt'>[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Filter mock data by date range
    return MOCK_EARNINGS_DATA.filter(event => {
      const eventDate = new Date(event.expectedDate);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }
}

// Alpha Vantage API provider (for production use)
export class AlphaVantageEarningsProvider implements EarningsDataProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchUpcomingEarnings(): Promise<Omit<EarningsEvent, 'id' | 'createdAt' | 'updatedAt'>[]> {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=3month&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const csvData = await response.text();
      return this.parseEarningsCSV(csvData);
    } catch (error) {
      console.error('Error fetching from Alpha Vantage:', error);
      throw error;
    }
  }

  private parseEarningsCSV(csvData: string): Omit<EarningsEvent, 'id' | 'createdAt' | 'updatedAt'>[] {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    const events: Omit<EarningsEvent, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < headers.length) continue;

      try {
        const event: Omit<EarningsEvent, 'id' | 'createdAt' | 'updatedAt'> = {
          ticker: values[0]?.trim() || '',
          companyName: values[1]?.trim() || '',
          expectedDate: new Date(values[2]?.trim() || ''),
          expectedTime: this.parseTimeOfDay(values[3]?.trim()),
          market: this.determineMarket(values[0]?.trim() || ''),
          sector: values[4]?.trim() || 'Unknown',
          quarter: this.determineQuarter(new Date(values[2]?.trim() || '')),
          fiscalYear: new Date(values[2]?.trim() || '').getFullYear(),
          analystEstimate: values[5] ? parseFloat(values[5]) : undefined,
          previousEarnings: values[6] ? parseFloat(values[6]) : undefined,
        };

        events.push(event);
      } catch (error) {
        console.warn('Error parsing earnings event:', error, values);
      }
    }

    return events;
  }

  private parseTimeOfDay(timeStr: string): 'before_market' | 'after_market' | 'during_market' {
    const time = timeStr?.toLowerCase() || '';
    if (time.includes('bmo') || time.includes('before')) return 'before_market';
    if (time.includes('amc') || time.includes('after')) return 'after_market';
    return 'during_market';
  }

  private determineMarket(ticker: string): 'SP500' | 'TA125' {
    // This is a simplified determination - in production, you'd have a proper mapping
    const israeliTickers = ['TEVA', 'CHKP', 'CYBR', 'NICE', 'WIX', 'MNDY', 'FVRR'];
    return israeliTickers.includes(ticker) ? 'TA125' : 'SP500';
  }

  private determineQuarter(date: Date): string {
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    if (month <= 3) return 'Q1';
    if (month <= 6) return 'Q2';
    if (month <= 9) return 'Q3';
    return 'Q4';
  }
}

// Factory function to get the appropriate provider
export function createEarningsProvider(): EarningsDataProvider {
  const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (alphaVantageKey && process.env.NODE_ENV === 'production') {
    return new AlphaVantageEarningsProvider(alphaVantageKey);
  }
  
  // Use mock provider for development
  return new MockEarningsProvider();
}

// Normalize and validate earnings data
export function normalizeEarningsEvent(
  rawEvent: any
): Omit<EarningsEvent, 'id' | 'createdAt' | 'updatedAt'> | null {
  try {
    if (!rawEvent.ticker || !rawEvent.companyName || !rawEvent.expectedDate) {
      return null;
    }

    return {
      ticker: String(rawEvent.ticker).toUpperCase().trim(),
      companyName: String(rawEvent.companyName).trim(),
      expectedDate: new Date(rawEvent.expectedDate),
      expectedTime: rawEvent.expectedTime || 'during_market',
      market: rawEvent.market || 'SP500',
      sector: rawEvent.sector || 'Unknown',
      quarter: rawEvent.quarter || 'Q1',
      fiscalYear: rawEvent.fiscalYear || new Date().getFullYear(),
      analystEstimate: rawEvent.analystEstimate ? Number(rawEvent.analystEstimate) : undefined,
      previousEarnings: rawEvent.previousEarnings ? Number(rawEvent.previousEarnings) : undefined,
    };
  } catch (error) {
    console.error('Error normalizing earnings event:', error, rawEvent);
    return null;
  }
}