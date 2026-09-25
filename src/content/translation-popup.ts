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

function katakanaToHiragana(src: string): string {
  return src.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

function containsKanji(text: string): boolean {
  return /[\u4e00-\u9faf]/.test(text);
}

export function showWordPopup(
  word: string,
  reading: string | undefined,
  anchorEl: HTMLElement,
  sourceLang: string,
  targetLang: string,
  contextSentence?: string,
): void {
  removePopup();

  popupEl = document.createElement('div');
  popupEl.setAttribute(LINGUAFLIX_ATTR.POPUP, '');
  popupEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div class="headword" style="font-family:'Newsreader',Georgia,serif;font-weight:700;font-size:18px;color:#1C1917">${word}</div>
      ${reading && reading !== word ? `<span class="reading-badge" style="background:#FEF3C7;color:#B45309;font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;border:1px solid #FDE68A">${katakanaToHiragana(reading)}</span>` : ''}
    </div>
    <div class="linguaflix-definition definition" style="margin-top:8px;color:#059669;font-size:13.5px;font-weight:700">Translating...</div>
    <div class="linguaflix-actions" style="margin-top:10px;display:flex;align-items:center;justify-content:space-between">
      <button type="button" class="linguaflix-save-btn" id="linguaflix-save-word">
        <span>★</span> <span class="btn-label">Save to Anki</span>
      </button>
      <span style="font-size:10px;color:#78716C">LinguaFlix</span>
    </div>
  `;
  getContainer().appendChild(popupEl);
  positionPopup(anchorEl);

  let currentTranslation = '';

  const saveBtn = popupEl.querySelector('#linguaflix-save-word') as HTMLButtonElement | null;
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sendToBackground({
        type: 'SAVE_WORD',
        payload: {
          word,
          reading: reading ? katakanaToHiragana(reading) : undefined,
          translation: currentTranslation || 'Saved word',
          contextSentence,
          sourceLang,
          targetLang,
        },
      }).then(() => {
        saveBtn.classList.add('saved');
        const label = saveBtn.querySelector('.btn-label');
        if (label) label.textContent = 'Saved ✓';
      }).catch((err: unknown) => {
        debug('popup', 'Save word failed:', err);
      });
    });
  }

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
      const definitionEl = popupEl.querySelector('.linguaflix-definition');
      if (definitionEl) {
        if (resp.type === 'TRANSLATION') {
          currentTranslation = resp.payload.translatedText;
          definitionEl.textContent = currentTranslation;
          (definitionEl as HTMLElement).style.color = '#059669';
          (definitionEl as HTMLElement).style.fontSize = '14px';
        } else {
          definitionEl.textContent = 'Translation failed';
          (definitionEl as HTMLElement).style.color = '#f87171'; // red-400
        }
      }
    })
    .catch((err: unknown) => {
      debug('popup', 'Word translation failed:', err);
      if (!popupEl) return;
      const definitionEl = popupEl.querySelector('.linguaflix-definition');
      if (definitionEl) {
        definitionEl.textContent = 'Translation error';
        (definitionEl as HTMLElement).style.color = '#f87171'; // red-400
      }
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

export interface RenderTokenOptions {
  showFurigana?: boolean;
  onWordHoverStart?: (word: string, el: HTMLElement) => void;
  onWordHoverEnd?: () => void;
}

/**
 * Render subtitle text as clickable word spans.
 * Supports furigana ruby text and hover listeners.
 */
export function renderTokenizedSubtitle(
  tokens: TokenInfo[],
  onWordClick: (word: string, reading: string | undefined, el: HTMLElement) => void,
  options?: RenderTokenOptions,
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

    // Render furigana if requested and reading exists over kanji
    if (options?.showFurigana && token.reading && containsKanji(token.surface_form)) {
      const ruby = document.createElement('ruby');
      ruby.textContent = token.surface_form;
      const rt = document.createElement('rt');
      rt.textContent = katakanaToHiragana(token.reading);
      ruby.appendChild(rt);
      span.appendChild(ruby);
    } else {
      span.textContent = token.surface_form;
    }

    span.addEventListener('click', (e) => {
      e.stopPropagation();
      onWordClick(token.surface_form, token.reading, span);
    });

    if (options?.onWordHoverStart) {
      span.addEventListener('mouseenter', () => {
        options.onWordHoverStart?.(token.surface_form, span);
      });
    }

    if (options?.onWordHoverEnd) {
      span.addEventListener('mouseleave', () => {
        options.onWordHoverEnd?.();
      });
    }

    container.appendChild(span);
  }

  return container;
}

function getEpisodeId(): string {
  const match = window.location.pathname.match(/\/watch\/(\d+)/);
  return match?.[1] ?? 'unknown';
}

