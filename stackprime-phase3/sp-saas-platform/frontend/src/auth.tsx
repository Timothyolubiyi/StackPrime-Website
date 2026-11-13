import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, onSignedOut, refreshSession, setToken } from './api';
import { Splash } from './ui';
import type { Me } from './types';

interface AuthValue {
  status: 'loading' | 'out' | 'in';
  me: Me | null;
  login: (email: string, password: string, extra?: { totp?: string; recoveryCode?: string }) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  can: (permission: string) => boolean;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: 'loading' | 'out' | 'in'; me: Me | null }>({ status: 'loading', me: null });

  const reload = useCallback(async () => {
    const me = await api<Me>('/v1/me');
    setState({ status: 'in', me });
  }, []);

  useEffect(() => {
    onSignedOut(() => setState({ status: 'out', me: null }));
    (async () => {
      // On every page load, try to resume the session from the refresh cookie.
      if (await refreshSession()) {
        try {
          await reload();
          return;
        } catch {
          /* fall through to signed out */
        }
      }
      setState({ status: 'out', me: null });
    })();
  }, [reload]);

  const login: AuthValue['login'] = async (email, password, extra) => {
    const r = await api<{ accessToken: string }>('/v1/auth/login', { method: 'POST', auth: false, body: { email, password, ...extra } });
    setToken(r.accessToken);
    await reload();
  };

  const logout = async () => {
    try {
      await api('/v1/auth/logout', { method: 'POST', auth: false, body: {} });
    } catch {
      /* the cookie is cleared by the server when it can; either way this browser is signed out */
    }
    setToken(null);
    setState({ status: 'out', me: null });
  };

  const value = useMemo<AuthValue>(
    () => ({ ...state, login, logout, reload, can: (p) => Boolean(state.me?.permissions.includes(p)) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

export function RequireAuth({ children, staff }: { children: ReactNode; staff?: boolean }) {
  const { status, me } = useAuth();
  const loc = useLocation();
  if (status === 'loading') return <Splash />;
  if (status === 'out') return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  // An organisation can require two-step verification; until it is set up, only the account page is usable.
  if (me?.mfaEnrolmentRequired && !loc.pathname.startsWith('/account')) return <Navigate to="/account" replace />;
  if (staff && !me?.isStaff) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
