import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Bookmark,
  Check,
  Sliders,
  ChevronLeft,
  Maximize2,
  VolumeX,
} from 'lucide-react';
import { getSettings, saveWord } from '@/shared/utils/storage';
import type { UserSettings } from '@/shared/types/extension.types';

interface SubtitleWord {
  word: string;
  reading?: string;
  pos?: string;
  level?: string;
  translation: string;
  secondaryDef?: string;
  collocation?: string;
}

interface DialogueScene {
  id: string;
  showTitle: string;
  episodeTitle: string;
  timecode: string;
  words: SubtitleWord[];
  secondaryTranslation: string;
  audioLang: string;
}

const SCENES: DialogueScene[] = [
  {
    id: '1',
    showTitle: 'La Casa de Papel',
    episodeTitle: 'S01:E04 "El Caballo de Troya"',
    timecode: '14:32',
    audioLang: 'Español (Castilian) • 5.1 Spatial Audio',
    words: [
      { word: 'Este', pos: 'PRON', level: 'A1', translation: 'This', secondaryDef: 'referring to a specific thing close at hand' },
      { word: 'es', pos: 'VERB', level: 'A1', translation: 'is', secondaryDef: 'third-person singular present of ser' },
      { word: 'el', pos: 'ARTICLE', level: 'A1', translation: 'the', secondaryDef: 'masculine definite article' },
      { word: 'verdadero', pos: 'ADJ', level: 'B1', translation: 'real / true / genuine', secondaryDef: 'actual, authentic rather than apparent', collocation: '« amor verdadero » true love' },
      {
        word: 'desafío',
        reading: 'deh-sah-FEE-oh',
        pos: 'NOUN • MASC',
        level: 'B2 Intermediate',
        translation: 'challenge / defiance / dare',
        secondaryDef: 'difficult undertaking requiring concentrated effort or courage.',
        collocation: '« aceptar el desafío » to accept / rise to the challenge',
      },
      { word: 'para', pos: 'PREP', level: 'A1', translation: 'for / towards', secondaryDef: 'indicating recipient or destination' },
      { word: 'el', pos: 'ARTICLE', level: 'A1', translation: 'the', secondaryDef: 'masculine definite article' },
      { word: 'equipo.', pos: 'NOUN', level: 'A2', translation: 'team / squad / equipment', secondaryDef: 'group of people organized for a task' },
    ],
    secondaryTranslation: 'This is the real challenge for the entire team.',
  },
  {
    id: '2',
    showTitle: 'Lupin',
    episodeTitle: 'S02:E01 "Chapitre 6"',
    timecode: '08:45',
    audioLang: 'Français (Parisian) • 5.1 Spatial Audio',
    words: [
      { word: 'C\'est', pos: 'PRON', level: 'A1', translation: 'It is / That is' },
      { word: 'un', pos: 'ARTICLE', level: 'A1', translation: 'a / an' },
      { word: 'voyage', pos: 'NOUN', level: 'A2', translation: 'journey / trip' },
      {
        word: 'merveilleux',
        reading: 'mɛʁ.vɛ.jø',
        pos: 'ADJ • MASC',
        level: 'B2 Intermediate',
        translation: 'marvelous / wonderful',
        secondaryDef: 'inspiring wonder or great admiration.',
        collocation: '« un monde merveilleux » a wonderful world',
      },
      { word: 'à', pos: 'PREP', level: 'A1', translation: 'at / through / to' },
      { word: 'travers', pos: 'NOUN', level: 'B1', translation: 'across / through' },
      { word: 'le', pos: 'ARTICLE', level: 'A1', translation: 'the' },
      { word: 'temps.', pos: 'NOUN', level: 'A1', translation: 'time / weather' },
    ],
    secondaryTranslation: 'It is a marvelous journey across time.',
  },
];

