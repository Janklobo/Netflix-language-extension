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
    overlayEl.style.filter = 'blur(7px)';
    overlayEl.style.opacity = '0.65';
    overlayEl.style.cursor = 'pointer';
    overlayEl.style.pointerEvents = 'auto';
    overlayEl.title = 'Hover to reveal translation (Listening & Shadowing Mode)';
  } else {
    overlayEl.classList.remove('linguaflix-blurred');
    overlayEl.style.filter = 'none';
    overlayEl.style.opacity = '1';
    overlayEl.style.cursor = 'default';
    overlayEl.style.pointerEvents = 'auto';
    overlayEl.removeAttribute('title');
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
  el.style.position = 'fixed';
  el.style.left = '50%';
  el.style.transform = 'translateX(-50%)';
  el.style.zIndex = '999990';
  el.style.color = '#FFFFFF';
  el.style.fontWeight = '600';
  el.style.textAlign = 'center';
  el.style.pointerEvents = 'auto';
  el.style.borderRadius = '12px';
  el.style.padding = '8px 20px 10px';
  el.style.maxWidth = '85vw';
  el.style.whiteSpace = 'pre-wrap';
  el.style.backgroundColor = 'rgba(0, 0, 0, 0.82)';
  el.style.border = '1px solid rgba(255, 255, 255, 0.15)';
  el.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)';
  el.style.transition = 'filter 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)';

  el.addEventListener('mouseenter', () => {
    if (el.classList.contains('linguaflix-blurred')) {
      el.style.filter = 'none';
      el.style.opacity = '1';
    }
  });

  el.addEventListener('mouseleave', () => {
    if (el.classList.contains('linguaflix-blurred')) {
      el.style.filter = 'blur(7px)';
      el.style.opacity = '0.65';
    }
  });

  el.addEventListener('click', (e) => {
    if (el.classList.contains('linguaflix-blurred')) {
      e.stopPropagation();
      const isCurrentlyClear = el.style.filter === 'none';
      el.style.filter = isCurrentlyClear ? 'blur(7px)' : 'none';
      el.style.opacity = isCurrentlyClear ? '0.65' : '1';
    }
  });

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
