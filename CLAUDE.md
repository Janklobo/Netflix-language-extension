# LinguaFlix — Claude Code Guide

## Build commands

```bash
pnpm dev              # watch mode — recompiles to dist/ on every save
pnpm build            # single production build
pnpm typecheck        # tsc --noEmit (zero-tolerance strict mode)
pnpm lint             # ESLint, zero warnings allowed
pnpm lint:fix         # auto-fix ESLint issues
pnpm format           # Prettier write
pnpm test             # Vitest unit tests
pnpm test:e2e         # Playwright e2e (popup UI)
pnpm generate:icons   # regenerate placeholder PNG icons in src/assets/icons/
```

After `pnpm build`, load `dist/` as an unpacked extension in `chrome://extensions`.

## Architecture — critical rules

### Context separation
This project has four distinct execution contexts. Code must never assume the wrong one:

| Context | Files | Has `chrome.*`? | Has `document`/`window`? | Has `import.meta.env`? |
|---------|-------|----------------|--------------------------|----------------------|
| Service Worker | `src/background/` | Yes | No | Yes (Vite replaces at build) |
| Content Script | `src/content/` | Yes | Yes (Netflix page) | Yes |
| Page Script | `src/injected/` | **No** | Yes (Netflix page) | Yes |
| Popup / Options | `src/popup/`, `src/options/` | Yes | Yes (extension page) | Yes |

### Never do these things
- Do not store auth tokens or translation cache in JS module scope — the service worker is killed by Chrome at any time. Always use `chrome.storage.local`.
- Do not use `setInterval` in the service worker — use `chrome.alarms`.
- Do not hardcode Netflix CSS class names — they change with every deploy. Use structural DOM heuristics and `data-uia` attributes.
- Do not use `any` in TypeScript — strict mode, zero exceptions.
- Do not throw uncaught errors in content scripts — wrap all top-level calls in try/catch so Netflix playback is never broken.
- Do not put API keys (Google Translate, Supabase service role) in extension code — all calls go through the Supabase Edge Function proxy.
- Do not use inline styles in React components — Tailwind classes only.
- Do not use `console.log` directly — use the `debug()` utility which is stripped in production builds.

### Subtitle injection strategy
- Observe the Netflix player with `MutationObserver` — never poll.
- Inject translated subtitles as a **sibling element** to the original, not by replacing it.
- Pre-fetch translations 30–60 seconds ahead of display time. Never translate reactively during playback.
- Cache keys: `translation::{episodeId}::{subtitleIndex}::{langPair}`

### Message passing
All `chrome.runtime.sendMessage` calls use typed message objects defined in `src/shared/types/extension.types.ts`. Never pass raw strings.

### Auth
- Users must be logged in to use any feature. No anonymous access.
- Auth session stored in `chrome.storage.local` (not localStorage — unavailable in SW).
- Token refresh handled proactively by the SW via `chrome.alarms` before expiry.
- OAuth flow uses `chrome.identity.launchWebAuthFlow` — not redirect-based (breaks in extensions).

## Tech stack
- **Build**: Vite 5 + `vite-plugin-web-extension` + `@vitejs/plugin-react`
- **Extension**: Manifest V3 (non-negotiable)
- **Popup / Options UI**: React 18 + TypeScript + Tailwind CSS
- **Content / Background**: Vanilla TypeScript — no framework
- **Auth / DB**: Supabase (Postgres + Supabase Auth)
- **Translation**: Google Cloud Translation API v2 (via Supabase Edge Function proxy)
- **Japanese tokenization**: kuromoji (morphological analyser — needed because Japanese has no word spaces)
- **Analytics**: PostHog (direct fetch calls from SW — browser SDK assumes DOM)
- **Errors**: Sentry browser SDK