export function NetflixSimulator(): React.ReactElement {
  const [settings, setSettingsState] = useState<UserSettings | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(4); // default on 'desafío'
  const [isBlurred, setIsBlurred] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [autoPaused, setAutoPaused] = useState(false);
  const [savedActiveWord, setSavedActiveWord] = useState(false);
  const [toastNote, setToastNote] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scene = SCENES[currentSceneIndex] || SCENES[0];
  const activeWord = activeWordIndex !== null ? scene.words[activeWordIndex] : null;

  useEffect(() => {
    getSettings().then((s) => {
      setSettingsState(s);
      setIsBlurred(s.blurSecondaryUntilHover ?? true);
    });
  }, []);

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if focus is on an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
        setAutoPaused(false);
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setIsBlurred((b) => !b);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        showNotification('Replaying current subtitle line [14:32]');
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        showNotification('Jumped -3s backward');
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        showNotification('Jumped +3s forward');
      } else if (e.key === 'Escape') {
        setActiveWordIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showNotification = (msg: string) => {
    setToastNote(msg);
    setTimeout(() => {
      setToastNote((curr) => (curr === msg ? null : curr));
    }, 2400);
  };

  const handleWordClick = (index: number) => {
    if (activeWordIndex === index) {
      setActiveWordIndex(null);
      setAutoPaused(false);
    } else {
      setActiveWordIndex(index);
      setSavedActiveWord(false);
      if (settings?.autoPauseOnHover ?? true) {
        setIsPlaying(false);
        setAutoPaused(true);
      }
    }
  };

  const handleSaveToAnki = async () => {
    if (!activeWord) return;
    await saveWord({
      word: activeWord.word,
      reading: activeWord.reading || '',
      translation: activeWord.translation,
      contextSentence: scene.words.map((w) => w.word).join(' '),
    });
    setSavedActiveWord(true);
    showNotification(`Saved "${activeWord.word}" to Anki Spanish deck!`);
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
    setAutoPaused(false);
  };

  return (
    <div
      ref={containerRef}
      id="netflix-video-viewport"
      className="relative w-full rounded-2xl overflow-hidden bg-black text-white shadow-2xl border border-[#E8E2D3] select-none flex flex-col font-sans aspect-video max-h-[640px]"
    >
      {/* Toast Overlay */}
      {toastNote && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1C1917]/95 border border-[#E8E2D3]/40 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{toastNote}</span>
        </div>
      )}

      {/* Cinematic Movie Still Scene Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Cinematic bank heist / thriller image background */}
        <div
          className="w-full h-full bg-cover bg-center filter brightness-[0.88] contrast-[1.05]"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCxsO9VtAh3uexHdKNs0tJ7Q0zY3Udss01VOltMri-IuEaRwqvhp5n26OcLi4jOHy9A2xZjbeDqeXGTvfceSGOYKx25-xc1GFHat2_cWSTmZyxaZVoLTzFYiY66oocWQQGp74aH2sPJYJsrCnukX9jT2DELOq-YjFEpf9CEmwTijULQnRwrA_WQ2hHNCBK_d-Y_5HSexhRRiAhCRLDxwkoJMpPIPJ9YPrJVLDU8lTRIAPA0zS_vJV_U6Q')`,
          }}
        />
        {/* Vignettes & Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/75 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* TOP BAR OVERLAY */}
      <header className="absolute top-0 inset-x-0 z-30 px-6 py-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Left: Back Arrow & Show Metadata */}
        <div className="flex items-center space-x-4">
          <button
            type="button"
            className="text-white hover:text-gray-300 transition p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
            title="Back to Netflix Browse"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2.5">
              <h1 className="text-base font-bold text-white tracking-tight drop-shadow-md">{scene.showTitle}</h1>
              <span className="text-zinc-400 font-medium">•</span>
              <span className="text-zinc-200 text-xs font-medium">{scene.episodeTitle}</span>
            </div>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="px-1.5 py-0.2 text-[10px] font-semibold border border-zinc-500/60 rounded text-zinc-300">
                16+
              </span>
              <span className="px-1.5 py-0.2 text-[10px] font-bold border border-zinc-400/50 rounded text-zinc-200 tracking-wider">
                4K ULTRA HD
              </span>
              <span className="px-1.5 py-0.2 text-[10px] font-semibold border border-zinc-500/60 rounded text-zinc-300">
                Spatial Audio 5.1
              </span>
            </div>
          </div>
        </div>

        {/* Right: LinguaFlix Active Immersion Pill */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#E13D18]/50 shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E13D18] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E13D18]" />
            </span>
            <span className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
              LinguaFlix Pro <span className="text-zinc-500">|</span>{' '}
              <span className="text-orange-300 font-medium">
                {autoPaused ? 'Hover Paused ⏸' : 'Active Immersion'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setCurrentSceneIndex((prev) => (prev === 0 ? 1 : 0))}
              className="text-zinc-400 hover:text-white transition ml-1 cursor-pointer"
              title="Switch Dialogue Scene (Spanish / French)"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* MINIMALIST FLOATING HOTKEY GUIDE (Top Right) */}
      <aside className="absolute top-20 right-6 z-20 hidden md:flex items-center space-x-3 px-3 py-1 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 text-[11px] text-zinc-300">
        <div className="flex items-center space-x-1">
          <kbd className="bg-white/15 px-1 py-0.2 rounded text-white font-mono text-[10px]">A</kbd>
          <span>-3s</span>
        </div>
        <span className="text-zinc-600">•</span>
        <div className="flex items-center space-x-1">
          <kbd className="bg-white/15 px-1 py-0.2 rounded text-white font-mono text-[10px]">S</kbd>
          <span>Replay line</span>
        </div>
        <span className="text-zinc-600">•</span>
        <div className="flex items-center space-x-1">
          <kbd className="bg-white/15 px-1 py-0.2 rounded text-white font-mono text-[10px]">D</kbd>
          <span>+3s</span>
        </div>
        <span className="text-zinc-600">•</span>
        <div className="flex items-center space-x-1">
          <kbd className="bg-white/15 px-1 py-0.2 rounded text-white font-mono text-[10px]">H</kbd>
          <span>Toggle blur</span>
        </div>
        <span className="text-zinc-600">•</span>
        <div className="flex items-center space-x-1">
          <kbd className="bg-white/15 px-1 py-0.2 rounded text-white font-mono text-[10px]">Space</kbd>
          <span>Pause</span>
        </div>
      </aside>

      {/* SUBTITLE & DEFINITION SYSTEM (Positioned in Lower-Third) */}
      <div className="relative z-40 mt-auto mb-16 flex flex-col items-center justify-center w-full px-4 pointer-events-auto">
        {/* WORD DEFINITION TOOLTIP CARD (FLOATING POPOVER) */}
        {activeWord && (
          <div
            className="relative w-[340px] bg-[#FFFDF8] text-[#1C1917] rounded-2xl shadow-2xl border border-[#E8E2D3] p-4 mb-3.5 transform transition duration-200 pointer-events-auto text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tether Arrow Pointing Down to Active Word */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#FFFDF8] border-b border-r border-[#E8E2D3] rotate-45" />

            {/* Card Header: Headword, Phonetics, POS, CEFR */}
            <div className="flex items-start justify-between border-b border-stone-200/80 pb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl font-bold tracking-tight text-[#1C1917] leading-none">
                    {activeWord.word.replace(/[.,]/g, '')}
                  </h3>
                  {activeWord.reading && (
                    <button
                      type="button"
                      onClick={() => showNotification(`Pronouncing: "${activeWord.reading}"`)}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#FEF3C7] text-[#B45309] rounded-full text-xs font-semibold hover:bg-amber-200 transition cursor-pointer"
                      title="Listen to pronunciation"
                    >
                      <Volume2 className="w-3 h-3 text-[#B45309]" />
                      <span className="tracking-wide">{activeWord.reading}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="px-2 py-0.2 bg-stone-100 border border-stone-200 text-stone-600 rounded text-[10px] font-bold tracking-wider uppercase">
                    {activeWord.pos || 'VOCAB'}
                  </span>
                  {activeWord.level && (
                    <span className="px-2 py-0.2 bg-sky-50 border border-sky-200 text-sky-800 rounded text-[10px] font-bold tracking-tight">
                      {activeWord.level}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center text-stone-400">
                <span className="text-[11px] font-mono font-medium text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                  #{scene.timecode}
                </span>
              </div>
            </div>

            {/* Middle Section: Definitions & Collocation */}
            <div className="py-2.5 space-y-1.5 text-left">
              <div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-xs font-bold text-emerald-700">1.</span>
                  <p className="text-sm font-bold text-emerald-700 leading-tight">{activeWord.translation}</p>
                </div>
                {activeWord.secondaryDef && (
                  <p className="text-xs text-stone-600 pl-4 mt-0.5 leading-snug">
                    2. {activeWord.secondaryDef}
                  </p>
                )}
              </div>

              {activeWord.collocation && (
                <div className="pl-3 pt-1 border-l-2 border-amber-400 text-xs text-stone-700 bg-amber-50/50 py-1 pr-2 rounded-r">
                  <span className="font-medium text-stone-800 italic">{activeWord.collocation}</span>
                </div>
              )}
            </div>

            {/* Context Snapshot Badge */}
            <div className="flex items-center space-x-2 bg-[#FAF7EE] border border-[#E8E2D3] rounded-lg px-2.5 py-1.5 my-1 text-[11px] text-stone-600">
              <span className="text-xs">🎬</span>
              <span className="truncate">Auto-captures {scene.showTitle} synchronized audio + video frame</span>
            </div>

            {/* Card Footer Actions: 1-Click Anki Deck Sync */}
            <div className="mt-2.5 pt-2 border-t border-stone-200/80 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSaveToAnki}
                className="flex items-center space-x-2 px-3 py-1.5 bg-[#E13D18] hover:bg-[#C73412] text-white rounded-lg shadow-xs font-semibold text-xs transition duration-150 cursor-pointer"
              >
                {savedActiveWord ? <Check className="w-3.5 h-3.5 text-white" /> : <Bookmark className="w-3.5 h-3.5 text-amber-200" />}
                <span>{savedActiveWord ? 'Saved in Deck ✓' : 'Save to Anki Deck'}</span>
                <span className="text-[10px] text-orange-200 bg-black/20 px-1 py-0.2 rounded font-mono">1-Click</span>
              </button>
              <span className="text-[11px] text-stone-400">
                Press <kbd className="font-mono bg-stone-100 border border-stone-200 px-1 rounded text-stone-600">Esc</kbd> to close
              </span>
            </div>
          </div>
        )}

        {/* PRIMARY & SECONDARY DUAL SUBTITLE BAR */}
        <section className="relative bg-black/88 backdrop-blur-xl border border-white/15 rounded-2xl px-6 py-3.5 shadow-2xl flex flex-col items-center text-center w-auto max-w-3xl select-text">
          {/* Line 1: Primary Spoken Dialogue with Interactive Clickable Word Chips */}
          <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xl sm:text-2xl font-medium tracking-wide text-white">
            {scene.words.map((item, idx) => {
              const isWordActive = activeWordIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleWordClick(idx)}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    isWordActive
                      ? 'bg-[#FEF3C7] text-[#1C1917] font-bold shadow-sm border-b-2 border-[#E13D18] ring-2 ring-[#E13D18]/40'
                      : 'hover:bg-white/20 text-white/95 hover:text-white'
                  }`}
                  title={`Click to inspect: "${item.word}"`}
                >
                  {item.word}
                </button>
              );
            })}
          </div>

          {/* Line 2: Secondary Translated Subtitle (with Shadowing Blur Mode) */}
          <div className="mt-2 flex items-center justify-center space-x-3 text-sm font-normal tracking-wide text-amber-100/90">
            <span
              onClick={() => setIsBlurred(!isBlurred)}
              className={`cursor-pointer transition-all select-none hover:text-amber-200 ${
                isBlurred ? 'filter blur-[4.5px] hover:filter-none' : ''
              }`}
              title="Hover or click to toggle blur"
            >
              {scene.secondaryTranslation}
            </span>

            {/* Shadowing Hint Badge */}
            <span
              onClick={() => setIsBlurred(!isBlurred)}
              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-full text-[10px] text-zinc-300 font-mono cursor-pointer transition"
              title="Press H to toggle blur"
            >
              <span>[Press H or hover]</span>
            </span>
          </div>
        </section>
      </div>

      {/* BOTTOM MEDIA CONTROLS OVERLAY (Netflix Scrubber & Chrome) */}
      <footer className="absolute bottom-0 inset-x-0 z-30 px-6 pb-4 pt-10 bg-gradient-to-t from-black/95 via-black/75 to-transparent pointer-events-auto flex flex-col gap-2">
        {/* Scrubber Row */}
        <div
          onClick={() => showNotification('Seeked timestamp in video timeline')}
          className="group relative w-full flex items-center cursor-pointer py-1"
        >
          <div className="w-full h-1.5 bg-white/25 rounded-full overflow-hidden relative group-hover:h-2 transition-all">
            <div className="h-full bg-white/45 w-[48%] absolute left-0 top-0 rounded-full" />
            <div className="h-full bg-[#E50914] w-[30.2%] absolute left-0 top-0 rounded-full" />
          </div>
          <div className="absolute left-[30.2%] w-3.5 h-3.5 bg-[#E50914] rounded-full -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform shadow-md" />
        </div>

        {/* Controls Row: Play, Rewind, Volume, Time, LinguaFlix Button */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Controls */}
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="hover:text-red-500 transition p-1 cursor-pointer"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button
              type="button"
              onClick={() => showNotification('Rewound 10s')}
              className="hover:text-zinc-300 transition cursor-pointer"
              title="Rewind 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => showNotification('Fast-forwarded 10s')}
              className="hover:text-zinc-300 transition cursor-pointer"
              title="Fast Forward 10s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center space-x-2 group">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="hover:text-zinc-300 transition cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const newVol = Math.round((clickX / rect.width) * 100);
                  setVolume(newVol);
                }}
                className="w-16 h-1 bg-zinc-600 rounded-full cursor-pointer relative"
              >
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: isMuted ? '0%' : `${volume}%` }}
                />
              </div>
            </div>

            {/* Time Readout */}
            <div className="font-mono text-zinc-300 text-[11px]">
              <span>14:32</span> <span className="text-zinc-500">/</span> <span>48:10</span>
            </div>

            <span className="hidden lg:inline-block text-[11px] text-zinc-400 border-l border-zinc-700 pl-3">
              {scene.showTitle} • {scene.episodeTitle}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setCurrentSceneIndex((prev) => (prev === 0 ? 1 : 0))}
              className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded border border-white/20 text-[10px] font-semibold transition cursor-pointer"
              title="Switch Dialogue Language (Spanish / French)"
            >
              {scene.audioLang.includes('Español') ? 'Audio: Spanish 🇪🇸' : 'Audio: French 🇫🇷'}
            </button>

            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white/10 rounded border border-white/20">
              1.0x
            </span>

            {/* LinguaFlix Quick Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setActiveWordIndex(activeWordIndex === null ? 4 : null);
                showNotification('LinguaFlix dictionary overlay toggled');
              }}
              className="relative p-1 rounded-full bg-[#E13D18] hover:bg-[#C73412] transition shadow-lg cursor-pointer"
              title="LinguaFlix In-Video Extension Active"
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-xs font-sans">
                L
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) {
                  containerRef.current?.requestFullscreen?.();
                } else {
                  document.exitFullscreen?.();
                }
              }}
              className="hover:text-zinc-300 transition cursor-pointer p-1"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
