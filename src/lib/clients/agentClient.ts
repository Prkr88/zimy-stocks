/**
 * Client utilities for interacting with the agent system
 */

export interface AgentUpdateOptions {
  type?: 'full' | 'smart' | 'ticker';
  maxTickers?: number;
  maxAgeHours?: number;
  ticker?: string;
  tickers?: string[];
}

export interface AgentUpdateResponse {
  success: boolean;
  type: string;
  result: {
    totalProcessed: number;
    successCount: number;
    errorCount: number;
    results: Array<{
      ticker: string;
      success: boolean;
      error?: string;
      newsUpdated?: boolean;
      financialsUpdated?: boolean;
      lastUpdated: Date;
    }>;
    duration: number;
    startTime: Date;
    endTime: Date;
  };
  message: string;
}

export interface AgentStatusResponse {
  success: boolean;
  status: {
    activeTickers: number;
    tickersNeedingUpdate: number;
    recentTickers: string[];
    staleTickersToUpdate: string[];
  };
}

/**
 * Client for agent system operations
 */
export class AgentClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Trigger agent updates
   */
  async triggerUpdate(options: AgentUpdateOptions = {}): Promise<AgentUpdateResponse> {
    const response = await fetch(`${this.baseUrl}/api/agents/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get agent system status
   */
  async getStatus(): Promise<AgentStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/agents/update?action=status`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get list of active tickers
   */
  async getActiveTickers(limit: number = 20): Promise<{ success: boolean; tickers: string[]; count: number }> {
    const response = await fetch(`${this.baseUrl}/api/agents/update?action=tickers&limit=${limit}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Run smart update cycle (recommended for regular use)
   */
  async runSmartUpdate(maxTickers: number = 10, maxAgeHours: number = 4): Promise<AgentUpdateResponse> {
    return this.triggerUpdate({
      type: 'smart',
      maxTickers,
      maxAgeHours
    });
  }

  /**
   * Run full update cycle (use sparingly)
   */
  async runFullUpdate(maxTickers: number = 10): Promise<AgentUpdateResponse> {
    return this.triggerUpdate({
      type: 'full',
      maxTickers
    });
  }

  /**
   * Update specific ticker
   */
  async updateTicker(ticker: string): Promise<AgentUpdateResponse> {
    return this.triggerUpdate({
      type: 'ticker',
      ticker
    });
  }

  /**
   * Update specific tickers
   */
  async updateTickers(tickers: string[]): Promise<AgentUpdateResponse> {
    return this.triggerUpdate({
      type: 'ticker',
      tickers
    });
  }
}

/**
 * Create a new AgentClient instance
 */
export function createAgentClient(baseUrl?: string): AgentClient {
  return new AgentClient(baseUrl);
}

// Example usage functions

/**
 * Example: Run daily smart update
 */
export async function runDailyUpdate(): Promise<void> {
  const client = createAgentClient();
  
  try {
    console.log('Starting daily smart update...');
    const result = await client.runSmartUpdate(15, 6); // Update up to 15 tickers older than 6 hours
    
    console.log(`Update completed: ${result.result.successCount}/${result.result.totalProcessed} successful`);
    console.log(`Duration: ${result.result.duration}ms`);
    
    // Log any errors
    const errors = result.result.results.filter(r => !r.success);
    if (errors.length > 0) {
      console.log('Errors occurred for:', errors.map(e => e.ticker).join(', '));
    }
  } catch (error) {
    console.error('Daily update failed:', error);
  }
}

/**
 * Example: Update specific watchlist tickers
 */
export async function updateWatchlistTickers(watchlistTickers: string[]): Promise<void> {
  const client = createAgentClient();
  
  try {
    console.log(`Updating watchlist tickers: ${watchlistTickers.join(', ')}`);
    const result = await client.updateTickers(watchlistTickers);
    
    console.log(`Watchlist update completed: ${result.result.successCount}/${result.result.totalProcessed} successful`);
    
    // Report per-ticker results
    result.result.results.forEach(r => {
      const status = r.success ? '✓' : '✗';
      const updates = [];
      if (r.newsUpdated) updates.push('news');
      if (r.financialsUpdated) updates.push('financials');
      
      console.log(`${status} ${r.ticker}: ${updates.join(', ') || 'no updates'}`);
      if (r.error) console.log(`  Error: ${r.error}`);
    });
  } catch (error) {
    console.error('Watchlist update failed:', error);
  }
}

/**
 * Example: Monitor system status
 */
export async function monitorSystemStatus(): Promise<void> {
  const client = createAgentClient();
  
  try {
    const status = await client.getStatus();
    
    console.log('Agent System Status:');
    console.log(`- Active tickers: ${status.status.activeTickers}`);
    console.log(`- Needing update: ${status.status.tickersNeedingUpdate}`);
    console.log(`- Recent tickers: ${status.status.recentTickers.join(', ')}`);
    console.log(`- Stale tickers: ${status.status.staleTickersToUpdate.join(', ')}`);
    
    if (status.status.tickersNeedingUpdate > 0) {
      console.log('\n📊 Recommendation: Run smart update to refresh stale data');
    } else {
      console.log('\n✅ All data is up to date');
    }
  } catch (error) {
    console.error('Status check failed:', error);
  }
}