## File naming conventions
- `src/shared/types/*.types.ts` — TypeScript interfaces and type unions
- `src/shared/constants/*.ts` — string/number constants (no magic strings in logic)
- `src/shared/utils/*.ts` — pure utility functions, no side effects at module load
- Content script files: one concern per file (observer, injector, tokenizer, popup, bridge, banner)

## Environment variables
All Vite build-time vars are prefixed `VITE_`. See `.env.example` for the full list.
Supabase Edge Function secrets are set via `supabase secrets set` — never in `.env`.

## Implementation phases (current status)
- [x] Phase 1  — Project scaffolding (this scaffold)
- [x] Phase 2  — Shared types, constants & utils
- [x] Phase 3  — Supabase schema + Edge Function (translate proxy) — deployed 2026-06-07
- [x] Phase 4  — Service worker foundation (auth + translation + message router)
- [x] Phase 5  — Netflix subtitle observer + injector + tokenizer + popups
- [x] Phase 6  — Translation pre-fetch pipeline
- [x] Phase 7  — Word tokenizer + translation popup
- [x] Phase 8  — Extension popup UI (React: auth, language selector)
- [x] Phase 9  — Options page (React: settings)
- [x] Phase 10 — Graceful degradation system (banner)
- [x] Phase 11 — Error monitoring (Sentry) — completed 2026-07-11
- [ ] Phase 12 — Analytics instrumentation (PostHog)
- [ ] Phase 13 — Tests (unit + e2e)
- [ ] Phase 14 — Build optimisation + Chrome Web Store prep

## Current Project Status (as of 2026-06-19)
**FULLY WORKING END-TO-END** — Auth, translation, subtitle overlay, and translation pre-fetching all functional.

### Completed
1. **Auth working** — Email/password login via Supabase Auth (username/password for now, Google OAuth2 planned)
2. **Supabase connected** — Project URL `https://zqsjaipyycuwvwalfzdn.supabase.co`, anon key in `.env`
3. **Edge Function deployed** — `translate` function live, proxies to Google Cloud Translation API v2
4. **Google Translate API key** — Set as Supabase secret `GOOGLE_TRANSLATE_API_KEY`
5. **Subtitle overlay working** — Translations appear above Netflix subtitles at 22% from bottom, 28px bold white text
6. **Pre-fetch pipeline working** — Automatically catches upcoming subtitles 30-60s ahead, translates them sequentially/concurrently in the background with a limit of 3, and caches them in `chrome.storage.local`.

### Bugs Fixed (June 7, 2026)
- `.env` had typo in Supabase URL (`vww` instead of `vw`) — caused `ERR_NAME_NOT_RESOLVED`
- `manifest.json` was missing `https://*.supabase.co/*` in `host_permissions` — blocked all Supabase fetch calls
- `chrome.runtime.sendMessage` was used as a Promise (breaks in MV3 when SW is sleeping) — fixed to use callback pattern
- Netflix dropped `[data-uia="player-timedtext"]` — updated selector to include `.player-timedtext` fallback
- Subtitle injector still referenced old broken selector for positioning — now uses fixed `bottom` percentage
- `debug()` utility is stripped in production builds — use SW DevTools (`chrome://extensions` → Inspect service worker) to see auth/translation logs

