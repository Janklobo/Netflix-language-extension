import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock chrome global before importing the module under test
const mockStorage: Record<string, any> = {};
const chromeMock = {
  storage: {
    local: {
      get: vi.fn((key: string | string[]) => {
        if (typeof key === 'string') {
          return Promise.resolve({ [key]: mockStorage[key] });
        }
        const res: Record<string, any> = {};
        for (const k of key) {
          res[k] = mockStorage[k];
        }
        return Promise.resolve(res);
      }),
      set: vi.fn((obj: Record<string, any>) => {
        Object.assign(mockStorage, obj);
        return Promise.resolve();
      }),
      remove: vi.fn((key: string) => {
        delete mockStorage[key];
        return Promise.resolve();
      }),
    },
  },
};
vi.stubGlobal('chrome', chromeMock);

// 2. Mock global fetch before importing the module under test
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// 3. Stub environment variables before importing the module under test
vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-anon-key');

// 4. Now import the translator service dynamically
const { translate, prefetch } = await import('@/background/translator');

describe('translator service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear mock storage
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
  });

  describe('translate', () => {
    it('should return cached translation on cache hit', async () => {
      // Setup cache
      mockStorage['translation::en-es::Hello'] = 'Hola';

      const result = await translate({
        text: 'Hello',
        sourceLang: 'en',
        targetLang: 'es',
        episodeId: '123',
      });

      expect(result).toEqual({
        originalText: 'Hello',
        translatedText: 'Hola',
        sourceLang: 'en',
        targetLang: 'es',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should call fetch and store in cache on cache miss', async () => {
      // Mock active user session
      mockStorage['user_session'] = {
        accessToken: 'mock-access-token',
        userId: 'user-123',
        email: 'user@example.com',
      };

      // Mock translation API response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translatedText: 'Hola' }),
      });

      const result = await translate({
        text: 'Hello',
        sourceLang: 'en',
        targetLang: 'es',
        episodeId: '123',
      });

      expect(result).toEqual({
        originalText: 'Hello',
        translatedText: 'Hola',
        sourceLang: 'en',
        targetLang: 'es',
      });

      // Verify fetch was called with correct arguments
      expect(fetchMock).toHaveBeenCalledWith('https://mock.supabase.co/functions/v1/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-access-token',
          apikey: 'mock-anon-key',
        },
        body: JSON.stringify({
          text: 'Hello',
          sourceLang: 'en',
          targetLang: 'es',
        }),
      });

      // Verify cached value
      expect(mockStorage['translation::en-es::Hello']).toBe('Hola');
    });

    it('should return null if there is no active session', async () => {
      const result = await translate({
        text: 'Hello',
        sourceLang: 'en',
        targetLang: 'es',
        episodeId: '123',
      });

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('prefetch', () => {
    it('should prefetch translation requests and limit concurrency', async () => {
      // Mock session
      mockStorage['user_session'] = {
        accessToken: 'mock-access-token',
        userId: 'user-123',
        email: 'user@example.com',
      };

      // Let's mock a delay in translation to check concurrency
      let activeRequestsCount = 0;
      let maxActiveRequestsCount = 0;

      fetchMock.mockImplementation(() => {
        activeRequestsCount++;
        maxActiveRequestsCount = Math.max(maxActiveRequestsCount, activeRequestsCount);
        return new Promise((resolve) => {
          setTimeout(() => {
            activeRequestsCount--;
            resolve({
              ok: true,
              json: () => Promise.resolve({ translatedText: 'mocked' }),
            });
          }, 50);
        });
      });

      const requests = [
        { text: '1', sourceLang: 'en', targetLang: 'es', episodeId: '123' },
        { text: '2', sourceLang: 'en', targetLang: 'es', episodeId: '123' },
        { text: '3', sourceLang: 'en', targetLang: 'es', episodeId: '123' },
        { text: '4', sourceLang: 'en', targetLang: 'es', episodeId: '123' },
        { text: '5', sourceLang: 'en', targetLang: 'es', episodeId: '123' },
      ];

      await prefetch(requests);

      // Verify that all requests were fetched
      expect(fetchMock).toHaveBeenCalledTimes(5);
      // Verify concurrency limit (should not exceed 3 concurrent requests at a time)
      expect(maxActiveRequestsCount).toBeLessThanOrEqual(3);
    });
  });
});
