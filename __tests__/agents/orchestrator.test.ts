// Mock LangChain dependencies
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({
      content: 'Mock AI analysis response'
    })
  }))
}));

jest.mock('langchain/agents', () => ({
  createOpenAIFunctionsAgent: jest.fn(),
  AgentExecutor: jest.fn()
}));

jest.mock('@langchain/community/utilities', () => ({
  GoogleSerperAPIWrapper: jest.fn().mockImplementation(() => ({
    run: jest.fn().mockResolvedValue('{"organic": [{"title": "Test Title", "snippet": "Test Snippet"}]}')
  }))
}));

jest.mock('@langchain/core/tools', () => ({
  Tool: class MockTool {
    name = 'search';
    description = 'Mock tool';
    async _call(query: string) {
      return `Mock result for: ${query}`;
    }
  }
}));

import { createAgentOrchestrator } from '@/lib/agents/orchestrator';
import { adminDb } from '@/lib/firebase-admin';

// Mock the agents
jest.mock('@/lib/agents/searchAgent', () => ({
  createSearchAgent: () => ({
    searchForTicker: jest.fn(),
    updateTickerNews: jest.fn()
  })
}));

jest.mock('@/lib/agents/polygonAgent', () => ({
  createPolygonAgent: () => ({
    getFinancialData: jest.fn(),
    updateTickerFinancials: jest.fn()
  })
}));

