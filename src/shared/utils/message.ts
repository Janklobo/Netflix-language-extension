import type { ExtensionMessage, ExtensionResponse, UserSession } from '@/shared/types/extension.types';
import { getSession, getSettings, setSession, setSettings, getSavedWords, saveWord, deleteSavedWord, exportAnkiTsv } from '@/shared/utils/storage';

const isChromeRuntimeAvailable = (): boolean => {
  try {
    return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined' && typeof chrome.runtime.sendMessage === 'function';
  } catch {
    return false;
  }
};

async function handleLocalMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  switch (message.type) {
    case 'GET_USER_SESSION': {
      const session = await getSession();
      return { type: 'USER_SESSION', payload: session };
    }
    case 'SIGN_IN': {
      const session: UserSession = {
        userId: 'user-' + Math.random().toString(36).substring(2, 9),
        email: message.payload.email,
        accessToken: 'mock-token-' + Date.now(),
        refreshToken: 'mock-refresh-' + Date.now(),
        expiresAt: Date.now() + 3600 * 1000,
      };
      await setSession(session);
      return { type: 'USER_SESSION', payload: session };
    }
    case 'SIGN_IN_GOOGLE': {
      const session: UserSession = {
        userId: 'google-user-' + Math.random().toString(36).substring(2, 9),
        email: 'learner@linguaflix.com',
        accessToken: 'mock-google-token-' + Date.now(),
        refreshToken: 'mock-google-refresh-' + Date.now(),
        expiresAt: Date.now() + 3600 * 1000,
      };
      await setSession(session);
      return { type: 'USER_SESSION', payload: session };
    }
    case 'SIGN_OUT': {
      await setSession(null);
      return { type: 'OK' };
    }
    case 'GET_SETTINGS': {
      const settings = await getSettings();
      return { type: 'SETTINGS', payload: settings };
    }
    case 'UPDATE_SETTINGS': {
      await setSettings(message.payload);
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
    case 'TRANSLATE': {
      return {
        type: 'TRANSLATION',
        payload: {
          originalText: message.payload.text,
          translatedText: `[${message.payload.targetLang.toUpperCase()}] ${message.payload.text}`,
          sourceLang: message.payload.sourceLang,
          targetLang: message.payload.targetLang,
        },
      };
    }
    case 'PREFETCH_TRANSLATIONS':
    case 'TRACK_EVENT': {
      return { type: 'OK' };
    }
    default:
      return { type: 'OK' };
  }
}

export function sendToBackground(message: ExtensionMessage): Promise<ExtensionResponse> {
  if (!isChromeRuntimeAvailable()) {
    return handleLocalMessage(message);
  }

  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response: ExtensionResponse) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response) {
          handleLocalMessage(message).then(resolve);
          return;
        }
        resolve(response);
      });
    } catch {
      handleLocalMessage(message).then(resolve);
    }
  });
}

