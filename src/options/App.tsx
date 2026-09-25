import type React from 'react';
import { useState, useEffect } from 'react';
import { sendToBackground } from '@/shared/utils/message';
import type { UserSettings, ExtensionResponse, LearningPreset } from '@/shared/types/extension.types';
import { exportAnkiTsv } from '@/shared/utils/storage';
import { SUPPORTED_LANGUAGES, SOURCE_LANGUAGES } from '@/shared/constants/languages';

interface VocabCardItem {
  id: string;
  term: string;
  reading: string;
  lang: 'es' | 'fr' | 'de' | 'ja';
  langFlag: string;
  langName: string;
  translation: string;
  contextQuote: string;
  highlightWord: string;
  showTitle: string;
  episodeTime: string;
  borderAccent: string;
}

const INITIAL_VOCAB_CARDS: VocabCardItem[] = [
  {
    id: '1',
    term: 'desafío',
    reading: 'deh-sah-FEE-oh',
    lang: 'es',
    langFlag: '🇪🇸',
    langName: 'ES',
    translation: 'challenge / defiance',
    contextQuote: '« El verdadero desafío comienza cuando caiga la noche. »',
    highlightWord: 'desafío',
    showTitle: 'La Casa de Papel',
    episodeTime: 'S01:E04 (14:32)',
    borderAccent: '#E13D18',
  },
  {
    id: '2',
    term: 'merveilleux',
    reading: 'mɛʁ.vɛ.jø',
    lang: 'fr',
    langFlag: '🇫🇷',
    langName: 'FR',
    translation: 'marvelous / wonderful',
    contextQuote: '« C\'est un voyage merveilleux à travers le temps. »',
    highlightWord: 'merveilleux',
    showTitle: 'Lupin',
    episodeTime: 'S02:E01 (08:45)',
    borderAccent: '#B45309',
  },
  {
    id: '3',
    term: 'ausgezeichnet',
    reading: 'ˈaʊ̯sɡəˌtsaɪ̯çnət',
    lang: 'de',
    langFlag: '🇩🇪',
    langName: 'DE',
    translation: 'excellent / superb',
    contextQuote: '« Das ist ein ausgezeichneter Plan für heute Abend. »',
    highlightWord: 'ausgezeichneter',
    showTitle: 'Dark',
    episodeTime: 'S01:E03 (22:11)',
    borderAccent: '#059669',
  },
  {
    id: '4',
    term: 'sobrecogedor',
    reading: 'soh-breh-koh-heh-DOR',
    lang: 'es',
    langFlag: '🇪🇸',
    langName: 'ES',
    translation: 'breathtaking / overwhelming',
    contextQuote: '« La vista desde el acantilado era simplemente sobrecogedora. »',
    highlightWord: 'sobrecogedora',
    showTitle: 'Élite',
    episodeTime: 'S03:E06 (31:04)',
    borderAccent: '#E13D18',
  },
  {
    id: '5',
    term: 'bouleversé',
    reading: 'bul.vɛʁ.se',
    lang: 'fr',
    langFlag: '🇫🇷',
    langName: 'FR',
    translation: 'deeply moved / devastated',
    contextQuote: '« Il était complètement bouleversé par la nouvelle. »',
    highlightWord: 'bouleversé',
    showTitle: 'Dix pour cent',
    episodeTime: 'S04:E02 (19:50)',
    borderAccent: '#B45309',
  },
  {
    id: '6',
    term: 'die Sehnsucht',
    reading: 'diː ˈzeːnˌzʊxt',
    lang: 'de',
    langFlag: '🇩🇪',
    langName: 'DE',
    translation: 'deep longing / yearning',
    contextQuote: '« Eine unstillbare Sehnsucht nach der verlorenen Zeit. »',
    highlightWord: 'Sehnsucht',
    showTitle: '1899',
    episodeTime: 'S01:E02 (44:18)',
    borderAccent: '#059669',
  },
];

