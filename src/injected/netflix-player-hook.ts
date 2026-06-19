import type { SubtitleEntry } from '@/shared/types/subtitle.types';
import { parseTTML, parseWebVTT, parseJSONSubtitles } from '@/shared/utils/subtitle-parser';

((): void => {
  const debug = (...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[LinguaFlix:PlayerHook]', ...args);
    }
  };

  debug('player hook active in page context');

  // Signal readiness to content script
  window.dispatchEvent(new CustomEvent('linguaflix:hook-ready'));

  // Observe the Netflix video element for time updates, allowing
  // the content script to know when subtitles are about to appear.
  // Uses a data attribute to avoid attaching the listener more than once
  // per video element instance, and a MutationObserver to re-attach when
  // Netflix replaces the <video> element (common during quality switches).
  function attachVideoListener(): void {
    const video = document.querySelector('video') as HTMLVideoElement & { dataset: DOMStringMap } | null;
    if (!video || video.dataset['linguaflixAttached']) return;

    video.dataset['linguaflixAttached'] = 'true';
    video.addEventListener('timeupdate', () => {
      window.postMessage(
        {
          source: 'linguaflix',
          type: 'VIDEO_TIME_UPDATE',
          currentTimeMs: Math.floor(video.currentTime * 1000),
        },
        '*',
      );
    });

    debug('video timeupdate listener attached');
  }

  // Try immediately, then watch for Netflix to create/replace the video element.
  attachVideoListener();
  const videoObserver = new MutationObserver(() => {
    attachVideoListener();
  });
  videoObserver.observe(document.documentElement, { childList: true, subtree: true });

  // ── Network Interception for Subtitles ─────────────────────────────────────

  interface CustomXMLHttpRequest extends XMLHttpRequest {
    _url?: string;
  }

  function isSubtitleUrl(url: string): boolean {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    // Only match URLs that are clearly subtitle resources.
    // The previous patterns (/range/, nflxvideo.net+range/?o=) matched
    // video/audio CDN segments, flooding the parser with binary data.
    return (
      lowerUrl.includes('timedtext') ||
      lowerUrl.includes('.dfxp') ||
      lowerUrl.includes('.ttml') ||
      /\.(vtt|webvtt)(\?|$|#)/.test(lowerUrl)
    );
  }

  function handleSubtitleResponse(url: string, text: string): void {
    if (!isSubtitleUrl(url)) return;
    debug('Subtitle request detected:', url);

    let entries: SubtitleEntry[] = [];
    const trimmed = text.trim();
    if (trimmed.startsWith('<')) {
      entries = parseTTML(text);
    } else if (trimmed.startsWith('WEBVTT')) {
      entries = parseWebVTT(text);
    } else {
      const parsedJson = parseJSONSubtitles(text);
      if (parsedJson) {
        entries = parsedJson;
      }
    }

    if (entries.length > 0) {
      debug(`Parsed ${entries.length} subtitle entries. Dispatching to content script.`);
      window.postMessage(
        {
          source: 'linguaflix',
          type: 'SUBTITLE_TRACK_LOADED',
          subtitles: entries,
        },
        '*',
      );
    }
  }

  // Intercept XHR
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (
    this: CustomXMLHttpRequest,
    method: string,
    url: string | URL,
    isAsync: boolean = true,
    username?: string | null,
    password?: string | null,
  ) {
    this._url = typeof url === 'string' ? url : url.toString();
    originalOpen.call(this, method, url, isAsync, username, password);
  };

  XMLHttpRequest.prototype.send = function (this: CustomXMLHttpRequest, body?: XMLHttpRequestBodyInit | null) {
    const originalOnreadystatechange = this.onreadystatechange;

    this.onreadystatechange = (ev: Event) => {
      if (this.readyState === 4 && this.status === 200 && this._url) {
        handleSubtitleResponse(this._url, this.responseText);
      }
      if (originalOnreadystatechange) {
        originalOnreadystatechange.call(this, ev);
      }
    };

    originalSend.call(this, body);
  };

  // Intercept Fetch
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const response = await originalFetch(input, init);
    const url =
      typeof input === 'string'
        ? input
        : input instanceof Request
        ? input.url
        : input.toString();

    if (isSubtitleUrl(url)) {
      const clone = response.clone();
      clone
        .text()
        .then((text) => {
          handleSubtitleResponse(url, text);
        })
        .catch((err) => {
          debug('Failed to read fetch response body:', err);
        });
    }

    return response;
  };
})();

