// Mock LangChain dependencies at the top level
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

import { formatStockNewsQuery, parseSerperResults } from '@/lib/tools/serperTool';

describe('SerperTool', () => {
  describe('formatStockNewsQuery', () => {
    it('should format query correctly for stock ticker', () => {
      const query = formatStockNewsQuery('AAPL');
      expect(query).toBe('AAPL latest news earnings market updates 2025');
    });

    it('should handle different ticker formats', () => {
      expect(formatStockNewsQuery('GOOGL')).toBe('GOOGL latest news earnings market updates 2025');
      expect(formatStockNewsQuery('TSLA')).toBe('TSLA latest news earnings market updates 2025');
    });
  });

  describe('parseSerperResults', () => {
    it('should parse organic search results', () => {
      const mockResults = JSON.stringify({
        organic: [
          {
            title: 'Apple Reports Strong Q4 Earnings',
            snippet: 'Apple Inc. reported better than expected earnings...'
          },
          {
            title: 'AAPL Stock Analysis',
            snippet: 'Technical analysis shows positive momentum...'
          }
        ]
      });

      const parsed = parseSerperResults(mockResults);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toContain('Apple Reports Strong Q4 Earnings');
      expect(parsed[1]).toContain('AAPL Stock Analysis');
    });

    it('should parse news results', () => {
      const mockResults = JSON.stringify({
        news: [
          {
            title: 'Breaking: Apple Announces New iPhone',
            snippet: 'Apple unveils latest iPhone model with AI features...'
          }
        ]
      });

      const parsed = parseSerperResults(mockResults);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toContain('Breaking: Apple Announces New iPhone');
    });

    it('should handle mixed results and limit to 5', () => {
      const mockResults = JSON.stringify({
        organic: [
          { title: 'Title 1', snippet: 'Snippet 1' },
          { title: 'Title 2', snippet: 'Snippet 2' },
          { title: 'Title 3', snippet: 'Snippet 3' }
        ],
        news: [
          { title: 'News 1', snippet: 'News snippet 1' },
          { title: 'News 2', snippet: 'News snippet 2' },
          { title: 'News 3', snippet: 'News snippet 3' }
        ]
      });

      const parsed = parseSerperResults(mockResults);
      expect(parsed).toHaveLength(5); // Limited to 5 results
    });

    it('should handle invalid JSON gracefully', () => {
      const parsed = parseSerperResults('invalid json');
      expect(parsed).toEqual([]);
    });

    it('should handle missing fields', () => {
      const mockResults = JSON.stringify({
        organic: [
          { title: 'Title without snippet' },
          { snippet: 'Snippet without title' },
          { title: 'Valid title', snippet: 'Valid snippet' }
        ]
      });

      const parsed = parseSerperResults(mockResults);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toContain('Valid title');
    });
  });
});