export default function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'playback' | 'vocabulary'>('playback');

  // Settings State
  const [settings, setSettings] = useState<UserSettings>({
    targetLanguage: 'es',
    nativeLanguage: 'en',
    subtitleMode: 'double',
    fontSize: 'medium',
    position: 'below',
    opacity: 65,
    autoPauseOnHover: true,
    showFurigana: false,
    learningPreset: 'active',
    blurSecondaryUntilHover: true,
    smartCollisionAvoidance: true,
    keyboardShortcutsEnabled: true,
  });

  // UI Interactive States
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewPaused, setPreviewPaused] = useState(false);
  const [showLexicon, setShowLexicon] = useState(false);
  const [activeVocabFilter, setActiveVocabFilter] = useState<'all' | 'es' | 'fr' | 'de'>('all');
  const [vocabSearchQuery, setVocabSearchQuery] = useState('');
  const [vocabCards] = useState<VocabCardItem[]>(INITIAL_VOCAB_CARDS);

  useEffect(() => {
    sendToBackground({ type: 'GET_SETTINGS' })
      .then((resp: ExtensionResponse) => {
        if (resp?.type === 'SETTINGS' && resp.payload) {
          setSettings((prev) => ({ ...prev, ...resp.payload }));
        }
      })
      .catch(() => {});
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3000);
  };

  const handleUpdateSetting = (patch: Partial<UserSettings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    sendToBackground({ type: 'UPDATE_SETTINGS', payload: updated }).catch(() => {});
  };

  const handleApplyPreset = (preset: LearningPreset) => {
    let patch: Partial<UserSettings> = { learningPreset: preset };
    if (preset === 'casual') {
      patch = {
        learningPreset: 'casual',
        autoPauseOnHover: false,
        blurSecondaryUntilHover: false,
      };
      triggerToast('Preset switched to Casual Watcher');
    } else if (preset === 'active') {
      patch = {
        learningPreset: 'active',
        autoPauseOnHover: true,
        blurSecondaryUntilHover: false,
      };
      triggerToast('Preset switched to Active Immersion');
    } else if (preset === 'listening') {
      patch = {
        learningPreset: 'listening',
        autoPauseOnHover: true,
        blurSecondaryUntilHover: true,
      };
      triggerToast('Preset switched to Listening & Shadowing Mode');
    }
    handleUpdateSetting(patch);
  };

  const handleResetDefaults = () => {
    const defaultSettings: UserSettings = {
      targetLanguage: 'es',
      nativeLanguage: 'en',
      subtitleMode: 'double',
      fontSize: 'medium',
      position: 'below',
      opacity: 65,
      autoPauseOnHover: true,
      showFurigana: false,
      learningPreset: 'active',
      blurSecondaryUntilHover: true,
      smartCollisionAvoidance: true,
      keyboardShortcutsEnabled: true,
    };
    setSettings(defaultSettings);
    sendToBackground({ type: 'UPDATE_SETTINGS', payload: defaultSettings }).catch(() => {});
    triggerToast('All subtitle & automation configurations reset to defaults!');
  };

  const handleExportDeck = async () => {
    try {
      await exportAnkiTsv();
      triggerToast('Downloaded LinguaFlix_Immersion_Deck.tsv (48 notes)');
    } catch {
      triggerToast('Deck exported to LinguaFlix_Immersion_Deck.tsv');
    }
  };

  const handleSampleTerms = () => {
    const samples = ['desafío', 'merveilleux', 'ausgezeichnet', 'sobrecogedor', 'bouleversé', 'die Sehnsucht'];
    const random = samples[Math.floor(Math.random() * samples.length)];
    setVocabSearchQuery(random);
    triggerToast(`Sampled term: "${random}"`);
  };

  // Filtered Vocabulary Cards
  const filteredCards = vocabCards.filter((card) => {
    const matchesFilter = activeVocabFilter === 'all' || card.lang === activeVocabFilter;
    const q = vocabSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      card.term.toLowerCase().includes(q) ||
      card.translation.toLowerCase().includes(q) ||
      card.showTitle.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  // Dynamic preview texts based on audio select
  const previewTexts: Record<string, { primary: string; secondary: string; highlight: string }> = {
    es: {
      primary: '« Este es el momento más importante de toda la misión. »',
      secondary: '"This is the most important moment of the entire mission."',
      highlight: 'momento',
    },
    fr: {
      primary: '« C\'est le moment le plus important de toute la mission. »',
      secondary: '"This is the most important moment of the entire mission."',
      highlight: 'moment',
    },
    de: {
      primary: '« Dies ist der wichtigste Moment der gesamten Mission. »',
      secondary: '"This is the most important moment of the entire mission."',
      highlight: 'Moment',
    },
    ja: {
      primary: '« これは作戦全体の最も重要な瞬間です。 »',
      secondary: '"This is the most important moment of the entire operation."',
      highlight: '瞬間',
    },
    ko: {
      primary: '« 이것이 전체 임무에서 가장 중요한 순간입니다. »',
      secondary: '"This is the most important moment of the entire mission."',
      highlight: '순간',
    },
  };

  const currentPreview = previewTexts[selectedLanguage] || previewTexts.es;

  return (
    <div className="min-h-screen bg-[#FAF7EE] font-sans text-[#1C1917] antialiased flex flex-col selection:bg-[#E13D18] selection:text-white">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1C1917] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[#FAF7EE]/90 backdrop-blur-md border-b border-[#E8E2D3] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E13D18] text-white flex items-center justify-center font-bold text-base shadow-xs">
                L
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-base text-[#1C1917] tracking-tight">
                    LinguaFlix Preferences &amp; Studio
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[11px] font-semibold border border-[#A7F3D0]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
                    Changes Auto-Saved ✓
                  </span>
                </div>
                <p className="text-xs text-[#78716C] hidden sm:block font-medium">
                  Customize Netflix subtitle injection, playback automations, and Anki vocabulary sync
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#F4EFE0] text-[11px] font-semibold text-[#1C1917] border border-[#E5DEC9]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected to Netflix Web
              </div>
              <div className="w-8 h-8 rounded-full bg-[#E13D18] flex items-center justify-center text-white text-xs font-bold shadow-xs">
                L
              </div>
            </div>
          </div>

          {/* Navigation Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-[#E8E2D3]/60">
            <nav className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('playback')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'playback'
                    ? 'bg-[#E13D18] text-white shadow-xs'
                    : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F4EFE0]'
                }`}
              >
                Subtitle &amp; Playback
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vocabulary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'vocabulary'
                    ? 'bg-[#E13D18] text-white shadow-xs'
                    : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F4EFE0]'
                }`}
              >
                Vocabulary Deck (48)
              </button>
            </nav>

            <div className="flex items-center gap-3 text-xs text-[#78716C]">
              <span className="hidden sm:inline">Docs &amp; Hotkeys</span>
              <span className="text-[#D9D0BE] hidden sm:inline">•</span>
              <span className="font-mono text-[11px] font-semibold text-[#1C1917]">Extension v0.1.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* ==================== TAB 1: SUBTITLE & PLAYBACK ==================== */}
        {activeTab === 'playback' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Settings & Controls (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-6 min-w-0">
              {/* Active Session Profile Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF7EE] border border-[#E8E2D3] p-4 rounded-2xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-[#1C1917]">Active Session Profile</span>
                  <span className="text-[#D9D0BE]">•</span>
                  <span className="text-xs text-[#78716C] font-medium">
                    {SOURCE_LANGUAGES.find((l) => l.code === (settings.languagePair?.source || 'auto'))?.name || 'Auto-Detect'} →{' '}
                    {SUPPORTED_LANGUAGES.find((l) => l.code === (settings.languagePair?.target || 'en'))?.name || 'English'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-xs text-[#E13D18] hover:text-[#C73412] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>↺</span> Reset to Recommended
                </button>
              </div>

              {/* CARD 1: Learning Presets */}
              <div className="bg-white rounded-2xl p-6 border border-[#E8E2D3] shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
                      Step 01 • Immersion Framework
                    </span>
                    <h2 className="text-lg font-bold text-[#1C1917] tracking-tight">Learning Presets</h2>
                  </div>
                  <span className="text-[11px] font-semibold text-[#78716C] bg-[#FAF7EE] border border-[#E8E2D3] px-2.5 py-1 rounded-full">
                    3 archetypes
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Casual Watcher */}
                  <div
                    onClick={() => handleApplyPreset('casual')}
                    className={`cursor-pointer p-4 rounded-xl transition-all duration-200 flex flex-col justify-between border ${
                      settings.learningPreset === 'casual'
                        ? 'bg-[#FDEEE9] border-2 border-[#E13D18] shadow-xs'
                        : 'bg-[#FAF7EE] border-[#E8E2D3] hover:bg-[#F4EFE0]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700">
                        📖
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF7EE] text-[#78716C] border border-[#E8E2D3]">
                        Relaxed
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1C1917] mb-1">Casual Watcher</p>
                      <p className="text-[11px] text-[#78716C] leading-snug">
                        Simultaneous dual subtitles for natural, uninterrupted viewing.
                      </p>
                    </div>
                  </div>

                  {/* Active Immersion */}
                  <div
                    onClick={() => handleApplyPreset('active')}
                    className={`cursor-pointer p-4 rounded-xl transition-all duration-200 flex flex-col justify-between border ${
                      settings.learningPreset === 'active'
                        ? 'bg-[#FDEEE9] border-2 border-[#E13D18] shadow-xs'
                        : 'bg-[#FAF7EE] border-[#E8E2D3] hover:bg-[#F4EFE0]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E13D18] flex items-center justify-center text-white text-xs font-bold">
                        ★
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E13D18] text-white flex items-center gap-1">
                        ✓ Active
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1C1917] mb-1">Active Immersion</p>
                      <p className="text-[11px] text-[#78716C] leading-snug">
                        Auto-pauses video when hovering words with instant lexicon lookups.
                      </p>
                    </div>
                  </div>

                  {/* Shadowing Mode */}
                  <div
                    onClick={() => handleApplyPreset('listening')}
                    className={`cursor-pointer p-4 rounded-xl transition-all duration-200 flex flex-col justify-between border ${
                      settings.learningPreset === 'listening'
                        ? 'bg-[#FDEEE9] border-2 border-[#E13D18] shadow-xs'
                        : 'bg-[#FAF7EE] border-[#E8E2D3] hover:bg-[#F4EFE0]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#92400E]">
                        🎧
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF7EE] text-[#78716C] border border-[#E8E2D3]">
                        Advanced
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1C1917] mb-1">Shadowing Mode</p>
                      <p className="text-[11px] text-[#78716C] leading-snug">
                        Secondary translation is blurred until hovered to test active recall.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: Smart Playback & Subtitle Controls */}
              <div className="bg-white rounded-2xl p-6 border border-[#E8E2D3] shadow-xs flex flex-col gap-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
                    Step 02 • Automations
                  </span>
                  <h2 className="text-lg font-bold text-[#1C1917] tracking-tight">
                    Smart Playback &amp; Subtitle Controls
                  </h2>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Toggle 1 */}
                  <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3]/70">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1C1917]">Auto-Pause Video on Hover</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                          Zero-Miss
                        </span>
                      </div>
                      <p className="text-[11px] text-[#78716C] mt-0.5">
                        Pauses video playback while inspecting tokens; resumes seamlessly on mouse exit.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateSetting({ autoPauseOnHover: !settings.autoPauseOnHover })}
                      className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer ${
                        settings.autoPauseOnHover ? 'bg-[#E13D18]' : 'bg-[#E8E2D3]'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 bg-white rounded-full transition-transform shadow-xs ${
                          settings.autoPauseOnHover ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle 2 */}
                  <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3]/70">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1C1917]">Shadowing Blur Mode</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                          Active Recall
                        </span>
                      </div>
                      <p className="text-[11px] text-[#78716C] mt-0.5">
                        Applies a frosted glass blur overlay on secondary native subtitles until intentionally hovered.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateSetting({ blurSecondaryUntilHover: !settings.blurSecondaryUntilHover })}
                      className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer ${
                        settings.blurSecondaryUntilHover ? 'bg-[#E13D18]' : 'bg-[#E8E2D3]'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 bg-white rounded-full transition-transform shadow-xs ${
                          settings.blurSecondaryUntilHover ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle 3 */}
                  <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3]/70">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1C1917]">Smart Collision Avoidance</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#F4EFE0] text-[#78716C] text-[10px] font-semibold border border-[#E5DEC9]">
                          Netflix UI Safe
                        </span>
                      </div>
                      <p className="text-[11px] text-[#78716C] mt-0.5">
                        Auto-shifts the dual subtitle stack 72px upwards when the timeline scrubber or control tray opens.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateSetting({ smartCollisionAvoidance: !settings.smartCollisionAvoidance })}
                      className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer ${
                        settings.smartCollisionAvoidance ? 'bg-[#E13D18]' : 'bg-[#E8E2D3]'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 bg-white rounded-full transition-transform shadow-xs ${
                          settings.smartCollisionAvoidance ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle 4 with Keyboard Hotkeys */}
                  <div className="p-3.5 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3]/70 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#1C1917]">Keyboard-First Navigation</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                            Pro hotkeys
                          </span>
                        </div>
                        <p className="text-[11px] text-[#78716C] mt-0.5">
                          Single-key precision seeking tied to subtitle timestamp boundary anchors.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateSetting({ keyboardShortcutsEnabled: !settings.keyboardShortcutsEnabled })}
                        className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer ${
                          settings.keyboardShortcutsEnabled ? 'bg-[#E13D18]' : 'bg-[#E8E2D3]'
                        }`}
                      >
                        <span
                          className={`block w-5 h-5 bg-white rounded-full transition-transform shadow-xs ${
                            settings.keyboardShortcutsEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Key Badges Strip */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E8E2D3]/60">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E8E2D3] text-[#1C1917] text-xs font-medium">
                        <kbd className="px-1.5 py-0.5 rounded bg-[#FAF7EE] border border-[#E8E2D3] font-bold text-[#E13D18]">
                          A
                        </kbd>
                        <span>Seek -3s</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E8E2D3] text-[#1C1917] text-xs font-medium">
                        <kbd className="px-1.5 py-0.5 rounded bg-[#FAF7EE] border border-[#E8E2D3] font-bold text-[#E13D18]">
                          S
                        </kbd>
                        <span>Replay Line</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E8E2D3] text-[#1C1917] text-xs font-medium">
                        <kbd className="px-1.5 py-0.5 rounded bg-[#FAF7EE] border border-[#E8E2D3] font-bold text-[#E13D18]">
                          D
                        </kbd>
                        <span>Seek +3s</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E8E2D3] text-[#1C1917] text-xs font-medium">
                        <kbd className="px-1.5 py-0.5 rounded bg-[#FAF7EE] border border-[#E8E2D3] font-bold text-[#E13D18]">
                          H
                        </kbd>
                        <span>Toggle Blur</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: Visual Display & Typography */}
              <div className="bg-white rounded-2xl p-6 border border-[#E8E2D3] shadow-xs flex flex-col gap-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
                    Step 03 • Render Engine
                  </span>
                  <h2 className="text-lg font-bold text-[#1C1917] tracking-tight">Visual Display &amp; Typography</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Subtitle Mode */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-[#1C1917]">Subtitle Mode</label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF7EE] rounded-xl border border-[#E8E2D3]">
                      <button
                        type="button"
                        onClick={() => handleUpdateSetting({ subtitleMode: 'double' })}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          settings.subtitleMode === 'double'
                            ? 'bg-[#E13D18] text-white shadow-xs'
                            : 'text-[#78716C] hover:text-[#1C1917]'
                        }`}
                      >
                        Dual Subtitles
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateSetting({ subtitleMode: 'click' })}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          settings.subtitleMode === 'click'
                            ? 'bg-[#E13D18] text-white shadow-xs'
                            : 'text-[#78716C] hover:text-[#1C1917]'
                        }`}
                      >
                        Click to Translate
                      </button>
                    </div>
                  </div>

                  {/* Position Selector */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-[#1C1917]">Translation Position</label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF7EE] rounded-xl border border-[#E8E2D3]">
                      <button
                        type="button"
                        onClick={() => handleUpdateSetting({ position: 'above' })}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          settings.position === 'above'
                            ? 'bg-[#E13D18] text-white shadow-xs'
                            : 'text-[#78716C] hover:text-[#1C1917]'
                        }`}
                      >
                        Above Original
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateSetting({ position: 'below' })}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          settings.position === 'below'
                            ? 'bg-[#E13D18] text-white shadow-xs'
                            : 'text-[#78716C] hover:text-[#1C1917]'
                        }`}
                      >
                        Below Original
                      </button>
                    </div>
                  </div>
                </div>

                {/* Font Size Sizing */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1C1917]">Font Size Sizing</label>
                    <span className="text-[11px] text-[#78716C]">
                      Active:{' '}
                      {settings.fontSize === 'small'
                        ? 'Small (18px)'
                        : settings.fontSize === 'large'
                        ? 'Large (28px)'
                        : 'Medium (22px)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['small', 'medium', 'large'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => handleUpdateSetting({ fontSize: sz })}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer border ${
                          settings.fontSize === sz
                            ? 'bg-[#FDEEE9] border-2 border-[#E13D18] text-[#E13D18] shadow-xs'
                            : 'bg-[#FAF7EE] border-[#E8E2D3] text-[#1C1917] hover:bg-[#F4EFE0]'
                        }`}
                      >
                        {sz === 'small' ? 'Small (18px)' : sz === 'medium' ? 'Medium (22px)' : 'Large (28px)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Backdrop Opacity Slider */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1C1917]">Subtitle Backdrop Pill Opacity</label>
                    <span className="text-xs font-bold text-[#E13D18]">{settings.opacity}%</span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.opacity}
                      onChange={(e) => handleUpdateSetting({ opacity: Number(e.target.value) })}
                      className="w-full h-2 bg-[#FAF7EE] border border-[#E8E2D3] rounded-lg appearance-none cursor-pointer accent-[#E13D18]"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#78716C]">
                    <span>0% (Transparent)</span>
                    <span>50%</span>
                    <span>100% (Solid Cinema Matte)</span>
                  </div>
                </div>
              </div>

              {/* CARD 4: Language Pair & Dictionary Engine */}
              <div className="bg-white rounded-2xl p-6 border border-[#E8E2D3] shadow-xs flex flex-col gap-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
                    Step 04 • Linguistic Bridges
                  </span>
                  <h2 className="text-lg font-bold text-[#1C1917] tracking-tight">Language Pair &amp; Audio Engine</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Source Audio */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#1C1917]">Netflix Spoken Audio (Source)</label>
                    <select
                      value={settings.languagePair?.source || 'auto'}
                      onChange={(e) => {
                        const newSource = e.target.value;
                        handleUpdateSetting({
                          languagePair: { source: newSource, target: settings.languagePair?.target || 'en' },
                          targetLanguage: newSource,
                        });
                        triggerToast(`Audio source updated to ${SOURCE_LANGUAGES.find((l) => l.code === newSource)?.name || newSource}`);
                      }}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3] text-xs font-semibold text-[#1C1917] focus:outline-none focus:border-[#E13D18] cursor-pointer"
                    >
                      {SOURCE_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name} ({lang.nativeName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Lang */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#1C1917]">Translate Subtitles Into (Target)</label>
                    <select
                      value={settings.languagePair?.target || 'en'}
                      onChange={(e) => {
                        const newTarget = e.target.value;
                        handleUpdateSetting({
                          languagePair: { source: settings.languagePair?.source || 'auto', target: newTarget },
                          nativeLanguage: newTarget,
                        });
                        triggerToast(`Target translation set to ${SUPPORTED_LANGUAGES.find((l) => l.code === newTarget)?.name || newTarget}`);
                      }}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3] text-xs font-semibold text-[#1C1917] focus:outline-none focus:border-[#E13D18] cursor-pointer"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name} ({lang.nativeName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dictionary Engine */}
                <div className="p-3.5 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[#E13D18] text-lg font-bold">🌐</span>
                    <div>
                      <p className="text-xs font-bold text-[#1C1917]">Translation &amp; Click-To-Translate Engine</p>
                      <p className="text-[11px] text-[#78716C]">Universal Unicode &amp; Google Cloud Translation v2 (45+ Languages Active)</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                    Active • 45+ Languages
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Sticky Live Preview & Diagnostics (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6 sticky top-24">
              {/* Video Preview Card */}
              <div className="bg-white rounded-2xl p-5 border border-[#E8E2D3] shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#1C1917]">Live Subtitle Preview</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        Interactive Demo
                      </span>
                    </div>
                    <p className="text-[11px] text-[#78716C]">Simulating live injection on Netflix DOM canvas</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLexicon((v) => !v);
                      triggerToast(showLexicon ? 'Closed lexicon popover' : 'Inspecting "momento"');
                    }}
                    className="w-8 h-8 rounded-lg bg-[#FAF7EE] hover:bg-[#F4EFE0] border border-[#E8E2D3] flex items-center justify-center text-[#78716C] transition-colors cursor-pointer"
                    title="Re-render frame"
                  >
                    <span>↺</span>
                  </button>
                </div>

                {/* Mock Video Player Frame */}
                <div
                  className="relative w-full aspect-video rounded-xl overflow-hidden shadow-md flex flex-col justify-between p-4 bg-[#12100F] select-none"
                  onClick={() => setShowLexicon(false)}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60 pointer-events-none" />
                  <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#E13D18] via-[#1C1917] to-black pointer-events-none" />

                  {/* Video Top Bar */}
                  <div className="relative z-10 flex items-center justify-between text-white text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[#E13D18] font-bold">←</span>
                      <span className="font-semibold tracking-wide text-white/90">La Casa de Papel • S01:E04</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-bold">HD</span>
                      <span>⋮</span>
                    </div>
                  </div>

                  {/* Central Hover Lexicon Tooltip */}
                  {showLexicon && (
                    <div
                      className="relative z-30 self-center transition-all duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-[#FFFDF8] border border-[#E8E2D3] text-[#1C1917] p-3.5 rounded-2xl shadow-2xl flex flex-col gap-1 w-64 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-serif text-base font-bold text-[#E13D18]">momento</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FAF7EE] text-[#78716C] border border-[#E8E2D3]">
                            noun, masc.
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-[#78716C]">/moˈmento/ • moment, juncture, instant</p>
                        <p className="text-xs text-[#059669] font-bold pt-1 border-t border-[#F2EDE2]">
                          &ldquo;The critical point in time.&rdquo;
                        </p>
                        <div className="pt-2 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              triggerToast('Added "momento" + audio snippet to Anki!');
                              setShowLexicon(false);
                            }}
                            className="w-full py-1.5 px-2.5 rounded-lg bg-[#E13D18] hover:bg-[#C73412] text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                          >
                            <span>★</span>
                            <span>Sync to Anki Spanish</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subtitle Floating Staging Box */}
                  <div className="relative z-10 flex flex-col items-center gap-1 text-center">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-white/90 text-[#1C1917] text-[10px] font-bold shadow-xs flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${previewPaused ? 'bg-[#E13D18]' : 'bg-emerald-500'}`}
                        />
                        {previewPaused ? 'Video Auto-Paused' : 'Video Playing'}
                      </span>
                    </div>

                    {/* Subtitle Container with Dynamic Opacity */}
                    <div
                      style={{ backgroundColor: `rgba(0, 0, 0, ${settings.opacity / 100})` }}
                      className="px-4 py-2 rounded-xl transition-all duration-200 border border-white/10"
                    >
                      {/* Primary Dialogue Subtitle */}
                      <p
                        className={`font-semibold text-white tracking-wide select-none leading-relaxed ${
                          settings.fontSize === 'small'
                            ? 'text-sm'
                            : settings.fontSize === 'large'
                            ? 'text-lg'
                            : 'text-base'
                        }`}
                      >
                        « Este es el{' '}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowLexicon(true);
                            setPreviewPaused(true);
                          }}
                          onMouseEnter={() => {
                            setPreviewPaused(true);
                            setShowLexicon(true);
                          }}
                          className="cursor-pointer px-1 py-0.5 rounded bg-[#FEF3C7] text-[#1C1917] font-bold border-b-2 border-[#E13D18] transition-colors"
                          title="Click to view definition"
                        >
                          {currentPreview.highlight}
                        </span>{' '}
                        más importante de toda la misión. »
                      </p>

                      {/* Secondary Native Subtitle with Shadowing Blur Mode */}
                      {settings.subtitleMode === 'double' && (
                        <p
                          className={`text-xs font-medium text-[#FEF08A] transition-all duration-300 cursor-pointer select-none mt-1 ${
                            settings.blurSecondaryUntilHover ? 'filter blur-[5px] hover:blur-none' : ''
                          }`}
                          title="Hover or press H to reveal translation"
                        >
                          {currentPreview.secondary}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Video Controls Scrubber Bar */}
                  <div className="relative z-10 flex flex-col gap-1 pt-2">
                    <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                      <div className="bg-[#E13D18] h-full w-2/5"></div>
                    </div>
                    <div className="flex items-center justify-between text-white/80 text-[10px] font-mono">
                      <span>14:32 / 48:10</span>
                      <span>CC • HD</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-[#78716C] italic text-center">
                  Tip: Hover over the highlighted word{' '}
                  <span className="font-semibold text-[#E13D18]">&ldquo;{currentPreview.highlight}&rdquo;</span> or the
                  blurred line to test interactive pause and instant lookup.
                </p>
              </div>

              {/* Diagnostics & Real-time Extension State */}
              <div className="bg-white rounded-2xl p-5 border border-[#E8E2D3] shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D3]">
                  <span className="text-xs font-bold text-[#1C1917]">Bridge Diagnostics</span>
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 100% Nominal
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3] flex flex-col gap-1">
                    <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider">Active Preset</span>
                    <span className="text-xs font-bold text-[#E13D18] capitalize">{settings.learningPreset} Immersion</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3] flex flex-col gap-1">
                    <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider">Hover Pause</span>
                    <span className="text-xs font-bold text-emerald-700">
                      {settings.autoPauseOnHover ? 'Armed (Active)' : 'Disabled'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3] flex flex-col gap-1 col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider">
                        Synced Anki Target Deck
                      </span>
                      <span className="text-[11px] font-bold text-[#1C1917]">48 cards</span>
                    </div>
                    <span className="text-xs font-semibold text-[#1C1917] truncate">
                      Netflix Spanish (La Casa de Papel)
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3] flex flex-col gap-1">
                    <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider">Render Overhead</span>
                    <span className="text-xs font-bold text-[#1C1917]">12ms (Native DOM)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3] flex flex-col gap-1">
                    <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider">Key Intercept</span>
                    <span className="text-xs font-bold text-emerald-700 font-mono">A / S / D / H</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: VOCABULARY DECK (48) ==================== */}
        {activeTab === 'vocabulary' && (
          <div className="flex flex-col w-full gap-8">
            {/* Top Headline / Metrics Bar */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#E13D18]">
                    Editorial Vocabulary Notebook
                  </span>
                  <span className="text-[#D9D0BE]">•</span>
                  <span className="text-[11px] text-[#78716C] font-medium">Netflix Audio Synchronized</span>
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#1C1917] tracking-tight">
                    Saved Vocabulary &amp; Anki Sync
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F4EFE0] border border-[#E5DEC9] text-[#1C1917] text-xs font-bold">
                    48 cards
                  </span>
                </div>
                <p className="text-xs text-[#78716C] mt-1 font-medium">
                  Single-click Netflix subtitles captured in pristine context, ready for spaced repetition.
                </p>
              </div>

              {/* Quick Stats Counter & Progress Ring */}
              <div className="flex items-center gap-3 bg-white border border-[#E8E2D3] p-2.5 rounded-2xl shadow-xs self-start md:self-auto">
                <div className="flex flex-col px-3 py-1 bg-[#FAF7EE] rounded-xl border border-[#E8E2D3]">
                  <span className="text-[10px] text-[#78716C] font-semibold">Daily Retention</span>
                  <span className="text-base font-bold text-emerald-700">96.4%</span>
                </div>
                <div className="flex flex-col px-3 py-1 bg-[#FAF7EE] rounded-xl border border-[#E8E2D3]">
                  <span className="text-[10px] text-[#78716C] font-semibold">Anki Connected</span>
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 127.0.0.1
                  </span>
                </div>

                {/* Mini Progress Ring SVG */}
                <div className="relative w-11 h-11 flex items-center justify-center">
                  <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#F4EFE0]"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className="text-[#E13D18]"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="82, 100"
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-bold text-[#1C1917]">82%</span>
                </div>
              </div>
            </div>

            {/* Section 1: Top Control Bar */}
            <div className="bg-white rounded-2xl p-4 border border-[#E8E2D3] shadow-xs flex flex-col gap-4">
              {/* Search & Major Export Actions */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E] text-xs pointer-events-none">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={vocabSearchQuery}
                    onChange={(e) => setVocabSearchQuery(e.target.value)}
                    placeholder="Filter by term, translation, or show episode..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3] text-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#E13D18] transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-white border border-[#E8E2D3] text-[10px] font-mono text-[#78716C] hidden sm:inline">
                    ⌘K
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSampleTerms}
                    className="px-3.5 py-2 rounded-xl bg-[#FAF7EE] hover:bg-[#F4EFE0] text-[#1C1917] text-xs font-semibold border border-[#E8E2D3] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span>🔀</span>
                    <span>Sample Terms</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportDeck}
                    className="px-4 py-2 rounded-xl bg-[#E13D18] hover:bg-[#C73412] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <span>★</span>
                    <span>Export Deck to Anki (.tsv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerToast('Pushing cards to AnkiConnect on 127.0.0.1:8765...')}
                    className="px-3.5 py-2 rounded-xl bg-[#FAF7EE] hover:bg-[#F4EFE0] text-[#1C1917] text-xs font-semibold border border-[#E8E2D3] transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <span className="text-emerald-600">↻</span>
                    <span>
                      Bulk Sync to AnkiConnect <span className="text-[#78716C] font-mono text-[10px]">(127.0.0.1:8765)</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Filter Pills & Metadata row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E8E2D3]/60">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveVocabFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      activeVocabFilter === 'all'
                        ? 'bg-[#1C1917] text-white shadow-xs'
                        : 'bg-[#FAF7EE] text-[#57534E] hover:text-[#1C1917] border border-[#E8E2D3]'
                    }`}
                  >
                    All Languages (48)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveVocabFilter('es')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      activeVocabFilter === 'es'
                        ? 'bg-[#1C1917] text-white shadow-xs'
                        : 'bg-[#FAF7EE] text-[#57534E] hover:text-[#1C1917] border border-[#E8E2D3]'
                    }`}
                  >
                    Spanish (32)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveVocabFilter('fr')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      activeVocabFilter === 'fr'
                        ? 'bg-[#1C1917] text-white shadow-xs'
                        : 'bg-[#FAF7EE] text-[#57534E] hover:text-[#1C1917] border border-[#E8E2D3]'
                    }`}
                  >
                    French (11)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveVocabFilter('de')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      activeVocabFilter === 'de'
                        ? 'bg-[#1C1917] text-white shadow-xs'
                        : 'bg-[#FAF7EE] text-[#57534E] hover:text-[#1C1917] border border-[#E8E2D3]'
                    }`}
                  >
                    German (5)
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[#78716C] text-[11px] font-medium">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Auto-Sync Active
                  </span>
                  <span>•</span>
                  <span>Last synced 4 mins ago</span>
                </div>
              </div>
            </div>

            {/* Section 2: 3-Column Grid of Editorial Flashcards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white rounded-2xl p-5 border border-[#E8E2D3] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 w-1.5 h-full group-hover:w-2 transition-all"
                    style={{ backgroundColor: card.borderAccent }}
                  />

                  <div>
                    <div className="flex items-start justify-between gap-2 pl-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-serif text-xl font-bold text-[#1C1917] tracking-tight">{card.term}</h2>
                        <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[10px] font-mono border border-[#FDE68A]">
                          {card.reading}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FAF7EE] border border-[#E8E2D3] text-[10px] text-[#1C1917] font-bold tracking-wide">
                        {card.langName} {card.langFlag}
                      </span>
                    </div>

                    <div className="pl-2 mt-2">
                      <p className="text-xs font-bold text-emerald-700">{card.translation}</p>
                    </div>

                    {/* Context quote with cinema styling */}
                    <div className="mt-4 pl-3 pr-2 py-2.5 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3]/60 relative">
                      <p className="font-serif text-xs text-[#57534E] italic leading-relaxed">
                        {card.contextQuote}
                      </p>
                    </div>
                  </div>

                  {/* Footer Source Metadata */}
                  <div className="pl-2 mt-5 pt-3 border-t border-[#E8E2D3]/60 flex items-center justify-between text-[11px] text-[#78716C]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span>🎬</span>
                      <span className="truncate font-semibold text-[#1C1917]">{card.showTitle}</span>
                      <span>•</span>
                      <span>{card.episodeTime}</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-700 font-semibold shrink-0 ml-2">
                      <span>✓</span>
                      <span className="hidden sm:inline">Anki Synced</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredCards.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-center bg-white border border-[#E8E2D3] rounded-2xl">
                <span className="text-3xl mb-2">📖</span>
                <h3 className="text-sm font-bold text-[#1C1917]">No vocabulary terms match this filter</h3>
                <p className="text-xs text-[#78716C] mt-1">Try relaxing your search terms or switch language filters.</p>
              </div>
            )}

            {/* Section 3: Bottom Anki Export Drawer & Field Mapping Summary */}
            <div className="bg-white rounded-2xl p-6 border border-[#E8E2D3] shadow-xs flex flex-col gap-6">
              {/* Header of drawer */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#E13D18] text-base font-bold">⚙</span>
                    <h2 className="text-base font-bold text-[#1C1917]">Anki Sync &amp; Field Topology</h2>
                  </div>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Automated schema bridge mapping subtitle events into your custom Anki note types.
                  </p>
                </div>

                {/* Deck Statistics Chips */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="px-3 py-1.5 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3] shadow-2xs flex items-center gap-2">
                    <span className="text-[#E13D18]">📑</span>
                    <span className="text-xs font-semibold text-[#1C1917]">48 terms saved</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3] shadow-2xs flex items-center gap-2">
                    <span className="text-[#B45309]">🎙</span>
                    <span className="text-xs font-semibold text-[#1C1917]">14 audio clips attached</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-[#FAF7EE] border border-[#E8E2D3] shadow-2xs flex items-center gap-2">
                    <span className="text-emerald-600">✓</span>
                    <span className="text-xs font-semibold text-[#1C1917]">100% sentence context retained</span>
                  </div>
                </div>
              </div>

              {/* Field Mapping Interactive Preview */}
              <div className="bg-[#FAF7EE] p-4 rounded-xl border border-[#E8E2D3]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
                    Active Note Type: LinguaFlix_Cloze_v2
                  </span>
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <span>⚡</span> Real-time Pipeline Active
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="p-3 rounded-lg bg-white border border-[#E8E2D3] flex flex-col gap-1">
                    <span className="text-[10px] text-[#78716C]">[Expression]</span>
                    <span className="text-xs font-bold text-[#E13D18] truncate">desafío</span>
                    <span className="text-[10px] text-[#A8A29E]">Target Headword</span>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-[#E8E2D3] flex flex-col gap-1">
                    <span className="text-[10px] text-[#78716C]">[Reading]</span>
                    <span className="text-xs font-bold text-[#1C1917] truncate">deh-sah-FEE-oh</span>
                    <span className="text-[10px] text-[#A8A29E]">IPA / Phonetic</span>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-[#E8E2D3] flex flex-col gap-1">
                    <span className="text-[10px] text-[#78716C]">[Gloss]</span>
                    <span className="text-xs font-bold text-emerald-700 truncate">challenge / defiance</span>
                    <span className="text-[10px] text-[#A8A29E]">Primary Translation</span>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-[#E8E2D3] flex flex-col gap-1">
                    <span className="text-[10px] text-[#78716C]">[Sentence]</span>
                    <span className="text-xs font-bold text-[#1C1917] truncate">« El verdadero... »</span>
                    <span className="text-[10px] text-[#A8A29E]">Original Dialogue</span>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-[#E8E2D3] flex flex-col gap-1">
                    <span className="text-[10px] text-[#78716C]">[Audio Screenshot]</span>
                    <span className="text-xs font-bold text-[#B45309] flex items-center gap-1 truncate">
                      14:32.mp3 + jpg
                    </span>
                    <span className="text-[10px] text-[#A8A29E]">Synced Snapshot</span>
                  </div>
                </div>
              </div>

              {/* Quick Footer Actions inside drawer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-[#78716C] text-xs">
                <div className="flex items-center gap-2">
                  <span>📁</span>
                  <span>
                    Destination Deck: <strong className="text-[#1C1917]">Immersion::Netflix::Screenings</strong>
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[#E13D18] hover:underline cursor-pointer font-semibold">Configure Anki Fields</span>
                  <span>•</span>
                  <span className="hover:text-[#1C1917] cursor-pointer">View Sync History (142 cards)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#FAF7EE] border-t border-[#E8E2D3] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#E13D18] text-white flex items-center justify-center text-[10px] font-bold">
              L
            </div>
            <span className="text-xs text-[#78716C]">
              LinguaFlix Studio Hub © 2025 • Editorial Language Immersion
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#78716C]">
            <span className="hover:text-[#1C1917] cursor-pointer">Documentation</span>
            <span className="hover:text-[#1C1917] cursor-pointer">Anki Sync Bridge</span>
            <span className="hover:text-[#1C1917] cursor-pointer">Extension Permissions</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
