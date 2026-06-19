import { sendToBackground } from '@/shared/utils/message';
import { debug } from '@/shared/utils/debug';
import { startObserving, stopObserving } from './subtitle-observer';
import { showTranslation, hideTranslation, removeOverlay } from './subtitle-injector';
import { showWordPopup, renderTokenizedSubtitle, removePopup } from './translation-popup';
import { showBanner, removeBanner } from './degradation-banner';
import { tokenize, isJapanese, getTokenizer } from './word-tokenizer';
import type { UserSettings, ExtensionResponse, TranslationRequest } from '@/shared/types/extension.types';
import type { SubtitleEntry } from '@/shared/types/subtitle.types';
import { initMonitoring, reportError } from '@/shared/utils/monitoring';
import { trackEvent } from '@/shared/utils/analytics';

let settings: UserSettings | null = null;
let lastCurrentTimeMs = 0;
let subtitleTrack: SubtitleEntry[] = [];
const prefetchedIndices = new Set<number>();
// Tracks the subtitle text that was current when a translation request was fired.
// Any response that arrives after the subtitle has already changed is discarded.
let activeSubtitleText = '';

function getEpisodeId(): string {
  const match = window.location.pathname.match(/\/watch\/(\d+)/);
  return match?.[1] ?? 'unknown';
}

function injectPlayerHook(): void {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('src/injected/netflix-player-hook.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
    debug('content', 'Player hook injected');
  } catch (err) {
    debug('content', 'Player hook injection failed:', err);
  }
}

function handleTimeUpdate(currentTimeMs: number): void {
  if (subtitleTrack.length === 0 || !settings) return;

  const episodeId = getEpisodeId();
  // Prefetch upcoming subtitles 30 to 60 seconds ahead
  const prefetchStart = currentTimeMs + 30000;
  const prefetchEnd = currentTimeMs + 60000;

  const toPrefetch = subtitleTrack.filter(
    (sub) =>
      sub.startMs >= prefetchStart &&
      sub.startMs <= prefetchEnd &&
      !prefetchedIndices.has(sub.index)
  );

  if (toPrefetch.length > 0) {
    const requests: TranslationRequest[] = toPrefetch.map((sub) => {
      prefetchedIndices.add(sub.index);
      return {
        text: sub.text,
        sourceLang: settings!.languagePair.source,
        targetLang: settings!.languagePair.target,
        episodeId,
      };
    });

    debug('content', `Prefetching ${requests.length} subtitles in window [${prefetchStart}ms, ${prefetchEnd}ms]`);
    sendToBackground({
      type: 'PREFETCH_TRANSLATIONS',
      payload: requests,
    }).catch((err) => {
      debug('content', 'Prefetch message failed:', err);
    });
  }
}

async function handleSubtitleChange(observedText: string): Promise<void> {
  if (!settings?.showTranslation) return;

  // When Netflix clears the subtitle (gap between lines), hide our overlay
  if (!observedText) {
    activeSubtitleText = '';
    hideTranslation();
    return;
  }

  // Always translate the DOM-observed text — this is what Netflix is actually
  // showing. Cache is keyed by text + language pair so a hit always corresponds
  // to the correct translation, regardless of which subtitle track was loaded.
  const text = observedText;
  activeSubtitleText = text;

  const episodeId = getEpisodeId();

  try {
    const resp = await sendToBackground({
      type: 'TRANSLATE',
      payload: {
        text,
        sourceLang: settings.languagePair.source,
        targetLang: settings.languagePair.target,
        episodeId,
      },
    });

    // Discard if subtitle has already changed while we were waiting
    if (activeSubtitleText !== text) return;

    if (resp.type === 'TRANSLATION') {
      if (settings.autoTokenize && isJapanese(text)) {
        await renderTokenizedOverlay(text, resp.payload.translatedText);
      } else {
        showTranslation(
          resp.payload.translatedText,
          settings.position,
          settings.fontSize,
          settings.opacity
        );
      }
    } else if (resp.type === 'ERROR') {
      debug('content', 'Translation error:', resp.payload);
      reportError(new Error(resp.payload), { context: 'handleSubtitleChange_response' });
      hideTranslation();
    }
  } catch (err) {
    debug('content', 'handleSubtitleChange failed:', err);
    reportError(err, { context: 'handleSubtitleChange_catch', episodeId, text });
  }
}

