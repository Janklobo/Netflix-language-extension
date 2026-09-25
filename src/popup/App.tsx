import type React from 'react';
import { useEffect, useState } from 'react';
import { sendToBackground } from '@/shared/utils/message';
import type { UserSession, UserSettings, ExtensionResponse, SavedWord, LearningPreset } from '@/shared/types/extension.types';
import { exportAnkiTsv } from '@/shared/utils/storage';
import { SUPPORTED_LANGUAGES, SOURCE_LANGUAGES } from '@/shared/constants/languages';

export default function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'presets' | 'controls' | 'saved'>('presets');
  const [session, setSession] = useState<UserSession | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    languagePair: { source: 'auto', target: 'en' },
    targetLanguage: 'es',
    nativeLanguage: 'en',
    subtitleMode: 'double',
    showOriginal: true,
    fontSize: 'medium',
    position: 'below',
    opacity: 85,
    autoTokenize: true,
    autoPauseOnHover: true,
    showFurigana: false,
    learningPreset: 'active',
    blurSecondaryUntilHover: false,
    smartCollisionAvoidance: true,
    keyboardShortcutsEnabled: true,
  });

  const [savedWords, setSavedWords] = useState<SavedWord[]>([
    {
      id: '1',
      word: 'desafío',
      reading: 'deh-sah-FEE-oh',
      translation: 'challenge / defiance',
      contextSentence: 'Es un gran desafío para todos nosotros.',
      timestamp: Date.now() - 3600000,
    },
    {
      id: '2',
      word: 'merveilleux',
      reading: 'mɛʁ.vɛ.jø',
      translation: 'marvelous / wonderful',
      contextSentence: 'C\'est un voyage merveilleux que nous entreprenons.',
      timestamp: Date.now() - 7200000,
    },
    {
      id: '3',
      word: '懐かしい',
      reading: 'na-tsu-ka-shii',
      translation: 'nostalgic / dear memory',
      contextSentence: '本当に懐かしい風景ですね。',
      timestamp: Date.now() - 10800000,
    },
  ]);

  const [copiedAnki, setCopiedAnki] = useState(false);

  useEffect(() => {
    Promise.all([
      sendToBackground({ type: 'GET_USER_SESSION' }),
      sendToBackground({ type: 'GET_SETTINGS' }),
      sendToBackground({ type: 'GET_SAVED_WORDS' }),
    ])
      .then(([sessionResp, settingsResp, wordsResp]: ExtensionResponse[]) => {
        if (sessionResp?.type === 'USER_SESSION' && sessionResp.payload) {
          setSession(sessionResp.payload);
        }
        if (settingsResp?.type === 'SETTINGS' && settingsResp.payload) {
          setSettings((prev) => ({ ...prev, ...settingsResp.payload }));
        }
        if (wordsResp?.type === 'SAVED_WORDS' && Array.isArray(wordsResp.payload) && wordsResp.payload.length > 0) {
          setSavedWords(wordsResp.payload);
        }
      })
      .catch(() => {
        // Safe fallback to defaults in preview mode
      });
  }, []);

  const handleUpdateSetting = (partial: Partial<UserSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    sendToBackground({ type: 'UPDATE_SETTINGS', payload: updated }).catch(() => {});
  };

  const handleApplyPreset = (preset: LearningPreset) => {
    let partial: Partial<UserSettings> = { learningPreset: preset };
    if (preset === 'casual') {
      partial = {
        learningPreset: 'casual',
        autoPauseOnHover: false,
        blurSecondaryUntilHover: false,
      };
    } else if (preset === 'active') {
      partial = {
        learningPreset: 'active',
        autoPauseOnHover: true,
        blurSecondaryUntilHover: false,
      };
    } else if (preset === 'listening') {
      partial = {
        learningPreset: 'listening',
        autoPauseOnHover: true,
        blurSecondaryUntilHover: true,
      };
    }
    handleUpdateSetting(partial);
  };

  const handleExportAnki = async () => {
    try {
      await exportAnkiTsv();
      setCopiedAnki(true);
      setTimeout(() => setCopiedAnki(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleDeleteWord = async (id: string) => {
    setSavedWords((prev) => prev.filter((w) => w.id !== id));
    sendToBackground({ type: 'DELETE_SAVED_WORD', payload: { id } }).catch(() => {});
  };

  return (
    <div className="w-[360px] h-[520px] bg-[#FAF7EE] text-[#1C1917] font-sans antialiased flex flex-col overflow-hidden relative select-none border border-[#E8E2D3] shadow-2xl rounded-2xl">
      {/* 1. HEADER SECTION */}
      <header className="px-4 pt-3.5 pb-3 border-b border-[#E8E2D3] bg-[#FAF7EE]/90 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Brand Icon: 28px rounded burnt-orange square with white bold L */}
          <div className="w-7 h-7 rounded-lg bg-[#E13D18] flex items-center justify-center shadow-sm shadow-[#E13D18]/20">
            <span className="text-white font-outfit font-bold text-base leading-none tracking-tight">L</span>
          </div>

          <div>
            <div className="flex items-center gap-1.5 leading-tight">
              <h1 className="font-outfit font-bold text-[15px] tracking-tight text-[#1C1917]">LinguaFlix</h1>
              <span className="text-[9px] font-outfit font-bold px-1.5 py-0.2 rounded-full bg-[#F4EFE0] border border-[#E5DEC9] text-[#E13D18] leading-normal uppercase tracking-wider">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-[#78716C] font-medium">Universal Netflix Immersion</p>
          </div>
        </div>

        {/* Right Header: Status + Sign Out */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
          </span>
          <button
            title={session ? 'Signed In' : 'Settings / Account'}
            className="w-7 h-7 rounded-lg hover:bg-[#F4EFE0] flex items-center justify-center text-[#57534E] transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* 2. SEGMENTED TABS (Charcoal Pill Switcher) */}
      <div className="px-3 py-2.5 bg-[#FAF7EE] shrink-0 border-b border-[#E8E2D3]/70">
        <div className="bg-[#F4EFE0]/90 p-1 rounded-xl flex items-center gap-1 border border-[#E8E2D3]/80">
          <button
            id="tab-btn-presets"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-[#1C1917] text-white shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-white/50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Presets
          </button>
          <button
            id="tab-btn-controls"
            onClick={() => setActiveTab('controls')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === 'controls'
                ? 'bg-[#1C1917] text-white shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-white/50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Controls
          </button>
          <button
            id="tab-btn-saved"
            onClick={() => setActiveTab('saved')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-[#1C1917] text-white shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-white/50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Saved ({savedWords.length})
          </button>
        </div>
      </div>

      {/* SCROLLABLE CONTENT BODY */}
      <main className="flex-1 overflow-y-auto px-3.5 py-2.5 space-y-3">
        {/* ================= TAB 1: PRESETS ================= */}
        {activeTab === 'presets' && (
          <div id="tab-presets" className="space-y-3 block">
            {/* Language Pair Card */}
            <div className="bg-white rounded-xl p-2.5 border border-[#E8E2D3] shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] mb-1.5 flex items-center justify-between">
                <span>TARGET DIALOGUE</span>
                <span className="text-[#A8A29E] font-medium">Auto-detected audio</span>
              </div>
              <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-1.5">
                <div className="bg-[#FAF7EE] border border-[#E8E2D3] rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                  <div className="w-full">
                    <span className="text-[10px] text-[#78716C] block leading-tight">Audio / Sub 1</span>
                    <select
                      value={settings.languagePair?.source || 'auto'}
                      onChange={(e) => {
                        const newSource = e.target.value;
                        handleUpdateSetting({
                          languagePair: { source: newSource, target: settings.languagePair?.target || 'en' },
                          targetLanguage: newSource,
                        });
                      }}
                      className="text-xs font-semibold text-[#1C1917] bg-transparent border-none p-0 focus:outline-none cursor-pointer w-full"
                    >
                      {SOURCE_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code} className="bg-white text-[#1C1917]">
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="w-6 h-6 rounded-full bg-[#F4EFE0] flex items-center justify-center text-[#78716C] border border-[#E8E2D3]">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>

                <div className="bg-[#FAF7EE] border border-[#E8E2D3] rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                  <div className="w-full">
                    <span className="text-[10px] text-[#78716C] block leading-tight">Translation Sub 2</span>
                    <select
                      value={settings.languagePair?.target || 'en'}
                      onChange={(e) => {
                        const newTarget = e.target.value;
                        handleUpdateSetting({
                          languagePair: { source: settings.languagePair?.source || 'auto', target: newTarget },
                          nativeLanguage: newTarget,
                        });
                      }}
                      className="text-xs font-semibold text-[#1C1917] bg-transparent border-none p-0 focus:outline-none cursor-pointer w-full"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code} className="bg-white text-[#1C1917]">
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Mode Header */}
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">IMMERSION MODE</span>
              <span className="text-[10px] text-[#E13D18] font-semibold cursor-pointer hover:underline">Quick Presets ⚡</span>
            </div>

            {/* Preset Cards */}
            <div className="space-y-2">
              {/* Option A: Casual Watcher */}
              <div
                onClick={() => handleApplyPreset('casual')}
                className={`bg-white hover:bg-white/80 transition-all rounded-xl p-2.5 border shadow-xs cursor-pointer flex items-start gap-2.5 ${
                  settings.learningPreset === 'casual'
                    ? 'border-2 border-[#E13D18] shadow-md shadow-[#E13D18]/5'
                    : 'border-[#E8E2D3]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0 mt-0.5 text-emerald-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-[#1C1917]">Casual Watcher</h4>
                      {settings.learningPreset === 'casual' && (
                        <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>
                    {settings.learningPreset === 'casual' ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <span className="text-[9px] font-medium text-[#A8A29E]">Relaxed</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#57534E] leading-snug mt-0.5">
                    Simultaneous dual subtitles for natural, relaxed viewing without video pauses.
                  </p>
                </div>
              </div>

              {/* Option B: Active Immersion (SELECTED STATE) */}
              <div
                onClick={() => handleApplyPreset('active')}
                className={`bg-white rounded-xl p-2.5 border transition-all cursor-pointer flex items-start gap-2.5 ${
                  settings.learningPreset === 'active'
                    ? 'border-2 border-[#E13D18] shadow-md shadow-[#E13D18]/5'
                    : 'border-[#E8E2D3] hover:bg-white/80'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#FDEEE9] border border-[#E13D18]/20 flex items-center justify-center shrink-0 mt-0.5 text-[#E13D18]">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-[#1C1917]">Active Immersion</h4>
                      {settings.learningPreset === 'active' && (
                        <span className="text-[9px] bg-[#E13D18] text-white font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>
                    {settings.learningPreset === 'active' ? (
                      <div className="w-4 h-4 rounded-full bg-[#E13D18] flex items-center justify-center text-white">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <span className="text-[9px] font-medium text-[#A8A29E]">Popular</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#44403C] leading-snug mt-0.5">
                    Video auto-pauses when hovering words, with instant dictionary lookups and hotkeys.
                  </p>
                </div>
              </div>

              {/* Option C: Listening / Shadowing */}
              <div
                onClick={() => handleApplyPreset('listening')}
                className={`bg-white hover:bg-white/80 transition-all rounded-xl p-2.5 border shadow-xs cursor-pointer flex items-start gap-2.5 ${
                  settings.learningPreset === 'listening'
                    ? 'border-2 border-[#E13D18] shadow-md shadow-[#E13D18]/5'
                    : 'border-[#E8E2D3]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200/80 flex items-center justify-center shrink-0 mt-0.5 text-sky-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-[#1C1917]">Listening & Shadowing</h4>
                      {settings.learningPreset === 'listening' && (
                        <span className="text-[9px] bg-sky-600 text-white font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>
                    {settings.learningPreset === 'listening' ? (
                      <div className="w-4 h-4 rounded-full bg-sky-600 flex items-center justify-center text-white">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <span className="text-[9px] font-medium text-[#A8A29E]">Advanced</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#57534E] leading-snug mt-0.5">
                    Secondary subtitle is blurred until cursor hover so your ears do the heavy lifting.
                  </p>
                </div>
              </div>
            </div>

            {/* Subtitle Display Switch */}
            <div className="bg-white rounded-xl p-2.5 border border-[#E8E2D3] shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#1C1917]">Display Method</span>
                <span className="text-[10px] text-[#78716C]">Overlay on Video</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF7EE] rounded-lg border border-[#E8E2D3]">
                <button
                  type="button"
                  onClick={() => handleUpdateSetting({ subtitleMode: 'double' })}
                  className={`py-1 px-2 text-[11px] font-bold rounded-md transition-all text-center cursor-pointer ${
                    settings.subtitleMode === 'double'
                      ? 'bg-[#1C1917] text-white shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F4EFE0]'
                  }`}
                >
                  Dual Subtitles
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateSetting({ subtitleMode: 'click' })}
                  className={`py-1 px-2 text-[11px] font-medium rounded-md transition-all text-center cursor-pointer ${
                    settings.subtitleMode === 'click'
                      ? 'bg-[#1C1917] text-white shadow-xs font-bold'
                      : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F4EFE0]'
                  }`}
                >
                  Click to Translate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: PLAYBACK CONTROLS ================= */}
        {activeTab === 'controls' && (
          <div id="tab-controls" className="space-y-2.5 block">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] pt-0.5">
              PLAYBACK & SUBTITLE BEHAVIOR
            </div>

            {/* Settings Cards */}
            <div className="bg-white rounded-xl divide-y divide-[#E8E2D3] border border-[#E8E2D3] shadow-xs overflow-hidden">
              {/* Auto-pause */}
              <div className="p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[#1C1917]">Auto-Pause on Hover</div>
                  <p className="text-[11px] text-[#78716C] leading-snug">Freezes Netflix video while inspecting words</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateSetting({ autoPauseOnHover: !settings.autoPauseOnHover })}
                  className={`relative inline-flex w-9 h-5 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                    settings.autoPauseOnHover ? 'bg-[#E13D18]' : 'bg-[#E8E2D3]'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                      settings.autoPauseOnHover ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Shadowing Blur */}
              <div className="p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[#1C1917]">Shadowing Blur Mode</div>
                  <p className="text-[11px] text-[#78716C] leading-snug">Blurs English lines until hovered</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateSetting({ blurSecondaryUntilHover: !settings.blurSecondaryUntilHover })}
                  className={`relative inline-flex w-9 h-5 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                    settings.blurSecondaryUntilHover ? 'bg-[#E13D18]' : 'bg-[#E8E2D3]'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                      settings.blurSecondaryUntilHover ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Subtitle Placement */}
              <div className="p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[#1C1917]">Secondary Subtitle Placement</div>
                  <p className="text-[11px] text-[#78716C] leading-snug">Position translation relative to original</p>
                </div>
                <div className="inline-flex rounded-lg border border-[#E8E2D3] p-0.5 bg-[#FAF7EE] text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleUpdateSetting({ position: 'above' })}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      settings.position === 'above'
                        ? 'bg-[#1C1917] text-white shadow-xs font-bold'
                        : 'text-[#57534E] hover:text-[#1C1917]'
                    }`}
                  >
                    Above
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSetting({ position: 'below' })}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      settings.position === 'below'
                        ? 'bg-[#1C1917] text-white shadow-xs font-bold'
                        : 'text-[#57534E] hover:text-[#1C1917]'
                    }`}
                  >
                    Below
                  </button>
                </div>
              </div>

              {/* Font Size Selector */}
              <div className="p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[#1C1917]">Subtitle Size</div>
                  <p className="text-[11px] text-[#78716C] leading-snug">Readability scale for screen size</p>
                </div>
                <div className="inline-flex rounded-lg border border-[#E8E2D3] p-0.5 bg-[#FAF7EE] text-[10px] font-semibold text-[#57534E]">
                  {(['small', 'medium', 'large'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => handleUpdateSetting({ fontSize: sz })}
                      className={`px-2 py-0.5 rounded-md uppercase transition-all cursor-pointer ${
                        settings.fontSize === sz
                          ? 'bg-[#1C1917] text-white font-bold'
                          : 'hover:text-[#1C1917]'
                      }`}
                    >
                      {sz === 'small' ? 'S' : sz === 'medium' ? 'M' : 'L'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hotkeys Card */}
            <div className="bg-white rounded-xl p-3 border border-[#E8E2D3] shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1C1917]">Keyboard Shortcuts</span>
                <span className="text-[10px] text-[#E13D18] font-semibold">Customizable</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-[#FAF7EE] border border-[#E8E2D3] rounded-lg p-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-[#E8E2D3] rounded text-[10px] font-mono font-bold text-[#1C1917] shadow-2xs">
                    A / D
                  </kbd>
                  <span className="text-[10px] block text-[#57534E] mt-1">±3s Jump</span>
                </div>
                <div className="bg-[#FAF7EE] border border-[#E8E2D3] rounded-lg p-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-[#E8E2D3] rounded text-[10px] font-mono font-bold text-[#1C1917] shadow-2xs">
                    S
                  </kbd>
                  <span className="text-[10px] block text-[#57534E] mt-1">Replay Sub</span>
                </div>
                <div className="bg-[#FAF7EE] border border-[#E8E2D3] rounded-lg p-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-[#E8E2D3] rounded text-[10px] font-mono font-bold text-[#1C1917] shadow-2xs">
                    H
                  </kbd>
                  <span className="text-[10px] block text-[#57534E] mt-1">Toggle Blur</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: SAVED VOCABULARY & ANKI ================= */}
        {activeTab === 'saved' && (
          <div id="tab-saved" className="space-y-2.5 block">
            {/* Action Row */}
            <div className="flex items-center justify-between pt-0.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">SAVED PHRASES</span>
                <span className="text-xs font-bold text-[#1C1917] block">{savedWords.length} terms logged</span>
              </div>
              <button
                type="button"
                onClick={handleExportAnki}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#E13D18] hover:bg-[#C73412] text-white text-[11px] font-bold transition-colors shadow-sm shadow-[#E13D18]/20 cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {copiedAnki ? 'Deck Exported!' : 'Export Anki TSV'}
              </button>
            </div>

            {/* Saved Words Cards List */}
            <div className="space-y-2">
              {savedWords.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-2.5 border border-[#E8E2D3] shadow-xs relative group hover:border-[#E13D18]/40 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#1C1917] font-outfit">{item.word}</span>
                      {item.reading && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                          {item.reading}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteWord(item.id)}
                      className="text-[#A8A29E] hover:text-[#E13D18] p-0.5 transition-colors cursor-pointer"
                      title="Remove from deck"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-1 flex items-baseline gap-1 text-xs font-semibold text-emerald-700">
                    <span className="text-[10px] font-normal text-[#A8A29E]">EN:</span>
                    <span>{item.translation}</span>
                  </div>

                  {item.contextSentence && (
                    <div className="mt-1.5 pt-1.5 border-t border-[#F4EFE0] flex items-start gap-1.5 text-[10px] text-[#57534E] italic">
                      <span className="not-italic text-[#A8A29E] shrink-0">🎬</span>
                      <span>
                        &ldquo;
                        {item.contextSentence}
                        &rdquo;
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 6. FOOTER SECTION */}
      <footer className="px-4 py-2 border-t border-[#E8E2D3] bg-[#FAF7EE] flex items-center justify-between text-[11px] shrink-0">
        <div className="flex items-center gap-1.5 text-[#78716C] font-medium">
          <span>LinguaFlix v0.1.0</span>
          <span className="w-1 h-1 rounded-full bg-[#D9D0BE]"></span>
          <span className="text-emerald-700 font-semibold">Synced</span>
        </div>

        <a
          href="https://netflix.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[#E13D18] font-bold hover:text-[#C73412] transition-colors"
        >
          Netflix Ready
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </footer>
    </div>
  );
}
