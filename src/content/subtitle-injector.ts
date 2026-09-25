import { LINGUAFLIX_ATTR } from '@/shared/constants/netflix';
import { debug } from '@/shared/utils/debug';

let overlayEl: HTMLDivElement | null = null;
let fullscreenListenerAdded = false;

/**
 * Returns the element the overlay should live inside.
 * When Netflix is in fullscreen, document.body is outside the fullscreen
 * context and anything appended there becomes invisible. We must parent
 * the overlay to the active fullscreen element instead.
 */
function getContainer(): Element {
  return document.fullscreenElement ?? document.body;
}

function ensureAttached(): void {
  if (!overlayEl) return;
  const target = getContainer();
  if (overlayEl.parentElement !== target) {
    target.appendChild(overlayEl);
    debug('injector', 'Overlay moved to', target === document.body ? 'body' : 'fullscreen element');
  }
}

/**
 * Show (or update) the translated subtitle overlay.
 * Creates the overlay on first call, updates text on subsequent calls.
 * Automatically follows the fullscreen element so it remains visible
 * when Netflix enters or exits fullscreen.
 */
export function showTranslation(
  translatedText: string,
  position: 'above' | 'below',
  fontSize?: 'small' | 'medium' | 'large',
  opacity?: number,
  blurUntilHover?: boolean,
  smartCollision?: boolean,
): void {
  if (!overlayEl) {
    overlayEl = createOverlay();
    debug('injector', 'Overlay created');

    if (!fullscreenListenerAdded) {
      fullscreenListenerAdded = true;
      document.addEventListener('fullscreenchange', ensureAttached);
    }
  }

  ensureAttached();
  overlayEl.textContent = translatedText;
  overlayEl.style.display = 'block';
  updatePosition(position, smartCollision);
  updateFontSize(fontSize);
  updateOpacity(opacity);
  updateBlur(blurUntilHover);
}

export function updateBlur(blurred?: boolean): void {
  if (!overlayEl) return;
  if (blurred) {
    overlayEl.classList.add('linguaflix-blurred');
  } else {
    overlayEl.classList.remove('linguaflix-blurred');
  }
}

export function hideTranslation(): void {
  if (overlayEl) {
    overlayEl.style.display = 'none';
  }
}

export function removeOverlay(): void {
  overlayEl?.remove();
  overlayEl = null;
  document.removeEventListener('fullscreenchange', ensureAttached);
  fullscreenListenerAdded = false;
}

function createOverlay(): HTMLDivElement {
  const el = document.createElement('div');
  el.setAttribute(LINGUAFLIX_ATTR.SUBTITLE, '');
  return el;
}

function isNetflixControlsVisible(): boolean {
  try {
    const controls = document.querySelector(
      '.watch-video--bottom-controls-container, .PlayerControls--bottom-controls, .controls-active, .active',
    );
    if (!controls) return false;
    const style = window.getComputedStyle(controls);
    return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity || '1') > 0.1;
  } catch {
    return false;
  }
}

function updatePosition(position: 'above' | 'below', smartCollision?: boolean): void {
  if (!overlayEl) return;

  overlayEl.style.position = 'fixed';
  overlayEl.style.left = '50%';
  overlayEl.style.transform = 'translateX(-50%)';
  overlayEl.style.top = 'auto';

  const hasCollision = smartCollision && isNetflixControlsVisible();

  if (position === 'above') {
    // Above the Netflix subtitle area
    overlayEl.style.bottom = hasCollision ? '28%' : '22%';
  } else {
    // Below the Netflix subtitle area
    overlayEl.style.bottom = hasCollision ? '12%' : '6%';
  }
}

function updateFontSize(fontSize?: 'small' | 'medium' | 'large'): void {
  if (!overlayEl) return;

  let size = '28px';
  if (fontSize === 'small') {
    size = '20px';
  } else if (fontSize === 'large') {
    size = '36px';
  }
  overlayEl.style.fontSize = size;
}

function updateOpacity(opacity?: number): void {
  if (!overlayEl) return;
  const alpha = typeof opacity === 'number' ? opacity / 100 : 0.78;
  overlayEl.style.backgroundColor = `rgba(0, 0, 0, ${alpha})`;
}
