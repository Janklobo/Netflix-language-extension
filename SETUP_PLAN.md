# LinguaFlix Setup Plan

## Overview
This document tracks the setup progress for the LinguaFlix Netflix language extension.

## Status: ✅ Click-to-Translate Feature Implemented

---

## Click-to-Translate Feature (NEW)

**Status**: ✅ Completed (June 24, 2026)

Users can now click on any word in Netflix subtitles to get instant translation. The feature supports all languages and works with two mutually exclusive modes:

### Implemented Changes

1. **Added `subtitleMode` setting** to UserSettings type ('double' | 'click')
2. **Updated UI** in both popup and options pages with mode selector
3. **Created word extraction utility** (`src/content/word-extractor.ts`)
   - Supports Japanese (kuromoji tokenizer) and non-Japanese languages
   - Detects clicked word using `caretRangeFromPoint`
4. **Added click handler** to subtitle observer
   - Attaches/detaches based on mode
   - Uses WeakMap for handler storage
5. **Updated content script** to respect mode setting
   - Double mode: shows translation overlay
   - Click mode: enables word click translation
6. **Added migration logic** for existing users (showTranslation → subtitleMode)

### Files Modified

- `src/shared/types/extension.types.ts` - Added SubtitleMode type and subtitleMode to UserSettings
- `src/shared/utils/storage.ts` - Updated defaults and migration logic
- `src/options/App.tsx` - Added mode selector UI
- `src/popup/App.tsx` - Added mode selector UI
- `src/content/word-extractor.ts` - New file for word extraction
- `src/content/subtitle-observer.ts` - Added click handler attachment
- `src/content/index.ts` - Updated mode-based behavior

---

## Setup Steps

### 1. Create .env file
- [ ] Copy .env.example to .env
- [ ] Fill in placeholder values with actual credentials
- **Status**: Not started

### 2. Set up Google Cloud project
- [ ] Create Google Cloud project
- [ ] Enable Cloud Translation API
- [ ] Create API key for translation
- [ ] Create OAuth 2.0 client ID for Chrome Extension
- [ ] Configure OAuth consent screen
- [ ] Get extension ID from chrome://extensions
- [ ] Add extension ID to OAuth client
- **Status**: Not started

### 3. Set up Supabase project
- [ ] Create Supabase project
- [ ] Copy Project URL and anon key
- [ ] Install Supabase CLI
- [ ] Link project: `supabase link --project-ref <ID>`
- [ ] Push migrations: `supabase db push`
- [ ] Deploy Edge Function: `supabase functions deploy translate`
- [ ] Set secrets: `GOOGLE_TRANSLATE_API_KEY`
- [ ] Set secrets: `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Configure Supabase Auth with Google provider
- **Status**: Not started

### 4. Update manifest.json
- [ ] Replace PLACEHOLDER_CLIENT_ID with actual Google OAuth client ID
- **Status**: Not started

### 5. Install dependencies
- [ ] Run `pnpm install`
- **Status**: Not started

### 6. Build extension
- [ ] Run `pnpm dev` (watch mode)
- **Status**: Not started

### 7. Load extension in Chrome
- [ ] Open chrome://extensions
- [ ] Enable Developer mode
- [ ] Load unpacked extension from dist/ folder
- [ ] Verify extension loads successfully
- **Status**: Not started

### 8. Test extension
- [ ] Open Netflix
- [ ] Sign in via extension popup
- [ ] Test subtitle translation
- [ ] Test word tokenization (for Japanese)
- [ ] Verify settings page works
- **Status**: Not started

---

## Credentials Needed

### Google Cloud
- [ ] Google OAuth Client ID
- [ ] Google OAuth Client Secret
- [ ] Google Translation API Key
- [ ] Extension ID (from chrome://extensions)

### Supabase
- [ ] Supabase Project URL
- [ ] Supabase Anon Key
- [ ] Supabase Service Role Key

### Optional
- [ ] PostHog API Key (for analytics)
- [ ] Sentry DSN (for error monitoring)

---

## Notes
- The extension code is complete - only configuration is needed
- All environment variables must be set before the extension can run
- The .env file is git-ignored and must never be committed
