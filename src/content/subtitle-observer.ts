import { NETFLIX_SELECTORS } from '@/shared/constants/netflix';
import { debug } from '@/shared/utils/debug';

export type SubtitleChangeCallback = (text: string) => void;
export type WordClickCallback = (word: string, reading: string | undefined, clickX: number, clickY: number) => void;

let observer: MutationObserver | null = null;
let playerObserver: MutationObserver | null = null;
let currentContainer: Element | null = null;
let playerObserverTimer: ReturnType<typeof setTimeout> | null = null;
let wordClickCallback: WordClickCallback | null = null;
let globalPointerDownHandler: EventListener | null = null;
let globalMouseDownHandler: EventListener | null = null;
let globalClickHandler: EventListener | null = null;
const clickHandlers = new WeakMap<Element, EventListener>();

/**
 * Set the callback for word clicks on subtitles.
 * Pass null to disable click-to-translate mode.
 */
export function setWordClickCallback(callback: WordClickCallback | null): void {
  wordClickCallback = callback;
  if (callback) {
    installGlobalSubtitlePointerDownHandler();
  } else {
    removeGlobalSubtitlePointerDownHandler();
  }

  if (currentContainer) {
    applyPointerEvents(currentContainer, callback !== null);
    attachClickHandler(currentContainer);
  }
}

function installGlobalSubtitlePointerDownHandler(): void {
  if (globalPointerDownHandler) return;

  const stopIfSubtitleHit = (event: Event): void => {
    const mouseEvent = event as MouseEvent;
    const target = mouseEvent.target as HTMLElement | null;

    if (!wordClickCallback || !currentContainer) {
      return;
    }

    if (mouseEvent.button !== 0) {
      return;
    }

    if (target?.closest('[data-linguaflix-popup]') || target?.closest('[data-linguaflix-subtitle]')) {
      return;
    }

    if (!isSubtitleHitAtPoint(mouseEvent.clientX, mouseEvent.clientY)) {
      return;
    }

    event.stopImmediatePropagation();
    event.preventDefault();
  };

  globalPointerDownHandler = stopIfSubtitleHit;
  globalMouseDownHandler = stopIfSubtitleHit;

  globalClickHandler = async (event: Event): Promise<void> => {
    const mouseEvent = event as MouseEvent;
    const target = mouseEvent.target as HTMLElement | null;

    if (!wordClickCallback || !currentContainer) {
      return;
    }

    if (mouseEvent.button !== 0) {
      return;
    }

    if (target?.closest('[data-linguaflix-popup]') || target?.closest('[data-linguaflix-subtitle]')) {
      return;
    }

    if (!isSubtitleHitAtPoint(mouseEvent.clientX, mouseEvent.clientY)) {
      return;
    }

    event.stopImmediatePropagation();
    event.preventDefault();

    const { extractWordAtPosition } = await import('./word-extractor');
    const extracted = await extractWordAtPosition(mouseEvent.clientX, mouseEvent.clientY);

    if (extracted && wordClickCallback) {
      wordClickCallback(extracted.word, extracted.reading, mouseEvent.clientX, mouseEvent.clientY);
    }
  };

  document.addEventListener('pointerdown', globalPointerDownHandler, {
    capture: true,
    passive: false,
  });
  document.addEventListener('mousedown', globalMouseDownHandler, {
    capture: true,
    passive: false,
  });
  document.addEventListener('click', globalClickHandler, {
    capture: true,
    passive: false,
  });
}

function removeGlobalSubtitlePointerDownHandler(): void {
  if (globalPointerDownHandler) {
    document.removeEventListener('pointerdown', globalPointerDownHandler, {
      capture: true,
    });
    globalPointerDownHandler = null;
  }
  if (globalMouseDownHandler) {
    document.removeEventListener('mousedown', globalMouseDownHandler, {
      capture: true,
    });
    globalMouseDownHandler = null;
  }
  if (globalClickHandler) {
    document.removeEventListener('click', globalClickHandler, {
      capture: true,
    });
    globalClickHandler = null;
  }
}

