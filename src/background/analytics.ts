import { debug } from '@/shared/utils/debug';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://app.posthog.com';

export async function trackEventDirect(
  eventName: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  if (!POSTHOG_KEY || POSTHOG_KEY.includes('placeholder')) {
    debug('analytics', 'PostHog API key is placeholder or empty, skipping capture:', eventName);
    return;
  }

  try {
    const url = `${POSTHOG_HOST.replace(/\/$/, '')}/capture/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event: eventName,
        properties: {
          distinct_id: distinctId,
          token: POSTHOG_KEY,
          $lib: 'linguaflix-extension-sw',
          ...properties,
        },
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      debug('analytics', 'PostHog capture request failed with status:', response.status);
    } else {
      debug('analytics', 'PostHog captured event successfully:', eventName);
    }
  } catch (err) {
    debug('analytics', 'PostHog track error:', err);
  }
}
