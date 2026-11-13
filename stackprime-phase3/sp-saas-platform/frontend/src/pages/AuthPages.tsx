import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errCode, errText } from '../api';
import { useAuth } from '../auth';
import { Button, Field, Notice, Splash, useAction } from '../ui';

const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') && !n.includes('\\') ? n : '/dashboard');
const PASSWORD_HINT = 'At least 12 characters, with letters and numbers.';

export function Login() {
  const { login, status } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [needCode, setNeedCode] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'in') nav(next, { replace: true });
  }, [status, next, nav]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setUnverified(false);
    try {
      const extra = needCode ? (useRecovery ? { recoveryCode: code.trim() } : { totp: code.trim() }) : undefined;
      await login(email.trim(), password, extra);
    } catch (err) {
      const c = errCode(err);
      if (c === 'MFA_REQUIRED') setNeedCode(true);
      else if (c === 'EMAIL_NOT_VERIFIED') setUnverified(true);
      else setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    await api('/v1/auth/resend-verification', { method: 'POST', auth: false, body: { email: email.trim() } }).catch(() => undefined);
    setResent(true);
  }

  return (
    <div className="auth-card">
      <h1>Sign in</h1>
      <form className="form" onSubmit={submit}>
        {error && <Notice kind="bad">{error}</Notice>}
        {unverified && (
          <Notice kind="warn">
            <p>Confirm your email address first. We sent a link when you signed up.</p>
            {resent ? <p>A new link is on its way.</p> : <Button type="button" kind="quiet" onClick={resend}>Send the link again</Button>}
          </Notice>
        )}
        <Field label="Email">
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={needCode} />
        </Field>
        <Field label="Password">
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={needCode} />
        </Field>
        {needCode && (
          <Field
            label={useRecovery ? 'Recovery code' : 'Authentication code'}
            hint={useRecovery ? 'Each recovery code works once.' : 'The 6-digit code from your authenticator app.'}
          >
            <input inputMode={useRecovery ? 'text' : 'numeric'} autoComplete="one-time-code" autoFocus required value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
        )}
        <Button type="submit" busy={busy}>{needCode ? 'Verify and sign in' : 'Sign in'}</Button>
        {needCode && (
          <button type="button" className="btn btn-quiet btn-small" onClick={() => { setUseRecovery(!useRecovery); setCode(''); }}>
            {useRecovery ? 'Use my authenticator app' : 'Use a recovery code'}
          </button>
        )}
        <p className="small"><Link to="/forgot-password">Forgot your password?</Link></p>
      </form>
      <p className="small muted">
        New here? <Link to={`/signup${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link>
      </p>
    </div>
  );
}

export function Signup() {
  const [params] = useSearchParams();
  const next = params.get('next');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const { busy, error, run } = useAction();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await run(() => api('/v1/auth/signup', { method: 'POST', auth: false, body: { email: email.trim(), password, ...(name.trim() ? { name: name.trim() } : {}) } }));
    if (ok !== undefined) setDone(true);
  }

  if (done) {
    return (
      <div className="auth-card">
        <h1>Check your email</h1>
        <p>We sent a confirmation link to <strong>{email}</strong>. Open it to activate your account, then sign in.</p>
        <p className="small muted">Nothing arrived after a few minutes? Check your spam folder.</p>
        <Link className="btn btn-primary" to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Go to sign in</Link>
      </div>
    );
  }
  return (
    <div className="auth-card">
      <h1>Create your account</h1>
      <form className="form" onSubmit={submit}>
        {error && <Notice kind="bad">{error}</Notice>}
        <Field label="Name (optional)"><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email"><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password" hint={PASSWORD_HINT}>
          <input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" busy={busy}>Create account</Button>
      </form>
      <p className="small muted">Already have an account? <Link to="/login">Sign in</Link></p>
    </div>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<'working' | 'ok' | 'bad'>('working');
  const [message, setMessage] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // React runs effects twice in development; the link works only once
    started.current = true;
    if (!token) { setState('bad'); setMessage('This link is incomplete. Open it again from your email.'); return; }
    api<{ message: string }>('/v1/auth/verify-email', { method: 'POST', auth: false, body: { token } })
      .then(() => setState('ok'))
      .catch((e) => { setState('bad'); setMessage(errText(e)); });
  }, [token]);

  if (state === 'working') return <Splash />;
  return (
    <div className="auth-card">
      <h1>{state === 'ok' ? 'Email confirmed' : 'We could not confirm your email'}</h1>
      {state === 'ok' ? <p>Your account is active.</p> : <Notice kind="bad">{message}</Notice>}
      <Link className="btn btn-primary" to="/login">Sign in</Link>
    </div>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { busy, error, run } = useAction();
  async function submit(e: FormEvent) {
    e.preventDefault();
    const r = await run(() => api('/v1/auth/forgot-password', { method: 'POST', auth: false, body: { email: email.trim() } }));
    if (r !== undefined) setSent(true);
  }
  return (
    <div className="auth-card">
      <h1>Reset your password</h1>
      {sent ? (
        <Notice kind="good">If that address has an account, a reset link is on its way. It works once and expires in an hour.</Notice>
      ) : (
        <form className="form" onSubmit={submit}>
          {error && <Notice kind="bad">{error}</Notice>}
          <Field label="Email"><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button type="submit" busy={busy}>Send reset link</Button>
        </form>
      )}
      <p className="small"><Link to="/login">Back to sign in</Link></p>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const { busy, error, run } = useAction();
  async function submit(e: FormEvent) {
    e.preventDefault();
    const r = await run(() => api('/v1/auth/reset-password', { method: 'POST', auth: false, body: { token, password } }));
    if (r !== undefined) setDone(true);
  }
  return (
    <div className="auth-card">
      <h1>Choose a new password</h1>
      {done ? (
        <>
          <Notice kind="good">Password updated. You were signed out everywhere.</Notice>
          <Link className="btn btn-primary" to="/login">Sign in</Link>
        </>
      ) : (
        <form className="form" onSubmit={submit}>
          {error && <Notice kind="bad">{error}</Notice>}
          {!token && <Notice kind="warn">This link is incomplete. Open it again from your email.</Notice>}
          <Field label="New password" hint={PASSWORD_HINT}>
            <input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" busy={busy} disabled={!token}>Save new password</Button>
        </form>
      )}
    </div>
  );
}

export function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { reload, me } = useAuth();
  const nav = useNavigate();
  const { busy, error, run } = useAction();
  async function accept() {
    const r = await run(() => api('/v1/invites/accept', { method: 'POST', body: { token } }));
    if (r !== undefined) {
      await reload();
      nav('/organisation', { replace: true });
    }
  }
  return (
    <div className="auth-card">
      <h1>Join an organisation</h1>
      {error && <Notice kind="bad">{error}</Notice>}
      {me?.org ? (
        <Notice kind="warn">Your account already belongs to <strong>{me.org.name}</strong>. An account can belong to one organisation, so leave it first if you want to join another.</Notice>
      ) : (
        <>
          <p>You are signed in as <strong>{me?.email}</strong>. The invitation only works for the address it was sent to.</p>
          <Button onClick={accept} busy={busy} disabled={!token}>Accept the invitation</Button>
        </>
      )}
    </div>
  );
}
