// Client-side sentiment analysis utilities

export interface SentimentAnalysisResult {
  success: boolean;
  message: string;
  results?: Array<{
    ticker: string;
    success: boolean;
    signal?: any;
    error?: string;
  }>;
  totalProcessed?: number;
  successCount?: number;
  errorCount?: number;
}

export async function analyzeSentimentForWatchlist(
  userId: string,
  tickers?: string[],
  forceRefresh: boolean = false
): Promise<SentimentAnalysisResult> {
  try {
    const response = await fetch('/api/sentiment/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        tickers,
        forceRefresh,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to analyze sentiment');
    }

    return data;
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    throw error;
  }
}

export async function analyzeSingleCompany(
  ticker: string,
  companyName: string,
  earningsDate: Date,
  sector?: string,
  market?: string,
  analystEstimate?: number,
  previousEarnings?: number,
  additionalContext?: string
): Promise<any> {
  try {
    const response = await fetch('/api/sentiment/analyze', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticker,
        companyName,
        sector,
        market,
        earningsDate: earningsDate.toISOString(),
        analystEstimate,
        previousEarnings,
        additionalContext,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to analyze sentiment');
    }

    return data.result;
  } catch (error) {
    console.error('Error analyzing single company sentiment:', error);
    throw error;
  }
}

// Utility to check if sentiment analysis is needed for a ticker
export function shouldAnalyzeSentiment(
  ticker: string,
  existingSignals: any[],
  maxAgeHours: number = 24
): boolean {
  const existingSignal = existingSignals.find(signal => signal.ticker === ticker);
  
  if (!existingSignal) {
    return true; // No existing signal
  }

  // Check if signal is too old
  const signalAge = Date.now() - new Date(existingSignal.createdAt).getTime();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  
  return signalAge > maxAgeMs;
}

// Batch sentiment analysis with smart filtering
export async function smartSentimentAnalysis(
  userId: string,
  existingSignals: any[] = [],
  maxAgeHours: number = 24
): Promise<SentimentAnalysisResult> {
  try {
    // This will only analyze companies that need fresh sentiment data
    // The server-side logic already filters to watchlisted companies
    return await analyzeSentimentForWatchlist(userId);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to analyze sentiment',
      results: [],
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
    };
  }
}