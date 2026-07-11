import type { TranslationRequest, TranslationResult } from '@/shared/types/extension.types';
import { getCachedTranslation, setCachedTranslation, getSession } from '@/shared/utils/storage';
import { translationCacheKey } from '@/shared/constants/cache';
import { debug } from '@/shared/utils/debug';
import { refreshSession } from './auth-manager';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export async function translate(req: TranslationRequest): Promise<TranslationResult | null> {
  const langPair = `${req.sourceLang}-${req.targetLang}`;
  const cacheKey = translationCacheKey(req.text, langPair);

  // Check cache first
  const cached = await getCachedTranslation(cacheKey);
  if (cached !== null) {
    debug('translator', 'Cache hit for', cacheKey);
    return {
      originalText: req.text,
      translatedText: cached,
      sourceLang: req.sourceLang,
      targetLang: req.targetLang,
    };
  }

  let session = await getSession();
  if (!session) {
    debug('translator', 'No session — cannot translate');
    return null;
  }

  // Proactively refresh session if it's expired or expiring in less than 2 minutes
  if (Date.now() >= session.expiresAt - 120000) {
    debug('translator', 'Access token expiring soon or expired, refreshing...');
    const refreshed = await refreshSession();
    if (refreshed) {
      session = refreshed;
    } else {
      debug('translator', 'Session refresh failed during translation request');
      return null;
    }
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        text: req.text,
        sourceLang: req.sourceLang,
        targetLang: req.targetLang,
      }),
    });

    if (!resp.ok) {
      debug('translator', 'Translation request failed:', resp.status);
      return null;
    }

    const data = (await resp.json()) as { translatedText: string };
    await setCachedTranslation(cacheKey, data.translatedText);
    debug('translator', 'Translated:', req.text, '→', data.translatedText);

    return {
      originalText: req.text,
      translatedText: data.translatedText,
      sourceLang: req.sourceLang,
      targetLang: req.targetLang,
    };
  } catch (err) {
    debug('translator', 'Translation error:', err);
    return null;
  }
}

export async function prefetch(requests: TranslationRequest[]): Promise<void> {
  // Fire-and-forget pre-fetch for upcoming subtitles with concurrency limit of 3
  const limit = 3;
  const queue = [...requests];
  
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const req = queue.shift();
      if (!req) break;
      try {
        await translate(req);
        // Throttle prefetch requests to stay within translation rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        debug('translator', 'Prefetch translation failed for text:', req.text, err);
      }
    }
  });

  await Promise.all(workers);
}
