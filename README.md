# LinguaFlix

Dual subtitles and word-level translation for Netflix language learners.
A Manifest V3 Chrome/Edge browser extension.

---

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Google OAuth Setup](#google-oauth-setup)
3. [Supabase Setup](#supabase-setup)
4. [Architecture Overview](#architecture-overview)
5. [Project Structure](#project-structure)
6. [Deployment & Publishing](#deployment--publishing)

---

## Local Development Setup

### Prerequisites

| Tool | Required version |
|------|-----------------|
| Node.js | ≥ 20.0.0 |
| pnpm | ≥ 9.0.0 |
| Chrome or Edge | latest |

Install pnpm if you don't have it:
```bash
npm install -g pnpm
```

### 1. Clone and install

```bash
git clone https://github.com/Janklobo/Netflix-language-extension.git
cd Netflix-language-extension
pnpm install        # also runs `pnpm prepare` which generates placeholder icons
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the values. See the sections below for how to obtain each one.
The minimum required to load the extension locally:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_CLIENT_ID` (and update `manifest.json` — see Google OAuth Setup)

### 3. Build in watch mode

```bash
pnpm dev
```

This runs `vite build --watch` which compiles the extension into `dist/` and recompiles on every file save.

### 4. Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder inside this repo
5. The LinguaFlix extension appears in your extensions list

After each file save, Chrome automatically reloads the service worker and content scripts. You may need to manually close and reopen the popup to see popup changes.

### 5. Verify the scaffold works

- Click the LinguaFlix extension icon — the popup should open showing the branded shell
- Navigate to `chrome-extension://<YOUR_EXTENSION_ID>/src/options/index.html` — the options page should load
- Open DevTools → Application → Service Workers — confirm "LinguaFlix" SW is registered
- Open DevTools on a Netflix tab → Console — you should see `[LinguaFlix:Content] content script loaded on …` in development mode

---

## Google OAuth Setup

LinguaFlix uses `chrome.identity.launchWebAuthFlow` to authenticate via Google through Supabase Auth.
This requires a Google Cloud OAuth 2.0 client configured specifically for a Chrome extension.

### Step 1 — Create a Google Cloud project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown → **New Project**
3. Name it `LinguaFlix` (or similar) → **Create**
4. Wait for the project to be created, then make sure it's selected in the dropdown

### Step 2 — Enable the Google Identity API

1. In the left sidebar go to **APIs & Services → Library**
2. Search for **"Google Identity"** (also called "OAuth 2.0")
3. This is enabled automatically when you create OAuth credentials — continue to Step 3

### Step 3 — Create OAuth 2.0 credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth 2.0 Client ID**
3. If prompted, configure the **OAuth consent screen** first:
   - User Type: **External**
   - App name: `LinguaFlix`
   - User support email: your email
   - Developer contact email: your email
   - Add scopes: `openid`, `email`, `profile`
   - Add test users if you want to test before going live
4. Back on Create Credentials, select **Application type: Chrome Extension**
5. Enter your extension's ID in the **Application ID** field:
   - Find your extension ID in `chrome://extensions` (it looks like `abcdefghijklmnopqrstuvwxyz123456`)
   - If the extension hasn't been loaded yet, load it first (Step 4 in Local Dev Setup)
6. Click **Create**
7. Copy the **Client ID** (format: `XXXXXXXXXX-XXXXXXXX.apps.googleusercontent.com`)

### Step 4 — Add the Client ID to the project

In two places:

**`.env`:**
```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**`manifest.json`** — update the `oauth2` block:
```json
"oauth2": {
  "client_id": "your-client-id.apps.googleusercontent.com",
  "scopes": ["openid", "email", "profile"]
}
```

### Step 5 — Get the redirect URL for Supabase

The extension's OAuth redirect URL is derived from the extension ID:

```
https://<EXTENSION_ID>.chromiumapp.org/
```

To get the exact URL, open the extension's background service worker console and run:
```javascript
chrome.identity.getRedirectURL()
```

Copy this URL — you'll need it in the next step.

### Step 6 — Configure Supabase Auth

1. Open your Supabase project → **Authentication → Providers → Google**
2. Enable Google provider
3. Paste your Google **Client ID** and **Client Secret** (from Step 3)
4. In **Authorized Client IDs**, add your Chrome extension's client ID
5. In your Google Cloud Console → Credentials → OAuth client → **Authorized redirect URIs**:
   - Add the `chromiumapp.org` URL from Step 5
   - Add `http://localhost` for local testing
6. Save in both Supabase and Google Cloud Console

---

## Supabase Setup

### 1. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) → New Project
2. Choose a name, database password, and region
3. Copy the **Project URL** and **anon key** from Settings → API → paste into `.env`

### 2. Run database migrations

Once the Supabase CLI is installed (`npm install -g supabase`) and you're logged in:

```bash
supabase link --project-ref your-project-id
supabase db push
```

This applies all migrations in `supabase/migrations/`.

### 3. Deploy Edge Functions

```bash
supabase functions deploy translate
```

Set the required secrets:
```bash
supabase secrets set GOOGLE_TRANSLATE_API_KEY=your-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Architecture Overview

```
Chrome Extension
├── Popup (React)         — auth UI, language pair selection (Phase 8)
├── Options page (React)  — subtitle preferences, account settings (Phase 9)
├── Service Worker        — message router, translation cache, auth token refresh
│     Uses: chrome.storage.local, chrome.alarms, chrome.identity
└── Content Scripts (injected into netflix.com)
      ├── subtitle-observer   — MutationObserver watching Netflix DOM
      ├── subtitle-injector   — injects translated subtitle element
      ├── word-tokenizer      — wraps subtitle words in clickable spans
      ├── translation-popup   — vanilla DOM popup card on word click
      ├── player-bridge       — postMessage relay to/from injected page script
      └── degradation-banner  — shown when Netflix DOM changes break detection

External (not in extension bundle)
├── Supabase                  — Postgres DB + Auth (Google OAuth / email)
│   └── Edge Function: /translate  — JWT-gated Google Cloud Translation proxy
└── Netflix (third-party)     — the page the content scripts run inside
```

### Key data flows

**Subtitle display (zero-latency goal):**
1. Episode loads → injected player hook detects subtitle track → `SUBTITLE_TRACK_LOADED` message
2. Service worker batch-translates all subtitles via Supabase Edge Function → stores in `chrome.storage.local`
3. When Netflix displays a subtitle → content script reads translation from cache instantly

**Word click:**
1. User clicks word span → content script → `WORD_CLICKED` message to SW
2. SW checks cache → returns translation → content script renders popup

---

## Project Structure

```
src/
├── background/       # Service worker (SW lifecycle, message router, caches)
├── content/          # Content scripts injected into netflix.com
├── injected/         # Page-context script (Netflix player bridge)
├── popup/            # Extension popup (React + Tailwind)
├── options/          # Options page (React + Tailwind)
├── shared/           # Types, constants, utils shared across all contexts
└── assets/
    ├── icons/        # PNG icons (generated by `pnpm generate:icons`)
    └── styles/       # content.css injected into Netflix page

supabase/
├── functions/        # Deno edge functions
└── migrations/       # Postgres schema migrations

tests/
├── unit/             # Vitest unit tests
└── e2e/              # Playwright tests for popup UI
```

---

## Deployment & Publishing

### Production build

```bash
pnpm build:prod
```

Output is in `dist/`. Verify no secrets leaked:
```bash
grep -r "GOOGLE_TRANSLATE\|service_role\|sk_live" dist/
# Must return no results
```

### Lint the extension bundle

```bash
npx web-ext lint --source-dir dist
```

Fix any warnings before submitting.

### Chrome Web Store

1. Zip the `dist/` folder: `cd dist && zip -r ../linguaflix.zip .`
2. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload `linguaflix.zip`
4. Fill in the store listing (description, screenshots, privacy policy URL)
5. Submit for review

**Before submitting, verify:**
- [ ] `manifest.json` declares only permissions actually used
- [ ] No API keys in `dist/` (run the grep above)
- [ ] Icons are real artwork (not the placeholder indigo squares)
- [ ] Privacy policy URL is set
- [ ] `web-ext lint` passes with zero errors
