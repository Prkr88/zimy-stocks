// Mock environment variables for testing
process.env.SERPER_API_KEY = 'test-serper-key';
process.env.POLYGON_API_KEY = 'test-polygon-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.OPENAI_MODEL = 'gpt-4o-mini';

// Mock Firebase Admin
jest.mock('./src/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(),
        update: jest.fn()
      })),
      where: jest.fn(() => ({
        get: jest.fn(() => ({
          docs: []
        })),
        limit: jest.fn(() => ({
          get: jest.fn(() => ({
            docs: []
          }))
        })),
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn(() => ({
              docs: []
            }))
          }))
        }))
      })),
      add: jest.fn()
    })),
    FieldValue: {
      increment: jest.fn()
    }
  }
}));