describe('AgentOrchestrator', () => {
  let orchestrator: any;
  let mockSearchAgent: any;
  let mockPolygonAgent: any;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = createAgentOrchestrator();
    mockSearchAgent = orchestrator.searchAgent;
    mockPolygonAgent = orchestrator.polygonAgent;
  });

  describe('getActiveTickers', () => {
    it('should return unique tickers from earnings events', async () => {
      const mockDocs = [
        { data: () => ({ ticker: 'AAPL' }) },
        { data: () => ({ ticker: 'GOOGL' }) },
        { data: () => ({ ticker: 'AAPL' }) }, // Duplicate
        { data: () => ({ ticker: 'MSFT' }) }
      ];

      (adminDb.collection as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: mockDocs })
      });

      const tickers = await orchestrator.getActiveTickers();
      
      expect(tickers).toEqual(['AAPL', 'GOOGL', 'MSFT']);
      expect(tickers).toHaveLength(3); // Duplicates removed
    });

    it('should handle empty results', async () => {
      (adminDb.collection as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: [] })
      });

      const tickers = await orchestrator.getActiveTickers();
      expect(tickers).toEqual([]);
    });

    it('should handle database errors', async () => {
      (adminDb.collection as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockRejectedValue(new Error('DB Error'))
      });

      const tickers = await orchestrator.getActiveTickers();
      expect(tickers).toEqual([]);
    });
  });

  describe('updateTicker', () => {
    beforeEach(() => {
      mockSearchAgent.searchForTicker = jest.fn().mockResolvedValue({
        ticker: 'AAPL',
        news: ['News 1', 'News 2'],
        summary: 'Good news for AAPL',
        lastUpdated: new Date()
      });

      mockSearchAgent.updateTickerNews = jest.fn().mockResolvedValue(undefined);

      mockPolygonAgent.getFinancialData = jest.fn().mockResolvedValue({
        ticker: 'AAPL',
        name: 'Apple Inc.',
        price: 150,
        change: 2.5,
        changePercent: 1.69,
        volume: 50000000,
        metrics: {},
        details: {},
        analysis: 'Positive momentum',
        lastUpdated: new Date(),
        success: true
      });

      mockPolygonAgent.updateTickerFinancials = jest.fn().mockResolvedValue(undefined);
    });

    it('should successfully update both news and financials', async () => {
      const result = await orchestrator.updateTicker('AAPL');

      expect(result.ticker).toBe('AAPL');
      expect(result.success).toBe(true);
      expect(result.newsUpdated).toBe(true);
      expect(result.financialsUpdated).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockSearchAgent.searchForTicker).toHaveBeenCalledWith('AAPL');
      expect(mockPolygonAgent.getFinancialData).toHaveBeenCalledWith('AAPL');
    });

    it('should handle news update failure gracefully', async () => {
      mockSearchAgent.searchForTicker.mockRejectedValue(new Error('News fetch failed'));

      const result = await orchestrator.updateTicker('AAPL');

      expect(result.ticker).toBe('AAPL');
      expect(result.success).toBe(true); // Still successful because financials worked
      expect(result.newsUpdated).toBe(false);
      expect(result.financialsUpdated).toBe(true);
      expect(result.error).toContain('News: News fetch failed');
    });

    it('should handle financial data failure gracefully', async () => {
      mockPolygonAgent.getFinancialData.mockResolvedValue({
        success: false,
        error: 'API limit exceeded'
      });

      const result = await orchestrator.updateTicker('AAPL');

      expect(result.ticker).toBe('AAPL');
      expect(result.success).toBe(true); // Still successful because news worked
      expect(result.newsUpdated).toBe(true);
      expect(result.financialsUpdated).toBe(false);
      expect(result.error).toContain('Financials: API limit exceeded');
    });

    it('should handle complete failure', async () => {
      mockSearchAgent.searchForTicker.mockRejectedValue(new Error('News failed'));
      mockPolygonAgent.getFinancialData.mockResolvedValue({
        success: false,
        error: 'Financials failed'
      });

      const result = await orchestrator.updateTicker('AAPL');

      expect(result.success).toBe(false);
      expect(result.newsUpdated).toBe(false);
      expect(result.financialsUpdated).toBe(false);
      expect(result.error).toContain('News: News failed');
      expect(result.error).toContain('Financials: Financials failed');
    });
  });

  describe('updateTickersBatch', () => {
    beforeEach(() => {
      // Mock successful single ticker update
      jest.spyOn(orchestrator, 'updateTicker').mockImplementation((ticker: string) => 
        Promise.resolve({
          ticker,
          success: true,
          newsUpdated: true,
          financialsUpdated: true,
          lastUpdated: new Date()
        })
      );
    });

    it('should process multiple tickers successfully', async () => {
      // Mock the delay function to speed up tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') callback();
        return {} as any;
      });

      const tickers = ['AAPL', 'GOOGL', 'MSFT'];
      const result = await orchestrator.updateTickersBatch(tickers);

      expect(result.totalProcessed).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.errorCount).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.duration).toBeGreaterThan(0);

      // Restore setTimeout
      jest.restoreAllMocks();
    }, 10000);

    it('should handle mixed success and failure', async () => {
      jest.spyOn(orchestrator, 'updateTicker')
        .mockResolvedValueOnce({ ticker: 'AAPL', success: true, newsUpdated: true, financialsUpdated: true, lastUpdated: new Date() })
        .mockRejectedValueOnce(new Error('Failed for GOOGL'))
        .mockResolvedValueOnce({ ticker: 'MSFT', success: true, newsUpdated: true, financialsUpdated: true, lastUpdated: new Date() });

      const tickers = ['AAPL', 'GOOGL', 'MSFT'];
      const result = await orchestrator.updateTickersBatch(tickers);

      expect(result.totalProcessed).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(1);
      
      const failedResult = result.results.find(r => r.ticker === 'GOOGL');
      expect(failedResult?.success).toBe(false);
      expect(failedResult?.error).toContain('Failed for GOOGL');
    });

    it('should handle empty ticker list', async () => {
      const result = await orchestrator.updateTickersBatch([]);
      
      expect(result.totalProcessed).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('shouldUpdateTicker', () => {
    it('should return true for non-existent ticker', async () => {
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false })
        })
      });

      const shouldUpdate = await orchestrator.shouldUpdateTicker('AAPL');
      expect(shouldUpdate).toBe(true);
    });

    it('should return true for stale data', async () => {
      const oldDate = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago
      
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              lastUpdated: { toDate: () => oldDate }
            })
          })
        })
      });

      const shouldUpdate = await orchestrator.shouldUpdateTicker('AAPL', 4); // 4 hours threshold
      expect(shouldUpdate).toBe(true);
    });

    it('should return false for fresh data', async () => {
      const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              lastUpdated: { toDate: () => recentDate }
            })
          })
        })
      });

      const shouldUpdate = await orchestrator.shouldUpdateTicker('AAPL', 4); // 4 hours threshold
      expect(shouldUpdate).toBe(false);
    });

    it('should return true on database error', async () => {
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockRejectedValue(new Error('DB Error'))
        })
      });

      const shouldUpdate = await orchestrator.shouldUpdateTicker('AAPL');
      expect(shouldUpdate).toBe(true); // Default to update on error
    });
  });
});