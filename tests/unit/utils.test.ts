import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock chrome global
const chromeMock = {
  runtime: {
    sendMessage: vi.fn(),
    lastError: null as any,
  },
};
vi.stubGlobal('chrome', chromeMock);

// 2. Mock console.log
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

// 3. Mock Sentry
vi.mock('@sentry/browser', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

// Stub env
vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-sentry-dsn@sentry.io/123');

// Dynamic imports to ensure stubs are active
const { sendToBackground } = await import('@/shared/utils/message');
const { debug } = await import('@/shared/utils/debug');
const { initMonitoring, reportError } = await import('@/shared/utils/monitoring');
const { trackEvent } = await import('@/shared/utils/analytics');
const Sentry = await import('@sentry/browser');

describe('utility services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chromeMock.runtime.lastError = null;
  });

  describe('message utility', () => {
    it('should resolve response when sendMessage succeeds', async () => {
      const mockResponse = { type: 'OK' as const };
      chromeMock.runtime.sendMessage.mockImplementationOnce((_msg: any, callback: any) => {
        callback(mockResponse);
      });

      const response = await sendToBackground({ type: 'GET_SETTINGS' });

      expect(response).toEqual(mockResponse);
      expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
        { type: 'GET_SETTINGS' },
        expect.any(Function)
      );
    });

    it('should reject with lastError message when sendMessage fails', async () => {
      chromeMock.runtime.lastError = { message: 'Extension context invalidated' };
      chromeMock.runtime.sendMessage.mockImplementationOnce((_msg: any, callback: any) => {
        callback(null as any);
      });

      await expect(sendToBackground({ type: 'GET_SETTINGS' })).rejects.toThrow(
        'Extension context invalidated'
      );
    });
  });

  describe('debug utility', () => {
    it('should log messages if DEV mode is enabled', async () => {
      // In tests, import.meta.env.DEV defaults to true/mocked
      debug('test', 'message 1', 123);
      expect(consoleSpy).toHaveBeenCalledWith('[LinguaFlix:test]', 'message 1', 123);
    });
  });

  describe('monitoring utility', () => {
    it('should initialize Sentry with context tag', () => {
      initMonitoring('test-context');
      expect(Sentry.init).toHaveBeenCalledWith({
        dsn: 'https://mock-sentry-dsn@sentry.io/123',
        initialScope: {
          tags: { context: 'test-context' },
        },
      });
    });

    it('should capture exception with context tag', () => {
      const err = new Error('Test Error');
      reportError(err, { extraInfo: '123' });
      expect(Sentry.captureException).toHaveBeenCalledWith(err, {
        extra: { extraInfo: '123' },
      });
    });
  });

  describe('analytics utility', () => {
    it('should send TRACK_EVENT to background', async () => {
      const mockResponse = { type: 'OK' as const };
      chromeMock.runtime.sendMessage.mockImplementationOnce((_msg: any, callback: any) => {
        callback(mockResponse);
      });

      await trackEvent('some_event', { prop: 'val' });

      expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
        {
          type: 'TRACK_EVENT',
          payload: { eventName: 'some_event', properties: { prop: 'val' } },
        },
        expect.any(Function)
      );
    });
  });
});
