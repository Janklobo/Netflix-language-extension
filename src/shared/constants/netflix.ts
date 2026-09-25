// Netflix selectors — data-uia preferred but class fallbacks added as Netflix changes DOM
export const NETFLIX_SELECTORS = {
  PLAYER: '[data-uia="player"]',
  // Support data-uia, class, and text-container variations across Netflix web player updates
  SUBTITLE_CONTAINER: '[data-uia="player-timedtext"], .player-timedtext, .player-timedtext-text-container, [class*="player-timedtext"], [class*="timedtext"]',
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
