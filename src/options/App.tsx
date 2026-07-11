import type React from 'react';
import { useEffect, useState } from 'react';
import { sendToBackground } from '@/shared/utils/message';
import type { UserSettings, ExtensionResponse } from '@/shared/types/extension.types';
import { SUPPORTED_LANGUAGES } from '@/shared/constants/languages';
import type { SupportedLanguage } from '@/shared/constants/languages';
import { trackEvent } from '@/shared/utils/analytics';

export default function App(): React.ReactElement {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    trackEvent('options_opened').catch(() => { });
    sendToBackground({ type: 'GET_SETTINGS' })
      .then((resp: ExtensionResponse) => {
        if (resp.type === 'SETTINGS') setSettings(resp.payload);
      })
      .catch(() => { });
  }, []);

  const update = async (patch: Partial<UserSettings>): Promise<void> => {
    if (!settings) return;
    const updated = { ...settings, ...patch };
    setSettings(updated);
    await sendToBackground({ type: 'UPDATE_SETTINGS', payload: patch });
    trackEvent('settings_updated', patch).catch(() => { });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-800">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold select-none">L</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none tracking-tight">LinguaFlix</h1>
            <p className="text-xs text-gray-500 mt-1">Extension Settings</p>
          </div>
          {saved && <span className="ml-auto text-xs text-green-400">Saved</span>}
        </header>

        <div className="flex flex-col gap-8">
          {/* Subtitle Display */}
          <section>
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Subtitle Display</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-sm text-gray-300">Mode</span>
                <div className="flex gap-3">
                  {(['double', 'click'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => update({ subtitleMode: mode })}
                      className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${settings.subtitleMode === mode
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                      {mode === 'double' ? 'Double subtitles' : 'Click-to-translate'}
                    </button>
                  ))}
                </div>
              </div>

              {settings.subtitleMode === 'double' && (
                <>
                  <ToggleRow
                    label="Show original subtitle"
                    value={settings.showOriginal}
                    onChange={(v) => update({ showOriginal: v })}
                  />
                  <ToggleRow
                    label="Tokenize words (click for translation)"
                    value={settings.autoTokenize}
                    onChange={(v) => update({ autoTokenize: v })}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Translation position</span>
                    <div className="flex gap-2">
                      {(['above', 'below'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => update({ position: pos })}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${settings.position === pos
                            ? 'bg-brand-500 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Font size</span>
                    <div className="flex gap-2">
                      {(['small', 'medium', 'large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => update({ fontSize: size })}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${settings.fontSize === size
                            ? 'bg-brand-500 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Opacity: {settings.opacity}%</span>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={settings.opacity}
                      onChange={(e) => update({ opacity: parseInt(e.target.value) })}
                      className="w-32 accent-brand-500"
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Language pair */}
          <section>
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Language Pair</h2>
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500">Learning (source)</label>
                <select
                  value={settings.languagePair.source}
                  onChange={(e) =>
                    update({ languagePair: { ...settings.languagePair, source: e.target.value } })
                  }
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-brand-500"
                >
                  {SUPPORTED_LANGUAGES.map((l: SupportedLanguage) => (
                    <option key={l.code} value={l.code}>
                      {l.name} ({l.nativeName})
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-gray-500 mt-5">→</span>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500">Translate to</label>
                <select
                  value={settings.languagePair.target}
                  onChange={(e) =>
                    update({ languagePair: { ...settings.languagePair, target: e.target.value } })
                  }
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-brand-500"
                >
                  {SUPPORTED_LANGUAGES.map((l: SupportedLanguage) => (
                    <option key={l.code} value={l.code}>
                      {l.name} ({l.nativeName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-brand-500' : 'bg-gray-700'
          }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
      </button>
    </div>
  );
}
