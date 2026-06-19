import type React from 'react';
import { useEffect, useState } from 'react';
import { sendToBackground } from '@/shared/utils/message';
import type { UserSession, UserSettings, ExtensionResponse } from '@/shared/types/extension.types';
import { SUPPORTED_LANGUAGES } from '@/shared/constants/languages';
import type { SupportedLanguage } from '@/shared/constants/languages';
import { trackEvent } from '@/shared/utils/analytics';

type View = 'loading' | 'login' | 'dashboard';

export default function App(): React.ReactElement {
  const [view, setView] = useState<View>('loading');
  const [session, setSession] = useState<UserSession | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    trackEvent('popup_opened').catch(() => {});
    Promise.all([
      sendToBackground({ type: 'GET_USER_SESSION' }),
      sendToBackground({ type: 'GET_SETTINGS' }),
    ])
      .then(([sessionResp, settingsResp]: ExtensionResponse[]) => {
        if (sessionResp.type === 'USER_SESSION') {
          setSession(sessionResp.payload);
          setView(sessionResp.payload ? 'dashboard' : 'login');
        }
        if (settingsResp.type === 'SETTINGS') setSettings(settingsResp.payload);
      })
      .catch(() => setView('login'));
  }, []);

  const handleSignIn = async (): Promise<void> => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setSigningIn(true);
    setError('');
    try {
      const resp = await sendToBackground({ type: 'SIGN_IN', payload: { email, password } });
      if (resp.type === 'USER_SESSION' && resp.payload) {
        setSession(resp.payload);
        setView('dashboard');
        setEmail('');
        setPassword('');
        trackEvent('sign_in_success_ui', { email: resp.payload.email }).catch(() => {});
      } else {
        setError('Sign in failed. Check your email and password.');
      }
    } catch (err) {
      setError('Sign in error. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async (): Promise<void> => {
    trackEvent('sign_out_ui').catch(() => {});
    await sendToBackground({ type: 'SIGN_OUT' });
    setSession(null);
    setView('login');
  };

  const updateLanguagePair = async (source: string, target: string): Promise<void> => {
    const newSettings = { languagePair: { source, target } };
    await sendToBackground({ type: 'UPDATE_SETTINGS', payload: newSettings });
    if (settings) setSettings({ ...settings, ...newSettings });
    trackEvent('language_pair_changed', { source, target }).catch(() => {});
  };

  const toggleTranslation = async (): Promise<void> => {
    if (!settings) return;
    const updated = { showTranslation: !settings.showTranslation };
    await sendToBackground({ type: 'UPDATE_SETTINGS', payload: updated });
    setSettings({ ...settings, ...updated });
    trackEvent('translation_toggled', { showTranslation: !settings.showTranslation }).catch(() => {});
  };

  return (
    <div className="flex flex-col w-[360px] min-h-[480px] bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm select-none">L</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-none tracking-tight">LinguaFlix</h1>
          <p className="text-xs text-gray-500 mt-0.5">Language learning for Netflix</p>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 flex flex-col px-4 py-4 gap-4">
        {view === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        )}

        {view === 'login' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 bg-brand-950 rounded-2xl flex items-center justify-center">
              <span className="text-brand-500 text-3xl select-none">🎬</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">Sign in to get started</p>
              <p className="text-xs text-gray-500 mt-1">
                Dual subtitles and word translation for Netflix
              </p>
            </div>
            <div className="w-full space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={signingIn}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-brand-500 disabled:opacity-50"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={signingIn}
                onKeyPress={(e) => e.key === 'Enter' && handleSignIn()}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-brand-500 disabled:opacity-50"
              />
              {error && <p className="text-xs text-red-400 text-center">{error}</p>}
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className="w-full bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {signingIn ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </div>
        )}

        {view === 'dashboard' && session && settings && (
          <div className="flex flex-col gap-4">
            {/* User info */}
            <div className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-400 truncate">{session.email}</span>
              <button
                onClick={handleSignOut}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors ml-2 shrink-0"
              >
                Sign out
              </button>
            </div>

            {/* Translation toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Translation</span>
              <button
                onClick={toggleTranslation}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.showTranslation ? 'bg-brand-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.showTranslation ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Language pair */}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-300">Language pair</span>
              <div className="flex items-center gap-2">
                <select
                  value={settings.languagePair.source}
                  onChange={(e) =>
                    updateLanguagePair(e.target.value, settings.languagePair.target)
                  }
                  className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-brand-500"
                >
                  {SUPPORTED_LANGUAGES.filter((l: SupportedLanguage) => l.code !== settings.languagePair.target).map(
                    (lang: SupportedLanguage) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.nativeName}
                      </option>
                    ),
                  )}
                </select>
                <span className="text-gray-500">→</span>
                <select
                  value={settings.languagePair.target}
                  onChange={(e) =>
                    updateLanguagePair(settings.languagePair.source, e.target.value)
                  }
                  className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-brand-500"
                >
                  {SUPPORTED_LANGUAGES.filter((l: SupportedLanguage) => l.code !== settings.languagePair.source).map(
                    (lang: SupportedLanguage) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.nativeName}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            {/* Hint */}
            <p className="text-xs text-gray-600 text-center mt-2">
              Open Netflix and start watching to see dual subtitles.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 py-3 border-t border-gray-800">
        <p className="text-xs text-gray-600 text-center">v{chrome.runtime.getManifest().version}</p>
      </footer>
    </div>
  );
}
