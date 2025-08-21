import { createPolygonTool } from '@/lib/tools/polygonTool';

// Mock fetch for testing
global.fetch = jest.fn();

describe('PolygonTool', () => {
  let polygonTool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset process.env for each test
    process.env.POLYGON_API_KEY = 'test-polygon-key';
    polygonTool = createPolygonTool();
  });

  describe('constructor', () => {
    it('should throw error if POLYGON_API_KEY is missing', () => {
      delete process.env.POLYGON_API_KEY;
      expect(() => createPolygonTool()).toThrow('POLYGON_API_KEY environment variable is required');
    });

    it('should create instance with valid API key', () => {
      expect(polygonTool).toBeDefined();
    });
  });

  describe('getSnapshotTicker', () => {
    it('should fetch and parse snapshot data correctly', async () => {
      const mockResponse = {
        results: [{
          ticker: 'AAPL',
          value: 150.00,
          day: {
            c: 150.00,
            o: 148.00,
            h: 152.00,
            l: 147.00,
            v: 50000000
          },
          prevDay: {
            c: 149.00
          },
          market_cap: 2500000000000
        }]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await polygonTool.getSnapshotTicker('AAPL');

      expect(result.ticker).toBe('AAPL');
      expect(result.price).toBe(150.00);
      expect(result.change).toBe(1.00); // 150 - 149
      expect(result.changePercent).toBeCloseTo(0.67, 2); // (150-149)/149 * 100
      expect(result.volume).toBe(50000000);
      expect(result.marketCap).toBe(2500000000000);
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(polygonTool.getSnapshotTicker('INVALID')).rejects.toThrow();
    });

    it('should handle empty results', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      });

      await expect(polygonTool.getSnapshotTicker('INVALID')).rejects.toThrow('No data found for ticker INVALID');
    });
  });

  describe('getTickerDetails', () => {
    it('should fetch and parse ticker details correctly', async () => {
      const mockResponse = {
        results: {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          description: 'Technology company',
          sic_description: 'Technology',
          market_cap: 2500000000000,
          total_employees: 150000,
          homepage_url: 'https://apple.com'
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await polygonTool.getTickerDetails('AAPL');

      expect(result.ticker).toBe('AAPL');
      expect(result.name).toBe('Apple Inc.');
      expect(result.description).toBe('Technology company');
      expect(result.sector).toBe('Technology');
      expect(result.employees).toBe(150000);
      expect(result.homepage).toBe('https://apple.com');
    });

    it('should handle missing results', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: null })
      });

      await expect(polygonTool.getTickerDetails('INVALID')).rejects.toThrow('No details found for ticker INVALID');
    });
  });

  describe('getStockData', () => {
    it('should combine snapshot and details data', async () => {
      const mockSnapshotResponse = {
        results: [{
          ticker: 'AAPL',
          value: 150.00,
          day: { c: 150.00, o: 148.00, h: 152.00, l: 147.00, v: 50000000 },
          prevDay: { c: 149.00 }
        }]
      };

      const mockDetailsResponse = {
        results: {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          description: 'Technology company',
          sic_description: 'Technology'
        }
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSnapshotResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDetailsResponse
        });

      const result = await polygonTool.getStockData('AAPL');

      expect(result.ticker).toBe('AAPL');
      expect(result.name).toBe('Apple Inc.');
      expect(result.price).toBe(150.00);
      expect(result.details.description).toBe('Technology company');
      expect(result.details.sector).toBe('Technology');
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle details fetch failure gracefully', async () => {
      const mockSnapshotResponse = {
        results: [{
          ticker: 'AAPL',
          value: 150.00,
          day: { c: 150.00, o: 148.00, h: 152.00, l: 147.00, v: 50000000 },
          prevDay: { c: 149.00 }
        }]
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSnapshotResponse
        })
        .mockRejectedValueOnce(new Error('Details fetch failed'));

      const result = await polygonTool.getStockData('AAPL');

      expect(result.ticker).toBe('AAPL');
      expect(result.name).toBe('AAPL'); // Falls back to ticker
      expect(result.price).toBe(150.00);
      expect(result.details.description).toBeUndefined();
    });
  });
});