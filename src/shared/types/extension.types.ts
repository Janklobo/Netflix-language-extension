export type UserSession = {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp ms
};

export type LanguagePair = {
  source: string; // BCP-47 e.g. 'ja'
  target: string; // e.g. 'en'
};

export type SubtitleMode = 'double' | 'click';

export type LearningPreset = 'casual' | 'active' | 'listening' | 'custom';

export type UserSettings = {
  languagePair: LanguagePair;
  subtitleMode: SubtitleMode;
  showOriginal: boolean;
  fontSize: 'small' | 'medium' | 'large';
  opacity: number; // 0-100
  position: 'above' | 'below';
  autoTokenize: boolean;
  learningPreset: LearningPreset;
  autoPauseOnHover: boolean;
  blurSecondaryUntilHover: boolean;
  showFurigana: boolean;
  smartCollisionAvoidance: boolean;
  keyboardShortcutsEnabled: boolean;
};

export type TranslationRequest = {
  text: string;
  sourceLang: string;
  targetLang: string;
  episodeId: string;
};

export type TranslationResult = {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
};

export type WordTranslation = {
  word: string;
  reading?: string; // Japanese furigana/reading
  translation: string;
  partOfSpeech?: string;
};

export type SavedWord = {
  id: string;
  word: string;
  reading?: string;
  translation: string;
  partOfSpeech?: string;
  contextSentence?: string;
  sourceLang: string;
  targetLang: string;
  createdAt: number;
};

// Discriminated union — all messages passed via chrome.runtime.sendMessage
export type ExtensionMessage =
  | { type: 'GET_USER_SESSION' }
  | { type: 'SIGN_IN'; payload: { email: string; password: string } }
  | { type: 'SIGN_IN_GOOGLE' }
  | { type: 'SIGN_OUT' }
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'TRANSLATE'; payload: TranslationRequest }
  | { type: 'PREFETCH_TRANSLATIONS'; payload: TranslationRequest[] }
  | { type: 'SAVE_WORD'; payload: Omit<SavedWord, 'id' | 'createdAt'> & { id?: string; createdAt?: number } }
  | { type: 'GET_SAVED_WORDS' }
  | { type: 'DELETE_SAVED_WORD'; payload: { id: string } }
  | { type: 'EXPORT_ANKI' }
  | { type: 'TRACK_EVENT'; payload: { eventName: string; properties?: Record<string, unknown> } };

export type ExtensionResponse =
  | { type: 'USER_SESSION'; payload: UserSession | null }
  | { type: 'SETTINGS'; payload: UserSettings }
  | { type: 'TRANSLATION'; payload: TranslationResult }
  | { type: 'SAVED_WORDS'; payload: SavedWord[] }
  | { type: 'ANKI_EXPORT'; payload: string }
  | { type: 'ERROR'; payload: string }
  | { type: 'OK' };