### Bugs Fixed (June 10–12, 2026)
- **17 lint errors** — replaced `any` types with `unknown`/proper types across 6 files; replaced `console.log` with `debug()` in auth-manager; fixed `no-this-alias` and XHR monkey-patching types in netflix-player-hook
- **Subtitle container replacement** — Netflix replaces `.player-timedtext` during player init. `playerObserver` was disconnecting after first find, leaving the subtitle observer watching a detached DOM node. Fix: `playerObserver` now stays active permanently, re-attaches when container element changes.
- **Overlay invisible in fullscreen** — Overlay was appended to `document.body` which is outside Netflix's fullscreen element. Fix: `ensureAttached()` moves overlay to `document.fullscreenElement` on fullscreen changes.
- **Translation never hid between subtitles (major sync issue)** — `checkSubtitle` only called `onSubtitleChange` for non-empty text. When Netflix cleared a subtitle (gap), the old translation lingered, looking desynced. Fix: always call back, `handleSubtitleChange` hides overlay on empty text.
- **No debounce on subtitle observer** — Netflix updates DOM in multiple steps; each mutation fired a translation request for partial text. Fix: 60ms debounce before extracting text.
- **WebVTT parser broke on cue settings** — Timestamp lines like `00:00:04.000 position:10%` caused `endMs = 0` (extra colons broke the parser). Time-based matching never found these entries. Fix: strip cue settings before parsing end timestamp.
- **`isSubtitleUrl` matched video/audio segments** — Patterns `/range/` and `nflxvideo.net+range` matched CDN video data, feeding binary into parsers. Fix: removed overly broad patterns, kept `timedtext`/`.dfxp`/`.ttml`/`.vtt`.
- **Wrong subtitle text used for translation** — Netflix loads multiple subtitle tracks (different languages). Each `SUBTITLE_TRACK_LOADED` replaced the entire track. Time-based matching then returned text from a *different language* than what was on screen. Fix: always translate the DOM-observed text (what Netflix displays); track is only used for cache index.
- **Stale translation race condition** — Fast subtitle changes caused multiple in-flight translation requests. A slow response for an old subtitle could overwrite a newer one. Fix: `activeSubtitleText` tracks the current subtitle; responses are discarded if text has already changed.
- **`playerObserver` performance** — Fired `document.querySelector` on every DOM mutation in body. Fix: 300ms throttle.

### Lessons learned (subtitle pipeline)
These are hard-won architectural insights — do NOT revert these decisions:
- **Always translate DOM-observed text, never intercepted track text.** Netflix loads multiple subtitle tracks for different languages; the intercepted track may not match what's on screen.
- **The subtitle observer must call back on empty text.** Otherwise the translation overlay lingers during gaps between subtitles, causing a desync appearance.
- **`playerObserver` must stay active permanently.** Netflix replaces the subtitle container element at any time (player init, track switch, etc.). Disconnecting after first find leaves the subtitle observer on a dead DOM node.
- **Debounce subtitle DOM extraction.** Netflix updates subtitle DOM in multiple steps; without debounce, partial/intermediate text triggers wrong translations.
- **Subtitle URL detection must be conservative.** Netflix CDN URLs for video/audio segments look similar to subtitle URLs. Only match `timedtext`, `.dfxp`, `.ttml`, `.vtt` patterns.

### Phase 11 Implementation (July 11–16, 2026)
Comprehensive error monitoring with Sentry browser SDK:
- **ErrorBoundary component** wraps React components in popup and options pages, catches render errors
- **Monitoring utility** initializes Sentry DSN from environment variables (`VITE_SENTRY_DSN`)
- **Error reporting integrated** across all contexts:
  - Service worker: message handler errors, token refresh failures, unhandled rejections
  - Content script: initialization errors, subtitle handling errors, unhandled rejections
  - Popup/Options: caught by React error boundary, reported via `reportError()`
- **Global unhandled rejection handlers** added to service worker and content script
- **Event context tags** — each context tagged (background-service-worker, content-script, popup, options) for easier debugging

### Bugs Fixed (June 19, 2026)
- **Edge Function 401 — asymmetric JWT rejection** — Supabase project rotated its JWT signing key from HS256 (shared secret) to ECC P-256 (asymmetric) ~24 days prior. The `translate` Edge Function used an unpinned `@supabase/supabase-js@2`, created a client with `SUPABASE_SERVICE_ROLE_KEY`, manually extracted the Bearer token, and passed it to `getUser(token)`. This bypassed Supabase's standard auth pipeline and failed to validate the new asymmetric JWTs, returning `{"code":"UNAUTHORIZED_ASYMMETRIC_JWT","message":"Invalid JWT"}` on every translate request. Fix (in `supabase/functions/translate/index.ts`):
  1. Pinned `@supabase/supabase-js@2.49.4` (supports ECC P-256 tokens).
  2. Replaced `SUPABASE_SERVICE_ROLE_KEY` with `SUPABASE_ANON_KEY` — the function doesn't need service-role privileges.
  3. Pass the caller's `Authorization` header via `createClient(..., { global: { headers: { Authorization: authHeader } } })` and call `getUser()` with no argument, letting Supabase's auth pipeline validate both HS256 and asymmetric tokens.
  4. Replaced deprecated `serve()` from `std/http/server.ts` with `Deno.serve()`.
