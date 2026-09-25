import type { TranslationRequest, TranslationResult } from '@/shared/types/extension.types';
import { getCachedTranslation, setCachedTranslation, getSession } from '@/shared/utils/storage';
import { translationCacheKey } from '@/shared/constants/cache';
import { debug } from '@/shared/utils/debug';
import { refreshSession } from './auth-manager';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function fetchGoogleTranslation(text: string, sourceLang: string, targetLang: string): Promise<string | null> {
  const tryTranslate = async (sl: string): Promise<string | null> => {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(targetLang || 'en')}&dt=t&q=${encodeURIComponent(text)}`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const json = (await resp.json()) as unknown;
      if (Array.isArray(json) && Array.isArray(json[0])) {
        const segments = (json[0] as unknown[])
          .map((item) => (Array.isArray(item) && typeof item[0] === 'string' ? item[0] : ''))
          .join('');
        return segments.trim() || null;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Try specified source language first, then auto-detect
  const firstTry = await tryTranslate(sourceLang || 'auto');
  if (firstTry) return firstTry;
  if (sourceLang !== 'auto') {
    return await tryTranslate('auto');
  }
  return null;
}

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

  // 1. Try Supabase Edge Function if configured and session is valid
  let session = await getSession();
  if (session && SUPABASE_URL && SUPABASE_ANON_KEY) {
    if (Date.now() >= session.expiresAt - 120000) {
      debug('translator', 'Access token expiring soon or expired, refreshing...');
      const refreshed = await refreshSession();
      if (refreshed) {
        session = refreshed;
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

      if (resp.ok) {
        const data = (await resp.json()) as { translatedText: string };
        await setCachedTranslation(cacheKey, data.translatedText);
        debug('translator', 'Translated via Supabase:', req.text, '→', data.translatedText);
        return {
          originalText: req.text,
          translatedText: data.translatedText,
          sourceLang: req.sourceLang,
          targetLang: req.targetLang,
        };
      }
    } catch (err) {
      debug('translator', 'Supabase translation error, falling back to direct translation:', err);
    }
  }

  // 2. Direct translation fallback (Google Translate official Chrome Extension client)
  const directResult = await fetchGoogleTranslation(req.text, req.sourceLang, req.targetLang);
  if (directResult) {
    await setCachedTranslation(cacheKey, directResult);
    debug('translator', 'Translated via Google:', req.text, '→', directResult);
    return {
      originalText: req.text,
      translatedText: directResult,
      sourceLang: req.sourceLang,
      targetLang: req.targetLang,
    };
  }

  debug('translator', 'All translation attempts failed for:', req.text);
  return null;
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
