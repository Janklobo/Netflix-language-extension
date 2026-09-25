import type { ExtensionMessage, ExtensionResponse } from '@/shared/types/extension.types';
import { signIn, signInWithGoogle, signOut, refreshSession } from './auth-manager';
import { translate, prefetch } from './translator';
import { getSession, getSettings, setSettings, getSavedWords, saveWord, deleteSavedWord, exportAnkiTsv } from '@/shared/utils/storage';
import { TOKEN_REFRESH_ALARM } from '@/shared/constants/cache';
import { debug } from '@/shared/utils/debug';
import { initMonitoring, reportError } from '@/shared/utils/monitoring';
import { trackEventDirect } from './analytics';

// Initialize Sentry error monitoring
initMonitoring('background-service-worker');

// ── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', () => {
  debug('sw', 'installed');
  void (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

self.addEventListener('activate', (event) => {
  debug('sw', 'activated');
  (event as ExtendableEvent).waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).clients.claim(),
  );
});

// ── Message router ───────────────────────────────────────────────────────────
// Registered synchronously at module load so Chrome can route messages after SW restart.

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void,
  ) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((err: unknown) => {
        debug('sw', 'Message handler error:', err);
        reportError(err, { messageType: message.type });
        sendResponse({ type: 'ERROR', payload: 'Internal error' });
      });
    return true; // async response
  },
);

async function handleMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  debug('sw', 'Received:', message.type);

  switch (message.type) {
    case 'GET_USER_SESSION': {
      const session = await getSession();
      return { type: 'USER_SESSION', payload: session };
    }

    case 'SIGN_IN': {
      const session = await signIn(message.payload.email, message.payload.password);
      if (session) {
        await trackEventDirect('sign_in_success', session.userId, { email: session.email });
      }
      return { type: 'USER_SESSION', payload: session };
    }

    case 'SIGN_IN_GOOGLE': {
      const session = await signInWithGoogle();
      if (session) {
        await trackEventDirect('sign_in_google_success', session.userId, { email: session.email });
      }
      return { type: 'USER_SESSION', payload: session };
    }

    case 'SIGN_OUT': {
      const session = await getSession();
      const distinctId = session ? session.userId : 'anonymous';
      await trackEventDirect('sign_out', distinctId);
      await signOut();
      return { type: 'OK' };
    }

    case 'GET_SETTINGS': {
      const settings = await getSettings();
      return { type: 'SETTINGS', payload: settings };
    }

    case 'UPDATE_SETTINGS': {
      await setSettings(message.payload);
      try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (tab.id && tab.url && tab.url.includes('netflix.com')) {
            chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' }).catch(() => {
              // Ignore error if content script is not injected in this tab yet
            });
          }
        }
      } catch (err) {
        debug('sw', 'Failed to broadcast settings update:', err);
      }
      return { type: 'OK' };
    }

    case 'TRANSLATE': {
      const result = await translate(message.payload);
      if (!result) return { type: 'ERROR', payload: 'Translation failed' };
      return { type: 'TRANSLATION', payload: result };
    }

    case 'PREFETCH_TRANSLATIONS': {
      await prefetch(message.payload);
      return { type: 'OK' };
    }

    case 'SAVE_WORD': {
      await saveWord(message.payload);
      const allWords = await getSavedWords();
      return { type: 'SAVED_WORDS', payload: allWords };
    }

    case 'GET_SAVED_WORDS': {
      const words = await getSavedWords();
      return { type: 'SAVED_WORDS', payload: words };
    }

    case 'DELETE_SAVED_WORD': {
      await deleteSavedWord(message.payload.id);
      const remaining = await getSavedWords();
      return { type: 'SAVED_WORDS', payload: remaining };
    }

    case 'EXPORT_ANKI': {
      const tsv = await exportAnkiTsv();
      return { type: 'ANKI_EXPORT', payload: tsv };
    }

    case 'TRACK_EVENT': {
      const session = await getSession();
      const distinctId = session ? session.userId : 'anonymous';
      await trackEventDirect(message.payload.eventName, distinctId, message.payload.properties);
      return { type: 'OK' };
    }
  }
}

// ── Token refresh alarm ──────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TOKEN_REFRESH_ALARM) {
    refreshSession().catch((err: unknown) => {
      debug('sw', 'Token refresh alarm failed:', err);
      reportError(err, { alarm: alarm.name });
    });
  }
});

// Global error handler for synchronous errors in service worker
self.addEventListener('error', (event) => {
  debug('sw', 'Uncaught error:', event.error || event.message);
  reportError(event.error || new Error(event.message), { context: 'uncaughtError' });
});

// Global unhandled rejection handler for service worker
self.addEventListener('unhandledrejection', (event) => {
  debug('sw', 'Unhandled promise rejection:', event.reason);
  reportError(event.reason, { context: 'unhandledRejection' });
});

// Reschedule token refresh alarm on SW start/restart if session is active
getSession()
  .then((session) => {
    if (session) {
      const msUntilRefresh = session.expiresAt - Date.now() - 5 * 60 * 1000;
      const delayInMinutes = Math.max(1, msUntilRefresh / 60000);
      chrome.alarms.create(TOKEN_REFRESH_ALARM, { delayInMinutes });
      debug('sw', `Rescheduled token refresh in ${delayInMinutes.toFixed(1)}m for ${session.email}`);
    }
  })
  .catch((err) => {
    debug('sw', 'Failed to reschedule token refresh on startup:', err);
  });
