// Netflix selectors — data-uia preferred but class fallbacks added as Netflix changes DOM
export const NETFLIX_SELECTORS = {
  PLAYER: '[data-uia="player"]',
  // Try data-uia first (stable), fall back to class name (current as of 2026-06)
  SUBTITLE_CONTAINER: '[data-uia="player-timedtext"], .player-timedtext',
  VIDEO: 'video',
} as const;

// Our injected elements use data-linguaflix-* to avoid collision with Netflix
export const LINGUAFLIX_ATTR = {
  SUBTITLE: 'data-linguaflix-subtitle',
  WORD: 'data-linguaflix-word',
  POPUP: 'data-linguaflix-popup',
  BANNER: 'data-linguaflix-banner',
  CONTAINER: 'data-linguaflix-container',
} as const;
