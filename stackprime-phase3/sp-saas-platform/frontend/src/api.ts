// The browser talks to the API on the same origin (/v1/...). The short-lived access token lives only in
// memory (never localStorage); the long-lived refresh token is an httpOnly cookie the page cannot read.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public issues: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

let token: string | null = null;
let signedOutHandler: (() => void) | null = null;
export const setToken = (t: string | null) => {
  token = t;
};
export const onSignedOut = (fn: () => void) => {
  signedOutHandler = fn;
};

interface Opts {
  method?: string;
  body?: unknown;
  auth?: boolean; // send the access token (default true)
}

async function send<T>(path: string, o: Opts): Promise<T> {
  const headers: Record<string, string> = {};
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  if (o.auth !== false && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(path, {
      method: o.method ?? 'GET',
      headers,
      body: o.body === undefined ? undefined : JSON.stringify(o.body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => null)) as { code?: string; message?: string; issues?: { path: string; message: string }[] } | null;
  if (!res.ok) throw new ApiError(res.status, json?.code ?? 'ERROR', json?.message ?? 'Something went wrong.', json?.issues ?? []);
  return json as T;
}

// One refresh at a time, shared by everything that needs it.
let refreshing: Promise<boolean> | null = null;
export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await send<{ accessToken: string }>('/v1/auth/refresh', { method: 'POST', auth: false, body: {} });
          token = r.accessToken;
          return true;
        } catch (e) {
          // Another tab rotated the cookie a moment ago; the browser already holds the new one. Try again.
          if (e instanceof ApiError && e.code === 'REFRESH_RACE' && attempt === 0) {
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
          break;
        }
      }
      token = null;
      return false;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export async function api<T = unknown>(path: string, o: Opts = {}): Promise<T> {
  try {
    return await send<T>(path, o);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && e.code === 'UNAUTHENTICATED' && o.auth !== false) {
      if (await refreshSession()) return send<T>(path, o);
      signedOutHandler?.();
    }
    throw e;
  }
}

export const errText = (e: unknown): string => (e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
export const errCode = (e: unknown): string => (e instanceof ApiError ? e.code : '');
