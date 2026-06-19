import type { UserSession } from '@/shared/types/extension.types';
import { getSession, setSession } from '@/shared/utils/storage';
import { TOKEN_REFRESH_ALARM } from '@/shared/constants/cache';
import { debug } from '@/shared/utils/debug';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export async function signIn(email: string, password: string): Promise<UserSession | null> {
  try {
    debug('auth', 'Attempting sign in with email:', email);
    debug('auth', 'Supabase URL:', SUPABASE_URL);

    const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
    debug('auth', 'Request URL:', url);

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });

    debug('auth', 'Response status:', resp.status, resp.statusText);

    if (!resp.ok) {
      const error = await resp.json();
      console.error('[AUTH] Sign in failed (response not ok):', error);
      debug('auth', 'Sign in failed:', error.message);
      return null;
    }

    const data = (await resp.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      user: { id: string; email: string };
    };

    debug('auth', 'Sign in success! User:', data.user.email);

    const session: UserSession = {
      userId: data.user.id,
      email: data.user.email,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    await setSession(session);
    scheduleTokenRefresh(session.expiresAt);
    debug('auth', 'Signed in as', session.email);
    return session;
  } catch (err) {
    console.error('[AUTH] Sign in caught error:', err);
    debug('auth', 'Sign in failed:', err);
    return null;
  }
}

export async function signOut(): Promise<void> {
  const session = await getSession();
  if (session) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          apikey: SUPABASE_ANON_KEY,
        },
      });
    } catch (err) {
      debug('auth', 'Logout request failed (ignoring):', err);
    }
  }
  await setSession(null);
  await chrome.alarms.clear(TOKEN_REFRESH_ALARM);
  debug('auth', 'Signed out');
}

export async function refreshSession(): Promise<UserSession | null> {
  const session = await getSession();
  if (!session) return null;

  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });

    if (!resp.ok) {
      debug('auth', 'Token refresh failed, clearing session');
      await setSession(null);
      return null;
    }

    const data = (await resp.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      user: { id: string; email: string };
    };

    const newSession: UserSession = {
      userId: data.user.id,
      email: data.user.email,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    await setSession(newSession);
    scheduleTokenRefresh(newSession.expiresAt);
    debug('auth', 'Token refreshed');
    return newSession;
  } catch (err) {
    debug('auth', 'Token refresh error:', err);
    return null;
  }
}

function scheduleTokenRefresh(expiresAt: number): void {
  // Refresh 5 minutes before expiry, minimum 1 minute delay
  const msUntilRefresh = expiresAt - Date.now() - 5 * 60 * 1000;
  const delayInMinutes = Math.max(1, msUntilRefresh / 60000);
  chrome.alarms.create(TOKEN_REFRESH_ALARM, { delayInMinutes });
}
