import kuromoji from 'kuromoji';
import { debug } from '@/shared/utils/debug';

type Tokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;

let tokenizer: Tokenizer | null = null;
let loadPromise: Promise<Tokenizer> | null = null;

export async function getTokenizer(): Promise<Tokenizer | null> {
  if (tokenizer) return tokenizer;
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<Tokenizer>((resolve, reject) => {
    // Dict files must be in public/dict/ and listed in manifest web_accessible_resources
    const dicPath = chrome.runtime.getURL('dict');
    kuromoji.builder({ dicPath }).build((err, built) => {
      if (err) {
        debug('tokenizer', 'Failed to build kuromoji tokenizer:', err);
        reject(err);
      } else {
        tokenizer = built;
        debug('tokenizer', 'Kuromoji tokenizer ready');
        resolve(built);
      }
    });
  });

  return loadPromise.catch(() => null);
}

export type TokenInfo = {
  surface_form: string;
  reading?: string;
  part_of_speech: string;
};

export async function tokenize(text: string): Promise<TokenInfo[]> {
  const t = await getTokenizer();
  if (!t) return [{ surface_form: text, part_of_speech: 'unknown' }];
  return t.tokenize(text).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (token: any): TokenInfo => ({
      surface_form: token.surface_form,
      reading: token.reading,
      part_of_speech: token.pos,
    }),
  );
}

/** Returns true if the text appears to contain Japanese characters. */
export function isJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u4e00-\u9fff]/.test(text);
}
