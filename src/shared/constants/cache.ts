export const CACHE_KEY_PREFIX = 'translation::';

// Keyed by the actual text being translated — this prevents wrong cache hits
// when Netflix loads multiple subtitle tracks (different languages) that share
// the same index numbers but have completely different content.
export function translationCacheKey(text: string, langPair: string): string {
  return `${CACHE_KEY_PREFIX}${langPair}::${text}`;
}

export const SESSION_KEY = 'user_session';
export const SETTINGS_KEY = 'user_settings';
export const SAVED_WORDS_KEY = 'saved_words';
export const TOKEN_REFRESH_ALARM = 'token_refresh';
