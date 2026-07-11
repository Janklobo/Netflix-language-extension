import type { UserSession, UserSettings } from '@/shared/types/extension.types';
import { SESSION_KEY, SETTINGS_KEY } from '@/shared/constants/cache';
import { DEFAULT_LANGUAGE_PAIR } from '@/shared/constants/languages';

const DEFAULT_SETTINGS: UserSettings = {
  languagePair: DEFAULT_LANGUAGE_PAIR,
  subtitleMode: 'double',
  showOriginal: true,
  fontSize: 'medium',
  opacity: 90,
  position: 'above',
  autoTokenize: true,
};

export async function getSession(): Promise<UserSession | null> {
  const result = await chrome.storage.local.get(SESSION_KEY);
  return (result[SESSION_KEY] as UserSession | undefined) ?? null;
}

export async function setSession(session: UserSession | null): Promise<void> {
  if (session === null) {
    await chrome.storage.local.remove(SESSION_KEY);
  } else {
    await chrome.storage.local.set({ [SESSION_KEY]: session });
  }
}

export async function getSettings(): Promise<UserSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const stored = result[SETTINGS_KEY] as Partial<UserSettings> | undefined;

  // Migration: if showTranslation exists but subtitleMode doesn't, migrate it
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  if (stored && 'showTranslation' in stored && !('subtitleMode' in stored)) {
    const subtitleMode: 'double' | 'click' = stored.showTranslation ? 'double' : 'click';
    const migratedSettings = { ...DEFAULT_SETTINGS, ...stored, subtitleMode };
    // Remove old showTranslation setting by not including it
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { showTranslation, ...cleanStored } = stored;
    await chrome.storage.local.set({ [SETTINGS_KEY]: { ...DEFAULT_SETTINGS, ...cleanStored, subtitleMode } });
    return migratedSettings;
  }

  return settings;
}

export async function setSettings(settings: Partial<UserSettings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...current, ...settings } });
}

export async function getCachedTranslation(cacheKey: string): Promise<string | null> {
  const result = await chrome.storage.local.get(cacheKey);
  return (result[cacheKey] as string | undefined) ?? null;
}

export async function setCachedTranslation(cacheKey: string, translation: string): Promise<void> {
  await chrome.storage.local.set({ [cacheKey]: translation });
}
