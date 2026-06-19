import { NETFLIX_SELECTORS } from '@/shared/constants/netflix';
import { debug } from '@/shared/utils/debug';

export type SubtitleChangeCallback = (text: string) => void;

let observer: MutationObserver | null = null;
let playerObserver: MutationObserver | null = null;
let currentContainer: Element | null = null;
let playerObserverTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Wait for the Netflix player subtitle container to appear, then start
 * observing it for text changes. Calls onSubtitleChange whenever the
 * visible subtitle text changes.
 *
 * playerObserver stays active for the lifetime of the session so that it
 * can re-attach whenever Netflix replaces the subtitle container element
 * (which it does during player initialisation and subtitle track loads).
 */
export function startObserving(onSubtitleChange: SubtitleChangeCallback): void {
  playerObserver = new MutationObserver(() => {
    // Throttle: this fires on every DOM change in body (including our own
    // overlay updates). Limit container checks to at most once per 300ms.
    if (playerObserverTimer) return;
    playerObserverTimer = setTimeout(() => {
      playerObserverTimer = null;
      const container = document.querySelector(NETFLIX_SELECTORS.SUBTITLE_CONTAINER);
      if (container && container !== currentContainer) {
        // New container appeared — re-attach subtitle observer
        observer?.disconnect();
        observer = null;
        currentContainer = container;
        attachSubtitleObserver(container, onSubtitleChange);
        debug('subtitle-observer', 'Attached to subtitle container');
      } else if (!container && currentContainer) {
        // Container was removed — wait for the next one
        observer?.disconnect();
        observer = null;
        currentContainer = null;
        debug('subtitle-observer', 'Subtitle container removed, waiting...');
      }
    }, 300);
  });

  playerObserver.observe(document.body, { childList: true, subtree: true });

  // If container already exists, attach immediately
  const existing = document.querySelector(NETFLIX_SELECTORS.SUBTITLE_CONTAINER);
  if (existing) {
    currentContainer = existing;
    attachSubtitleObserver(existing, onSubtitleChange);
    debug('subtitle-observer', 'Attached to existing subtitle container');
  } else {
    debug('subtitle-observer', 'Waiting for Netflix player...');
  }
}

export function stopObserving(): void {
  observer?.disconnect();
  observer = null;
  playerObserver?.disconnect();
  playerObserver = null;
  currentContainer = null;
  if (playerObserverTimer) {
    clearTimeout(playerObserverTimer);
    playerObserverTimer = null;
  }
  debug('subtitle-observer', 'Stopped');
}

function attachSubtitleObserver(
  container: Element,
  onSubtitleChange: SubtitleChangeCallback,
): void {
  let lastText = '';
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const checkSubtitle = (): void => {
    const text = extractSubtitleText(container);
    if (text !== lastText) {
      lastText = text;
      // Always call — including for empty text so the overlay is hidden
      // when Netflix clears a subtitle (gap between lines).
      onSubtitleChange(text);
    }
  };

  observer = new MutationObserver(() => {
    // Debounce: Netflix updates subtitle DOM in multiple steps (remove old
    // spans, insert new ones, set text). Wait for mutations to settle before
    // extracting text to avoid translating partial/intermediate states.
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkSubtitle, 60);
  });
  observer.observe(container, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Fire once immediately in case subtitles are already showing
  checkSubtitle();
}

function extractSubtitleText(container: Element): string {
  // Walk all text nodes inside the subtitle container, ignoring our injected elements
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // Skip nodes inside our own injected elements
      if ((node.parentElement as HTMLElement | null)?.closest('[data-linguaflix-subtitle]')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const parts: string[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim();
    if (text) parts.push(text);
  }

  return parts.join(' ');
}