async function renderTokenizedOverlay(
  originalText: string,
  translatedText: string,
): Promise<void> {
  if (!settings) return;
  const tokens = await tokenize(originalText);
  let overlay = document.querySelector('[data-linguaflix-subtitle]') as HTMLDivElement | null;
  if (!overlay) {
    showTranslation(translatedText, settings.position, settings.fontSize, settings.opacity);
    overlay = document.querySelector('[data-linguaflix-subtitle]') as HTMLDivElement | null;
  } else {
    // Keep styling/state in sync
    showTranslation(translatedText, settings.position, settings.fontSize, settings.opacity);
  }
  if (!overlay) return;

  // Replace the plain text with tokenized clickable spans
  overlay.innerHTML = '';
  const tokenContainer = renderTokenizedSubtitle(tokens, (word, reading, el) => {
    trackEvent('word_translation_requested', { word, reading, episodeId: getEpisodeId() });
    showWordPopup(word, reading, el, settings!.languagePair.source, settings!.languagePair.target);
  });
  const translationLine = document.createElement('div');
  translationLine.style.marginTop = '4px';
  translationLine.style.fontSize = '0.85em';
  translationLine.style.color = '#a5b4fc';
  translationLine.textContent = translatedText;

  overlay.appendChild(tokenContainer);
  overlay.appendChild(translationLine);
  overlay.style.display = 'block';
}

function applySettings(): void {
  if (!settings) return;

  // Toggle class on documentElement to hide/show original subtitles dynamically
  if (settings.showOriginal) {
    document.documentElement.classList.remove('linguaflix-hide-original');
  } else {
    document.documentElement.classList.add('linguaflix-hide-original');
  }

  // Update visible overlay style immediately if it is present
  const overlay = document.querySelector('[data-linguaflix-subtitle]') as HTMLDivElement | null;
  if (overlay) {
    if (settings.showTranslation) {
      overlay.style.display = 'block';
      // Sync overlay positioning
      overlay.style.position = 'fixed';
      overlay.style.left = '50%';
      overlay.style.transform = 'translateX(-50%)';
      overlay.style.top = 'auto';

      if (settings.position === 'above') {
        overlay.style.bottom = '22%';
      } else {
        overlay.style.bottom = '6%';
      }

      // Sync font size
      let size = '28px';
      if (settings.fontSize === 'small') {
        size = '20px';
      } else if (settings.fontSize === 'large') {
        size = '36px';
      }
      overlay.style.fontSize = size;

      // Sync opacity
      const alpha = typeof settings.opacity === 'number' ? settings.opacity / 100 : 0.78;
      overlay.style.backgroundColor = `rgba(0, 0, 0, ${alpha})`;
    } else {
      overlay.style.display = 'none';
    }
  }
}

async function init(): Promise<void> {
  debug('content', 'Loaded on', window.location.pathname);

  // Initialize Sentry for Content Script context
  initMonitoring('content-script');

  // Inject player hook immediately to listen for video time/subtitle events early
  injectPlayerHook();

  const sessionResp = await sendToBackground({ type: 'GET_USER_SESSION' }).catch(() => null);
  if (!sessionResp || sessionResp.type !== 'USER_SESSION' || !sessionResp.payload) {
    debug('content', 'No active session — skipping observer');
    return;
  }

  const settingsResp = await sendToBackground({ type: 'GET_SETTINGS' }).catch(() => null);
  if (settingsResp?.type === 'SETTINGS') {
    settings = settingsResp.payload;
    applySettings();
  }

  debug('content', 'Session active — starting subtitle observer');

  // Pre-warm the kuromoji tokenizer in the background
  if (settings?.autoTokenize) {
    getTokenizer().catch(() => {});
  }

  startObserving((text) => {
    handleSubtitleChange(text).catch((err: unknown) => {
      debug('content', 'Unhandled subtitle error:', err);
      reportError(err, { context: 'startObserving_callback' });
    });
  });

  // Listen for messages from page context / window postMessage
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.source !== 'linguaflix') return;

    const data = event.data;
    if (data.type === 'VIDEO_TIME_UPDATE') {
      lastCurrentTimeMs = data.currentTimeMs;
      handleTimeUpdate(data.currentTimeMs);
    } else if (data.type === 'SUBTITLE_TRACK_LOADED') {
      debug('content', `Loaded subtitle track with ${data.subtitles.length} entries`);
      subtitleTrack = data.subtitles;
      prefetchedIndices.clear();
      // Prefetch starting window immediately
      handleTimeUpdate(lastCurrentTimeMs);
    }
  });

  // Listen for settings changes broadcast from popup
  chrome.runtime.onMessage.addListener((msg: { type?: string }) => {
    if (msg.type === 'SETTINGS_UPDATED') {
      sendToBackground({ type: 'GET_SETTINGS' })
        .then((resp: ExtensionResponse) => {
          if (resp.type === 'SETTINGS') {
            settings = resp.payload;
            applySettings();
          }
        })
        .catch(() => {});
    }
  });

  // Clean up when navigating away from the watch page
  window.addEventListener('beforeunload', () => {
    stopObserving();
    removeOverlay();
    removePopup();
    removeBanner();
  });

  showBanner('LinguaFlix active', 3000);
  trackEvent('content_script_initialized', { episodeId: getEpisodeId() });
}

// Wrap in try/catch — never throw uncaught errors in content scripts
init().catch((err: unknown) => {
  debug('content', 'Fatal init error:', err);
  reportError(err, { context: 'init_catch', location: window.location.pathname });
});
