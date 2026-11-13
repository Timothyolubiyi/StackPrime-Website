import type { Me } from './types';

const API = '/v1';
let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) { accessToken = token; }

async function refreshAccess(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API}/auth/refresh`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) return false;
        const data = await res.json();
        accessToken = data.accessToken;
        return Boolean(accessToken);
      } catch { return false; }
      finally { refreshPromise = null; }
    })();
  }
  return refreshPromise;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, code: string | undefined, message: string) {
    super(message); this.status = status; this.code = code;
  }
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API}${path}`, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshAccess()) return api<T>(path, init, false);
  }
  const raw = await response.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) {
    throw new ApiError(response.status, data?.code, data?.message || `Request failed (${response.status}).`);
  }
  return data as T;
}

export async function loadMe(): Promise<Me> {
  return api<Me>('/me');
}
export function clearAuth() { accessToken = null; }
