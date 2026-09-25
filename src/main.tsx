import { useState } from 'react';
import ReactDOM from 'react-dom/client';
import '@/options/index.css';
import '@/assets/styles/content.css';
import PopupApp from '@/popup/App';
import OptionsApp from '@/options/App';
import { NetflixSimulator } from '@/components/NetflixSimulator';
import { Tv, Sliders, Smartphone, CheckCircle2, ShieldCheck, Terminal, Download, Layers } from 'lucide-react';

function RootApp() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'popup' | 'options' | 'docs'>('simulator');

  return (
    <div className="min-h-screen bg-[#FAF7EE] text-[#1C1917] flex flex-col font-sans selection:bg-[#E13D18] selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#FAF7EE]/95 backdrop-blur-md border-b border-[#E8E2D3] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#E13D18] rounded-xl flex items-center justify-center font-bold text-white text-base shadow-xs">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-[#1C1917] tracking-tight">LinguaFlix</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#F4EFE0] text-[#E13D18] border border-[#E5DEC9] rounded-full">
                  v0.1.0 MV3
                </span>
              </div>
              <p className="text-xs text-[#78716C] font-medium">Universal bilingual subtitles & vocabulary builder for Netflix</p>
            </div>
          </div>

          {/* Navigation Tabs & Actions */}
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1 bg-[#F4EFE0] p-1 rounded-xl border border-[#E5DEC9] text-xs font-semibold">
              <button
                id="tab-simulator"
                onClick={() => setActiveTab('simulator')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'simulator'
                    ? 'bg-[#1C1917] text-white shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#EBE4D5]'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Netflix Simulator</span>
              </button>
              <button
                id="tab-popup"
                onClick={() => setActiveTab('popup')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'popup'
                    ? 'bg-[#1C1917] text-white shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#EBE4D5]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Extension Popup</span>
              </button>
              <button
                id="tab-options"
                onClick={() => setActiveTab('options')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'options'
                    ? 'bg-[#1C1917] text-white shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#EBE4D5]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Settings Page</span>
              </button>
              <button
                id="tab-docs"
                onClick={() => setActiveTab('docs')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'docs'
                    ? 'bg-[#1C1917] text-white shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#EBE4D5]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Extension Guide</span>
              </button>
            </nav>

            <a
              id="btn-download-dist"
              href="/linguaflix.zip"
              download="linguaflix-extension.zip"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E13D18] hover:bg-[#C93312] text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Extension .ZIP</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'simulator' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#E8E2D3] p-4 rounded-2xl shadow-xs">
              <div>
                <h2 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
                  <Tv className="w-4 h-4 text-[#E13D18]" />
                  Live Netflix Subtitle & Video Player Simulation
                </h2>
                <p className="text-xs text-[#78716C] mt-0.5">
                  Test universal dual subtitles, hover auto-pause, word dictionary popups, and Anki exports in Spanish, French, German, or Japanese.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('popup')}
                  className="text-xs px-3 py-1.5 rounded-xl bg-[#FAF7EE] hover:bg-[#F3EDE0] text-[#1C1917] border border-[#E8E2D3] transition-colors flex items-center gap-1.5 font-semibold cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#E13D18]" />
                  Open Extension Popup
                </button>
                <button
                  onClick={() => setActiveTab('options')}
                  className="text-xs px-3 py-1.5 rounded-xl bg-[#E13D18] hover:bg-[#C93312] text-white transition-colors flex items-center gap-1.5 font-semibold shadow-xs cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Configure Preferences
                </button>
              </div>
            </div>

            <NetflixSimulator />

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-white border border-[#E8E2D3] rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2.5 text-[#E13D18] mb-2">
                  <Layers className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-[#1C1917]">Universal Dual Subtitles</h3>
                </div>
                <p className="text-xs text-[#78716C] leading-relaxed">
                  Renders native original audio captions alongside fluent target translations for any language on Netflix (Spanish, French, German, Japanese, Korean, Italian, etc.).
                </p>
              </div>
              <div className="bg-white border border-[#E8E2D3] rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2.5 text-[#059669] mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-[#1C1917]">Interactive Word Lookups & Anki</h3>
                </div>
                <p className="text-xs text-[#78716C] leading-relaxed">
                  Hover over any subtitle word to inspect instant dictionary definitions, phonetics, and save directly to your downloadable Anki deck with context sentences.
                </p>
              </div>
              <div className="bg-white border border-[#E8E2D3] rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2.5 text-[#0284C7] mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-[#1C1917]">Chrome Manifest V3 Architecture</h3>
                </div>
                <p className="text-xs text-[#78716C] leading-relaxed">
                  Non-intrusive DOM observation, resilient storage persistence in Chrome Local Storage, and zero playback stutter or video desynchronization.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'popup' && (
          <div className="flex flex-col items-center justify-center py-6 gap-6">
            <div className="text-center max-w-md">
              <h2 className="text-lg font-bold text-[#1C1917]">Chrome Extension Popup UI</h2>
              <p className="text-xs text-[#78716C] mt-1">
                Warm butter light design rendered when users click the LinguaFlix icon in the Chrome browser toolbar.
              </p>
            </div>

            {/* Authentically framed extension popup viewport */}
            <div className="relative rounded-2xl shadow-xl p-2 bg-[#EBE4D5] border border-[#DDD5C5]">
              <div className="rounded-xl overflow-hidden bg-[#FAF7EE] w-[360px] min-h-[500px]">
                <PopupApp />
              </div>
            </div>

            <p className="text-xs text-[#A8A29E] font-mono">Chrome extension popup dimensions: 360px × 500px</p>
          </div>
        )}

        {activeTab === 'options' && (
          <div className="w-full -mx-4 sm:-mx-6 lg:-mx-8 -my-8">
            <OptionsApp />
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6 py-4">
            <div className="bg-white border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
              <h2 className="text-lg font-bold text-[#1C1917] flex items-center gap-2">
                <Download className="w-5 h-5 text-[#E13D18]" />
                Deploying & Loading LinguaFlix into Chrome
              </h2>
              <p className="text-sm text-[#78716C] mt-2 leading-relaxed">
                The extension is compiled and ready to be loaded into any Chromium browser (Google Chrome, Microsoft Edge, Brave, Arc, Opera).
              </p>

              <div className="mt-6 flex flex-col gap-4">
                <div className="bg-[#FAF7EE] p-4 rounded-xl border border-[#E8E2D3]">
                  <h3 className="text-sm font-bold text-[#1C1917]">Option A: Download Updated Extension (Instant)</h3>
                  <p className="text-xs text-[#78716C] mt-1">
                    Download the pre-compiled Manifest V3 production bundle directly without building locally.
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <a
                      href="/linguaflix.zip"
                      download="linguaflix-extension.zip"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#E13D18] hover:bg-[#C93312] text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Extension .ZIP (v0.1.0)</span>
                    </a>
                    <span className="text-xs text-[#78716C]">Extract and load the unpacked folder in Chrome.</span>
                  </div>
                </div>

                <div className="bg-[#FAF7EE] p-4 rounded-xl border border-[#E8E2D3]">
                  <h3 className="text-sm font-bold text-[#1C1917]">Option B: Update via Terminal (If using Git locally)</h3>
                  <p className="text-xs text-[#78716C] mt-1">
                    If you cloned this repository locally, pull the latest changes and compile to <code className="text-[#E13D18] bg-[#F4EFE0] px-1 py-0.5 rounded border border-[#E5DEC9]">dist/</code>:
                  </p>
                  <pre className="mt-2 bg-[#1C1917] p-2.5 rounded-lg text-xs font-mono text-[#4ADE80]">
                    git pull && pnpm build
                  </pre>
                </div>

                <div className="bg-[#FAF7EE] p-4 rounded-xl border border-[#E8E2D3]">
                  <h3 className="text-sm font-bold text-[#1C1917]">Step 2: Reload in Chrome</h3>
                  <ol className="text-xs text-[#57534E] mt-2 space-y-1.5 list-decimal list-inside font-medium">
                    <li>Open <code className="text-[#E13D18] font-bold">chrome://extensions</code> in Google Chrome.</li>
                    <li>Ensure <strong>Developer mode</strong> is toggled on in the top-right corner.</li>
                    <li>Click the <strong>Reload (↻)</strong> icon on the LinguaFlix card (or click <strong>Load unpacked</strong> and choose the extracted folder).</li>
                    <li>Return to Netflix and refresh the tab (<code className="text-[#1C1917] font-semibold">Ctrl + R</code> / <code className="text-[#1C1917] font-semibold">F5</code>).</li>
                  </ol>
                </div>

                <div className="bg-[#FAF7EE] p-4 rounded-xl border border-[#E8E2D3]">
                  <h3 className="text-sm font-bold text-[#1C1917]">Extension Manifest V3 Configuration</h3>
                  <div className="mt-2 text-xs text-[#78716C] space-y-1">
                    <div>• <strong>Service Worker</strong>: <code className="text-[#1C1917] font-semibold">src/background/index.ts</code></div>
                    <div>• <strong>Content Script</strong>: <code className="text-[#1C1917] font-semibold">src/content/index.ts</code> (matches <code className="text-[#E13D18]">https://www.netflix.com/*</code>)</div>
                    <div>• <strong>Player Hook</strong>: <code className="text-[#1C1917] font-semibold">src/injected/netflix-player-hook.ts</code></div>
                    <div>• <strong>Permissions</strong>: <code className="text-[#1C1917] font-semibold">storage, identity, alarms</code></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<RootApp />);
}