- **Pre-fetch pipeline race condition** — Content script `init()` was loading user settings and session asynchronously before registering the `message` event listener. This caused the script to miss the `SUBTITLE_TRACK_LOADED` event sent by the player hook during initial load. Fix: Registered the window event listener synchronously at the very beginning of the content script's initialization.
- **Settings update broadcast missing** — Changing language settings in the options page or popup updated storage, but did not broadcast `SETTINGS_UPDATED` to existing content scripts. Fix: Background script now broadcasts `SETTINGS_UPDATED` to all active Netflix tabs when settings are modified. Content scripts now clear their prefetch caches and re-trigger pre-fetching if the language pair is changed.
- **Prefetch API overload** — Large batches of prefetch requests could cause spikes of concurrent HTTP connections to the translation API. Fix: Implemented a concurrency-limited worker pool (limit of 3) for processing prefetch requests.

### Lessons learned (Edge Function auth)
- **Never manually extract and pass JWT tokens to `getUser(token)`.** Use `createClient` with the caller's `Authorization` header and call `getUser()` (no arg) so the Supabase client handles token validation through its standard pipeline.
- **Always pin `@supabase/supabase-js` to an exact version in Edge Functions.** Unpinned `@2` resolved to an old version that lacked asymmetric JWT support.
- **Edge Functions should use `SUPABASE_ANON_KEY`, not `SUPABASE_SERVICE_ROLE_KEY`**, unless they genuinely need to bypass RLS. The anon key + user JWT is the correct pattern for user-scoped operations.

### Known Limitations
- Position setting "above/below" in Options page maps to fixed percentages (22% / 6% from bottom), not pixel-perfect relative to Netflix subtitles
- Font size setting in Options page (small/medium/large) is not wired up — font is hardcoded to 28px
- Auth is email/password only — Google OAuth2 not yet configured

### Phases Not Yet Implemented
- Phase 12 (Analytics instrumentation) — PostHog SDK integrated, event tracking in place for auth/translations, but missing comprehensive event instrumentation for all user interactions
- Phase 13 (Tests) — Test infrastructure present (Vitest, Playwright) but no test cases written (except for parser, tokenizer, and translator unit tests)
- Phase 14 (Store prep) — Build artifact ready for Web Store

## Website Project (June 20, 2026)
**Status**: Marketing website initiated in `./website/` folder.

- **Repo**: https://github.com/Janklobo/neon-flix-learn (cloned locally)
- **Tech**: React + TypeScript + Tailwind CSS + Vite + Lovable AI-generated
- **Purpose**: Modern, futuristic marketing site for extension acquisition and future monetization
- **Design**: Dark mode with neon accents (electric blue + violet), glassmorphism, smooth animations
- **Pages**: 
  - Landing (`/`) — Hero with "Watch Netflix. Learn Japanese" tagline, 3-step onboarding flow, features grid, coming-soon pricing, testimonials, CTA banner
  - About (`/about`) — Placeholder for company story and team (to be filled)
  - Privacy Policy (`/privacy`) — Standard privacy policy template
- **Future monetization**: Free tier (limited translations) + Pro tier (unlimited, vocabulary tracking, flashcard export) — pricing not yet live
- **Notes**: Install CTA button currently placeholders to `#`; will be replaced with actual Chrome Web Store URL once extension is listed
