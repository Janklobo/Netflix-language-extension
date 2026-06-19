import { sendToBackground } from './message';
import { debug } from './debug';

export async function trackEvent(eventName: string, properties: Record<string, unknown> = {}): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
      await sendToBackground({
        type: 'TRACK_EVENT',
        payload: { eventName, properties },
      }).catch(() => {});
    } else {
      debug('analytics', 'Extension context not available, skipping message trackEvent:', eventName, properties);
    }
  } catch (err) {
    debug('analytics', 'Failed to send TRACK_EVENT message:', err);
  }
}
