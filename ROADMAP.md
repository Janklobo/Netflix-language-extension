# LinguaFlix Project Roadmap & Execution Plan

This roadmap tracks our planned stages for polishing, testing, and deploying the **LinguaFlix** Chrome Extension and its companion marketing website.

## Phase 1: Error Monitoring & Testing
Ensure the extension is bulletproof, handles failures gracefully without crashing Netflix, and has robust test coverage.

### Sentry Error Monitoring (Phase 12)
- [ ] Connect Sentry in content scripts, options page, and popup React UI using the `VITE_SENTRY_DSN` environment variable.
- [ ] Add global error boundary wrappers for the React UI in popup and options.
- [ ] Wrap critical content script interfaces (observer mutations, dictionary lookups, translation requests) in `try/catch` reporting blocks to guarantee zero-crash behavior on the Netflix playback page.

### End-to-End Testing (Phase 13)
- [ ] Write E2E integration tests in Playwright simulating:
  - Mocking the Supabase auth response to test successful email and Google Sign-in.
  - Toggling extension settings (e.g. switching subtitle modes from "double" to "click") and verifying state sync in `chrome.storage.local`.
  - Simulating text selections and click translations to verify dictionary parsing behavior.

---

## Phase 2: Design & Aesthetics
Upgrade the visual presentation of the Popup and Options UI to feel premium, modern, and aligned with the "Neon-Flix" dark/futuristic branding.

### UI Enhancements
- [ ] **Color Palette**: Shift away from generic colors and implement custom HSL color systems with neon accents (electric blue and violet) matching the website branding.
- [ ] **Glassmorphism & Shadows**: Apply sleek semi-transparent backdrops, borders, and modern box-shadow structures.
- [ ] **Typography**: Load beautiful typography (e.g., Outfit or Inter) instead of relying on browser defaults.
- [ ] **Micro-animations**: Integrate smooth CSS transitions, interactive hover scaling, and subtle indicator movements for active states.
- [ ] **Custom Scrollbars**: Add unified dark-mode scroll styling across all components.

---

## Phase 3: Review & Upgrades
Optimize existing code, check performance metrics, and upgrade components to guarantee peak performance during active Netflix streaming.

### Code Audit & Optimization
- [ ] Profile DOM mutation observer CPU footprint to make sure it doesn't cause lag on video playback.
- [ ] Ensure pre-fetch concurrency limit (currently 3) is working smoothly without rate-limiting Supabase Edge functions.
- [ ] Refactor manual Base64 decoder functions if needed, and confirm strict TypeScript compatibility across all modules (zero `any` types).

---

## Phase 4: Deployment Preparation (Store & Web)
Package the extension for the Chrome Web Store and ready the marketing website for public traffic.

### Chrome Web Store Prep (Phase 14)
- [ ] Verify that all asset icons are properly configured (16px, 32px, 48px, 128px) and not placeholders.
- [ ] Build a packaging script (`pnpm package`) that runs production builds, removes development console logs/source maps, and zips the files to `dist/linguaflix.zip`.
- [ ] Write Store descriptions and prepare promotional assets (screenshots/video).

### Marketing Website Completion
- [ ] Inspect the `./website` folder and wire up the pricing plan grids, test links, and features walkthrough.
- [ ] Set up the Chrome Web Store CTA button to link to the extension's live store listing URL.

---

## Phase 5: User Analytics & Post-Launch
Observe user engagement, collect feedback, and prepare for scaling.

### PostHog Integration (Phase 11)
- [ ] Connect PostHog utilizing direct HTTP capture calls in the background service worker.
- [ ] Instrument tracking events for user onboarding, settings changes, translation caching rate, and dictionary clicks.
- [ ] Configure standard event tracking on the marketing website.
