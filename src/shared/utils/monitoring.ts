import * as Sentry from '@sentry/browser';
import { debug } from './debug';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string;

export function initMonitoring(contextName: string): void {
  if (SENTRY_DSN && !SENTRY_DSN.includes('placeholder')) {
    Sentry.init({
      dsn: SENTRY_DSN,
      initialScope: {
        tags: { context: contextName },
      },
    });
    debug('monitoring', `Sentry initialized for ${contextName}`);
  } else {
    debug('monitoring', `Sentry DSN placeholder or empty — skipping initialization for ${contextName}`);
  }
}

export function reportError(err: Error | unknown, context?: Record<string, unknown>): void {
  debug('monitoring', 'Reporting error:', err, context);
  if (SENTRY_DSN && !SENTRY_DSN.includes('placeholder')) {
    Sentry.captureException(err, { extra: context });
  }
}
