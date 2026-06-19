import { LINGUAFLIX_ATTR } from '@/shared/constants/netflix';
import { sendToBackground } from '@/shared/utils/message';
import { debug } from '@/shared/utils/debug';
import type { TokenInfo } from './word-tokenizer';
import type { ExtensionResponse } from '@/shared/types/extension.types';

let popupEl: HTMLDivElement | null = null;
let dismissHandler: (() => void) | null = null;

function getContainer(): Element {
  return document.fullscreenElement ?? document.body;
}

export function showWordPopup(
  word: string,
  reading: string | undefined,
  anchorEl: HTMLElement,
  sourceLang: string,
  targetLang: string,
): void {
  removePopup();

  popupEl = document.createElement('div');
  popupEl.setAttribute(LINGUAFLIX_ATTR.POPUP, '');
  popupEl.innerHTML = `
    <div style="font-weight:600;font-size:16px">${word}</div>
    ${reading && reading !== word ? `<div style="color:#a5b4fc;font-size:13px">${reading}</div>` : ''}
    <div style="margin-top:8px;color:#9ca3af;font-size:12px">Translating...</div>
  `;
  getContainer().appendChild(popupEl);
  positionPopup(anchorEl);

  // Fetch translation for this word
  sendToBackground({
    type: 'TRANSLATE',
    payload: {
      text: word,
      sourceLang,
      targetLang,
      episodeId: getEpisodeId(),
    },
  })
    .then((resp: ExtensionResponse) => {
      if (!popupEl) return;
      if (resp.type === 'TRANSLATION') {
        const definitionEl = popupEl.querySelector('div:last-child');
        if (definitionEl) {
          definitionEl.textContent = resp.payload.translatedText;
          (definitionEl as HTMLElement).style.color = '#e5e7eb';
          (definitionEl as HTMLElement).style.fontSize = '14px';
        }
      }
    })
    .catch((err: unknown) => {
      debug('popup', 'Word translation failed:', err);
    });

  // Dismiss on next click anywhere
  setTimeout(() => {
    dismissHandler = () => removePopup();
    document.addEventListener('click', dismissHandler, { once: true });
  }, 0);
}

export function removePopup(): void {
  popupEl?.remove();
  popupEl = null;
  if (dismissHandler) {
    document.removeEventListener('click', dismissHandler);
    dismissHandler = null;
  }
}

function positionPopup(anchor: HTMLElement): void {
  if (!popupEl) return;
  const rect = anchor.getBoundingClientRect();
  const popupRect = popupEl.getBoundingClientRect();

  let top = rect.top - popupRect.height - 8;
  let left = rect.left + rect.width / 2 - popupRect.width / 2;

  // Clamp to viewport
  if (top < 8) top = rect.bottom + 8;
  if (left < 8) left = 8;
  if (left + popupRect.width > window.innerWidth - 8) {
    left = window.innerWidth - popupRect.width - 8;
  }

  popupEl.style.position = 'fixed';
  popupEl.style.top = `${top}px`;
  popupEl.style.left = `${left}px`;
}

/**
 * Render subtitle text as clickable word spans.
 * Returns the container element.
 */
export function renderTokenizedSubtitle(
  tokens: TokenInfo[],
  onWordClick: (word: string, reading: string | undefined, el: HTMLElement) => void,
): HTMLSpanElement {
  const container = document.createElement('span');

  for (const token of tokens) {
    if (token.part_of_speech === '記号' || token.surface_form.trim() === '') {
      // Punctuation / whitespace: render as plain text
      container.appendChild(document.createTextNode(token.surface_form));
      continue;
    }

    const span = document.createElement('span');
    span.setAttribute(LINGUAFLIX_ATTR.WORD, '');
    span.textContent = token.surface_form;
    span.addEventListener('click', (e) => {
      e.stopPropagation();
      onWordClick(token.surface_form, token.reading, span);
    });
    container.appendChild(span);
  }

  return container;
}

function getEpisodeId(): string {
  const match = window.location.pathname.match(/\/watch\/(\d+)/);
  return match?.[1] ?? 'unknown';
}
