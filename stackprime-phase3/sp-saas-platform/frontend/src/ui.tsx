import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { errText } from './api';

export function Splash() {
  return (
    <div className="splash" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>Loading</span>
    </div>
  );
}

export function Page({ title, intro, actions, children }: { title: string; intro?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          {intro && <p className="intro">{intro}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

export function Panel({ title, note, children, id }: { title?: string; note?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="panel" id={id}>
      {title && (
        <header className="panel-head">
          <h2>{title}</h2>
          {note && <p className="note">{note}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'good' | 'warn' | 'bad'; children: ReactNode }) {
  return (
    <div className={`notice notice-${kind}`} role={kind === 'bad' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: 'primary' | 'quiet' | 'danger'; busy?: boolean; small?: boolean };
export function Button({ kind = 'primary', busy, small, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button className={`btn btn-${kind}${small ? ' btn-small' : ''}${className ? ` ${className}` : ''}`} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy ? 'Working…' : children}
    </button>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'good' | 'warn' | 'bad'; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

/** Loads data when the component mounts (and again when deps change or reload() is called). */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loaderRef
      .current()
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((e) => live && setState({ data: null, error: errText(e), loading: false }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/** Wraps an action so its button shows "Working…" and its error is shown in one place. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(errText(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, run, setError };
}

export function Loaded<T>({ state, children }: { state: { data: T | null; error: string | null; loading: boolean }; children: (data: T) => ReactNode }) {
  if (state.loading && !state.data) return <Splash />;
  if (state.error) return <Notice kind="bad">{state.error}</Notice>;
  if (!state.data) return null;
  return <>{children(state.data)}</>;
}
