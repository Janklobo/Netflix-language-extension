import type { UserSession, UserSettings, SavedWord } from '@/shared/types/extension.types';
import { SESSION_KEY, SETTINGS_KEY, SAVED_WORDS_KEY } from '@/shared/constants/cache';
import { DEFAULT_LANGUAGE_PAIR } from '@/shared/constants/languages';

const DEFAULT_SETTINGS: UserSettings = {
  languagePair: DEFAULT_LANGUAGE_PAIR,
  subtitleMode: 'double',
  showOriginal: true,
  fontSize: 'medium',
  opacity: 90,
  position: 'above',
  autoTokenize: true,
  learningPreset: 'casual',
  autoPauseOnHover: false,
  blurSecondaryUntilHover: false,
  showFurigana: true,
  smartCollisionAvoidance: true,
  keyboardShortcutsEnabled: true,
};

const isChromeStorageAvailable = (): boolean => {
  try {
    return typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined' && !!chrome.storage?.local;
  } catch {
    return false;
  }
};

const memoryStore: Record<string, unknown> = {};

const storageDriver = {
  async get(keys: string | string[]): Promise<Record<string, unknown>> {
    if (isChromeStorageAvailable()) {
      return chrome.storage.local.get(keys);
    }
    const keyList = typeof keys === 'string' ? [keys] : keys;
    const result: Record<string, unknown> = {};
    for (const k of keyList) {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const item = window.localStorage.getItem(`linguaflix_${k}`);
          if (item !== null) {
            result[k] = JSON.parse(item);
            continue;
          }
        } catch {
          // ignore
        }
      }
      result[k] = memoryStore[k];
    }
    return result;
  },
  async set(items: Record<string, unknown>): Promise<void> {
    if (isChromeStorageAvailable()) {
      return chrome.storage.local.set(items);
    }
    for (const [k, v] of Object.entries(items)) {
      memoryStore[k] = v;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(`linguaflix_${k}`, JSON.stringify(v));
        } catch {
          // ignore
        }
      }
    }
  },
  async remove(keys: string | string[]): Promise<void> {
    if (isChromeStorageAvailable()) {
      return chrome.storage.local.remove(keys);
    }
    const keyList = typeof keys === 'string' ? [keys] : keys;
    for (const k of keyList) {
      delete memoryStore[k];
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem(`linguaflix_${k}`);
        } catch {
          // ignore
        }
      }
    }
  },
};

export async function getSession(): Promise<UserSession | null> {
  const result = await storageDriver.get(SESSION_KEY);
  return (result[SESSION_KEY] as UserSession | undefined) ?? null;
}

export async function setSession(session: UserSession | null): Promise<void> {
  if (session === null) {
    await storageDriver.remove(SESSION_KEY);
  } else {
    await storageDriver.set({ [SESSION_KEY]: session });
  }
}

export async function getSettings(): Promise<UserSettings> {
  const result = await storageDriver.get(SETTINGS_KEY);
  const stored = result[SETTINGS_KEY] as Partial<UserSettings> | undefined;

  // Migration: if showTranslation exists but subtitleMode doesn't, migrate it
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  if (stored && 'showTranslation' in stored && !('subtitleMode' in stored)) {
    const subtitleMode: 'double' | 'click' = stored.showTranslation ? 'double' : 'click';
    const migratedSettings = { ...DEFAULT_SETTINGS, ...stored, subtitleMode };
    // Remove old showTranslation setting by not including it
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { showTranslation, ...cleanStored } = stored;
    await storageDriver.set({ [SETTINGS_KEY]: { ...DEFAULT_SETTINGS, ...cleanStored, subtitleMode } });
    return migratedSettings;
  }

  return settings;
}

export async function setSettings(settings: Partial<UserSettings>): Promise<void> {
  const current = await getSettings();
  await storageDriver.set({ [SETTINGS_KEY]: { ...current, ...settings } });
}

export async function getCachedTranslation(cacheKey: string): Promise<string | null> {
  const result = await storageDriver.get(cacheKey);
  return (result[cacheKey] as string | undefined) ?? null;
}

export async function setCachedTranslation(cacheKey: string, translation: string): Promise<void> {
  await storageDriver.set({ [cacheKey]: translation });
}

export async function getSavedWords(): Promise<SavedWord[]> {
  const result = await storageDriver.get(SAVED_WORDS_KEY);
  return (result[SAVED_WORDS_KEY] as SavedWord[] | undefined) ?? [];
}

export async function saveWord(
  wordData: Omit<SavedWord, 'id' | 'createdAt'> & { id?: string; createdAt?: number },
): Promise<SavedWord> {
  const words = await getSavedWords();
  const existingIndex = words.findIndex((w) => w.word.toLowerCase() === wordData.word.toLowerCase());
  const now = Date.now();
  const entry: SavedWord = {
    id: wordData.id || `word_${now}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: wordData.createdAt || now,
    word: wordData.word,
    reading: wordData.reading,
    translation: wordData.translation,
    partOfSpeech: wordData.partOfSpeech,
    contextSentence: wordData.contextSentence,
    sourceLang: wordData.sourceLang,
    targetLang: wordData.targetLang,
  };

  if (existingIndex >= 0) {
    words[existingIndex] = entry;
  } else {
    words.unshift(entry);
  }

  await storageDriver.set({ [SAVED_WORDS_KEY]: words });
  return entry;
}

export async function deleteSavedWord(id: string): Promise<void> {
  const words = await getSavedWords();
  const filtered = words.filter((w) => w.id !== id);
  await storageDriver.set({ [SAVED_WORDS_KEY]: filtered });
}

export async function exportAnkiTsv(): Promise<string> {
  const words = await getSavedWords();
  // Anki TSV format: Front (Word + Reading) \t Back (Translation + PartOfSpeech) \t Sentence Context \t Tags
  const header = '#separator:tab\n#html:true\n#tags column:4\nWord\tTranslation\tSentence\tTags\n';
  const rows = words.map((w) => {
    const front = w.reading && w.reading !== w.word
      ? `${w.word} [${w.reading}]`
      : w.word;
    const back = w.partOfSpeech ? `(${w.partOfSpeech}) ${w.translation}` : w.translation;
    const sentence = (w.contextSentence || '').replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const tag = `linguaflix_${w.sourceLang}_${w.targetLang}`;
    return `${front}\t${back}\t${sentence}\t${tag}`;
  });
  return header + rows.join('\n');
}
