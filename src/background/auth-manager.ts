import type { UserSession } from '@/shared/types/extension.types';
import { getSession, setSession } from '@/shared/utils/storage';
import { TOKEN_REFRESH_ALARM } from '@/shared/constants/cache';
import { debug } from '@/shared/utils/debug';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function decodeJwt(token: string): { sub: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(payloadBase64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('[AUTH] Failed to decode JWT:', err);
    return null;
  }
}

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

export async function signInWithGoogle(): Promise<UserSession | null> {
  try {
    debug('auth', 'Starting Google OAuth flow via Supabase');

    const redirectUrl = chrome.identity.getRedirectURL();
    debug('auth', 'Redirect URL:', redirectUrl);

    // Delegate OAuth login to Supabase, passing the extension's redirect URL.
    // Supabase will handle Google OAuth and redirect back to the extension with tokens.
    const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;

    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true,
    });

    if (!responseUrl) {
      debug('auth', 'Google OAuth cancelled by user');
      return null;
    }

    debug('auth', 'Got response URL from Supabase');

    const url = new URL(responseUrl);
    // Parse the hash parameters from Supabase redirect (e.g., #access_token=...&refresh_token=...)
    const hash = url.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresInStr = params.get('expires_in');

    if (!accessToken || !refreshToken) {
      debug('auth', 'Missing tokens in response URL');
      return null;
    }

    const decoded = decodeJwt(accessToken);
    if (!decoded) {
      debug('auth', 'Failed to decode access token');
      return null;
    }

    debug('auth', 'Google sign in success! User:', decoded.email);

    const session: UserSession = {
      userId: decoded.sub,
      email: decoded.email,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + (expiresInStr ? parseInt(expiresInStr, 10) : 3600) * 1000,
    };

    await setSession(session);
    scheduleTokenRefresh(session.expiresAt);
    debug('auth', 'Signed in as', session.email);
    return session;
  } catch (err) {
    debug('auth', 'Google sign in failed:', err);
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
