import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, clearAuth, loadMe, setAccessToken } from './api';
import type { Me } from './types';

interface AuthValue {
  user: Me | null;
  loading: boolean;
  signIn: (email: string, password: string, totp?: string) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  setUser: (u: Me | null) => void;
}
const Context = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const me = await loadMe();
    setUser(me);
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/v1/auth/refresh', { method: 'POST', credentials: 'include' });
        if (r.ok) {
          const data = await r.json();
          setAccessToken(data.accessToken);
          setUser(await loadMe());
        }
      } catch { /* signed out */ }
      finally { setLoading(false); }
    })();
  }, []);

  const signIn = async (email: string, password: string, totp?: string) => {
    const result = await api<{ accessToken: string; user: Me; mfaEnrolmentRequired: boolean }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password, ...(totp ? { totp } : {}) }) }
    );
    setAccessToken(result.accessToken);
    await reload();
  };

  const signOut = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } finally {
      clearAuth(); setUser(null);
    }
  };

  const value = useMemo(() => ({ user, loading, signIn, signOut, reload, setUser }), [user, loading]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
