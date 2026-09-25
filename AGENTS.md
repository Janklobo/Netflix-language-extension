# LinguaFlix Project Context & Instructions

## 1. Developer Interaction & Working Style Rules
- **Terminal Commands**: Whenever a command needs to be executed (such as `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, or `supabase` commands), write out the exact command clearly in code blocks so it can be copied and pasted into the local terminal.
- **Strict TypeScript**: Enforce strict TypeScript everywhere. Zero `any` types allowed.
- **Error Safety**: Never throw uncaught exceptions in content scripts that could break Netflix video playback. Always wrap top-level mutations and DOM hooks in `try/catch`.
- **Clean Logging**: Never use `console.log` directly; use our custom `debug()` utility (which gets stripped in production builds).
- **Styling**: Use Tailwind CSS classes exclusively. No inline styles in React components.
- **UI Design Source (Stitch AI)**: UI designs and visual specifications (Popup, Options, and Website) are created using Stitch AI. The aesthetic direction is a **warm, editorial Light Yellow/Butter-Cream Design** (warm linen/pale butter background `#FAF7EE` / `#F5F3EC`, deep espresso/charcoal typography `#1A1817`, crisp architectural hairline borders `#E6E1D4`, warm burnt orange `#E13D18` and bold charcoal pill accents, with generous editorial whitespace and playful yet refined micro-elements like Givingli & Heron AI). The application is a **universal language immersion tool** for any language on Netflix (Spanish, French, German, Japanese, Korean, Italian, English, etc.), not limited or tailored exclusively to any single language.

---

## 2. Project Backstory & Tech Stack
**LinguaFlix** is a modern, high-performance Chrome Extension (Manifest V3) for Netflix dual subtitles and language learning (focusing on Japanese & English).

### Tech Stack:
- **Build System**: Vite 5 + `vite-plugin-web-extension` + `@vitejs/plugin-react` (using `pnpm`).
- **Extension Architecture**: Manifest V3 with 4 strict execution contexts:
  1. *Service Worker* (`src/background/`): Handles auth, alarms, background translations, storage, analytics, and message routing.
  2. *Content Script* (`src/content/`): DOM mutation observers on Netflix player, subtitle injection, text tokenization, and popup tooltips.
  3. *Page Script* (`src/injected/`): Isolated page-level hooks.
  4. *Popup / Options UI* (`src/popup/`, `src/options/`): React 18 + Tailwind CSS.
- **Backend / Database**: Supabase (Postgres + Supabase Auth + Supabase Edge Functions).
- **Translation Proxy**: Google Cloud Translation API v2 proxied through a Supabase Edge Function (`/functions/v1/translate`) using `SUPABASE_ANON_KEY` and user JWTs.
- **Japanese Tokenizer**: `kuromoji` (morphological analyzer for Japanese text segmentation).
- **Telemetry & Monitoring**: PostHog Analytics + Sentry Error Monitoring.
- **Companion Website**: React + Vite + Tailwind marketing site in `./website/` folder ("Neon-Flix" dark/futuristic theme).

---

## 3. Critical Architecture Rules & Lessons Learned (DO NOT REVERT)
1. **DOM-Observed Text vs Track Interception**: Always translate DOM-observed subtitle text directly. Never translate intercepted network track text alone, as Netflix loads multiple language tracks simultaneously.
2. **Subtitle Gaps**: The subtitle observer must always notify on empty text to clear the translation overlay during silence/gaps between dialogue lines.
3. **Permanent DOM Observer**: `playerObserver` must remain permanently active (throttled at 300ms) because Netflix dynamically replaces the `.player-timedtext` container during playback or track switching.
4. **Debounced DOM Extraction**: Always debounce DOM text extraction by 60ms to prevent partial/intermediate text reads.
5. **Storage over SW Scope**: Service workers in MV3 can be terminated at any time by Chrome. Never store auth tokens or translation cache in JS module-level memory; always use `chrome.storage.local`.
6. **Supabase Edge Function Auth**: Edge functions MUST use `SUPABASE_ANON_KEY` and pass user bearer tokens to `createClient(..., { global: { headers: { Authorization: authHeader } } })` rather than manual `getUser(token)` extraction to support asymmetric ECC P-256 JWTs.

---

## 4. Current Status & Future Roadmap
- **Phase 13: Testing**: Write Vitest unit tests and Playwright E2E integration tests.
- **Phase 14: Chrome Web Store Prep**: Build production packaging scripts (`pnpm package`), audit assets, generate Web Store graphics, and finalize `dist/linguaflix.zip`.
- **UI & Aesthetics Polish**: Upgrade Extension Popup & Options pages to match the marketing website's "Neon-Flix" dark futuristic design (HSL neon accents, glassmorphism, Outfit/Inter typography, smooth micro-animations).
- **Dynamic Settings Wiring**: Wire up dynamic font size adjustments and pixel-accurate subtitle positioning.
- **Google OAuth2**: Add Google Sign-in flow via `chrome.identity.launchWebAuthFlow`.
- **Marketing Site Completion**: Wire up CTA links and pricing tables in `./website/`.
