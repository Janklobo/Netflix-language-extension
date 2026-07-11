import { debug } from '@/shared/utils/debug';
import { isJapanese, getTokenizer } from './word-tokenizer';

export type ExtractedWord = {
  word: string;
  reading?: string;
};

/**
 * Extract the word at the given click position in the subtitle container.
 * Returns null if no word was found (clicked on space, punctuation, or empty area).
 */
export async function extractWordAtPosition(
  clickX: number,
  clickY: number,
): Promise<ExtractedWord | null> {
  const result = getTextNodeAtPoint(clickX, clickY);
  if (!result) {
    debug('word-extractor', 'No text node found at click position');
    return null;
  }

  const { textNode, offset } = result;
  const text = textNode.textContent ?? '';

  if (!text.trim()) {
    debug('word-extractor', 'Empty text node');
    return null;
  }

  // Check if the text is Japanese
  const isJapaneseText = isJapanese(text);

  if (isJapaneseText) {
    return extractJapaneseWord(text, offset);
  } else {
    return extractNonJapaneseWord(text, offset);
  }
}

function getTextNodeAtPoint(clickX: number, clickY: number): { textNode: Text; offset: number } | null {
  const range = getRangeAtPoint(clickX, clickY);
  if (range) {
    const node = range.startContainer;
    const offset = range.startOffset;

    if (node.nodeType === Node.TEXT_NODE) {
      return { textNode: node as Text, offset };
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node.childNodes[offset];
      if (child?.nodeType === Node.TEXT_NODE) {
        return { textNode: child as Text, offset: 0 };
      }
    }
  }

  const elements = document.elementsFromPoint(clickX, clickY);
  for (const element of elements) {
    const candidate = findTextNodeInsideElementAtPoint(element, clickX, clickY);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function getRangeAtPoint(clickX: number, clickY: number): Range | null {
  if ('caretRangeFromPoint' in document) {
    const range = document.caretRangeFromPoint(clickX, clickY);
    if (range) return range;
  }

  if ('caretPositionFromPoint' in document) {
    const position = document.caretPositionFromPoint(clickX, clickY);
    if (position?.offsetNode) {
      const range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
      return range;
    }
  }

  return null;
}

function findTextNodeInsideElementAtPoint(
  element: Element,
  clickX: number,
  clickY: number,
): { textNode: Text; offset: number } | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.textContent?.trim();
      return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  let node: Node | null = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    const offset = getOffsetWithinTextNode(textNode, clickX, clickY);
    if (offset >= 0) {
      return { textNode, offset };
    }
    node = walker.nextNode();
  }

  return null;
}

function getOffsetWithinTextNode(textNode: Text, clickX: number, clickY: number): number {
  const text = textNode.textContent ?? '';
  if (!text) return -1;

  const parentRange = document.createRange();
  parentRange.selectNodeContents(textNode);
  const parentRect = parentRange.getBoundingClientRect();
  if (
    clickX < parentRect.left ||
    clickX > parentRect.right ||
    clickY < parentRect.top ||
    clickY > parentRect.bottom
  ) {
    return -1;
  }

  for (let offset = 0; offset < text.length; offset += 1) {
    const range = document.createRange();
    range.setStart(textNode, offset);
    range.setEnd(textNode, offset + 1);
    const rects = range.getClientRects();

    for (let i = 0; i < rects.length; i += 1) {
      const rect = rects[i];
      if (
        clickX >= rect.left &&
        clickX <= rect.right &&
        clickY >= rect.top &&
        clickY <= rect.bottom
      ) {
        return offset;
      }
    }
  }

  return -1;
}

/**
 * Extract word from non-Japanese text using word boundary detection.
 */
function extractNonJapaneseWord(text: string, offset: number): ExtractedWord | null {
  // Split by word boundaries (spaces, punctuation)
  const words = text.split(/([\s\p{P}])/u);

  let currentOffset = 0;
  for (const word of words) {
    const wordLength = word.length;

    // Check if the click offset falls within this word
    if (offset >= currentOffset && offset < currentOffset + wordLength) {
      // Skip if it's a space or punctuation
      if (/^[\s\p{P}]+$/u.test(word)) {
        debug('word-extractor', 'Clicked on space/punctuation');
        return null;
      }

      const trimmedWord = word.trim();
      if (trimmedWord) {
        debug('word-extractor', 'Extracted non-Japanese word:', trimmedWord);
        return { word: trimmedWord };
      }
    }

    currentOffset += wordLength;
  }

  debug('word-extractor', 'No word found at offset');
  return null;
}

/**
 * Extract word from Japanese text using kuromoji tokenizer.
 */
async function extractJapaneseWord(text: string, offset: number): Promise<ExtractedWord | null> {
  const tokenizer = await getTokenizer();
  if (!tokenizer) {
    debug('word-extractor', 'Tokenizer not available, falling back to simple extraction');
    return extractNonJapaneseWord(text, offset);
  }

  try {
    const tokens = tokenizer.tokenize(text);

    let currentOffset = 0;
    for (const token of tokens) {
      const wordLength = token.surface_form.length;

      // Check if the click offset falls within this token
      if (offset >= currentOffset && offset < currentOffset + wordLength) {
        // Skip if it's punctuation (記号)
        if (token.pos === '記号' || !token.surface_form.trim()) {
          debug('word-extractor', 'Clicked on Japanese punctuation');
          return null;
        }

        debug('word-extractor', 'Extracted Japanese word:', token.surface_form, 'reading:', token.reading);
        return {
          word: token.surface_form,
          reading: token.reading,
        };
      }

      currentOffset += wordLength;
    }

    debug('word-extractor', 'No Japanese token found at offset');
    return null;
  } catch (err) {
    debug('word-extractor', 'Tokenization error:', err);
    return extractNonJapaneseWord(text, offset);
  }
}