function isSubtitleHitAtPoint(clickX: number, clickY: number): boolean {
  if (!currentContainer) return false;

  const elements = document.elementsFromPoint(clickX, clickY);
  for (const element of elements) {
    if (element.closest('[data-linguaflix-popup]') || element.closest('[data-linguaflix-subtitle]')) {
      continue;
    }
    // Must be inside the actual dialogue text container and have non-empty text
    const textContainer = element.closest('.player-timedtext-text-container');
    if (textContainer && element.textContent?.trim()) {
      return true;
    }
  }

  return false;
}

/**
 * Enable or disable pointer events on the subtitle container.
 * Netflix sets pointer-events: none so clicks pass through to the video.
 * We must override this inline only on actual text spans to allow word clicks.
 */
function applyPointerEvents(container: Element, enable: boolean): void {
  const el = container as HTMLElement;
  el.style.setProperty('pointer-events', 'none', 'important');

  const textContainers = container.querySelectorAll('.player-timedtext-text-container, span');
  textContainers.forEach((item) => {
    const htmlItem = item as HTMLElement;
    if (enable) {
      htmlItem.style.setProperty('pointer-events', 'auto', 'important');
      htmlItem.style.cursor = 'pointer';
    } else {
      htmlItem.style.removeProperty('pointer-events');
      htmlItem.style.removeProperty('cursor');
    }
  });
}

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
        applyPointerEvents(container, wordClickCallback !== null);
        attachSubtitleObserver(container, onSubtitleChange);
        attachClickHandler(container);
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
    applyPointerEvents(existing, wordClickCallback !== null);
    attachSubtitleObserver(existing, onSubtitleChange);
    attachClickHandler(existing);
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

  // Clean up click handlers and restore pointer events
  if (currentContainer) {
    const handler = clickHandlers.get(currentContainer);
    if (handler) {
      currentContainer.removeEventListener('click', handler, true);
    }
    applyPointerEvents(currentContainer, false);
  }

  removeGlobalSubtitlePointerDownHandler();
  currentContainer = null;
  if (playerObserverTimer) {
    clearTimeout(playerObserverTimer);
    playerObserverTimer = null;
  }
  debug('subtitle-observer', 'Stopped');
}

function attachClickHandler(container: Element): void {
  // Remove existing click handler if any
  const existingHandler = clickHandlers.get(container);
  if (existingHandler) {
    container.removeEventListener('click', existingHandler, true);
    clickHandlers.delete(container);
  }

  const handler: EventListener = async (event: Event): Promise<void> => {
    const mouseEvent = event as MouseEvent;
    const target = mouseEvent.target as HTMLElement;

    // Ignore clicks on our own injected elements
    if (target.closest('[data-linguaflix-popup]') || target.closest('[data-linguaflix-subtitle]')) {
      return;
    }

    // Only handle clicks on the subtitle container itself or its direct children
    const subtitleContainer = target.closest('[data-uia="player-timedtext"], .player-timedtext');
    if (!subtitleContainer) {
      return; // Click is not on subtitles, let it pass through
    }

    // Check if word click feature is enabled (wordClickCallback is set)
    if (!wordClickCallback) {
      return; // Feature not enabled, let click pass through
    }

    // Stop propagation immediately — must be before await so Netflix's click handler
    // doesn't fire while we're extracting the word asynchronously.
    mouseEvent.stopPropagation();
    mouseEvent.preventDefault();

    // Extract word at click position
    const { extractWordAtPosition } = await import('./word-extractor');
    const extracted = await extractWordAtPosition(mouseEvent.clientX, mouseEvent.clientY);

    if (extracted && wordClickCallback) {
      wordClickCallback(extracted.word, extracted.reading, mouseEvent.clientX, mouseEvent.clientY);
    }
  };

  // Register on container in capture phase to intercept before Netflix's handlers
  container.addEventListener('click', handler, true);
  clickHandlers.set(container, handler);
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
