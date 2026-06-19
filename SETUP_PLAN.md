# LinguaFlix Setup Plan

## Overview
This document tracks the setup progress for the LinguaFlix Netflix language extension.

## Status: 🟡 In Progress

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
