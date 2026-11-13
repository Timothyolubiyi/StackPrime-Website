import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { api } from '../api';
import { useAuth } from '../auth';
import { ROLE_LABEL, copyText, fmtDateTime } from '../format';
import type { SessionRow } from '../types';
import { Badge, Button, Empty, Field, Loaded, Notice, Page, Panel, useAction, useLoad } from '../ui';

export function Account() {
  const { me } = useAuth();
  return (
    <Page title="Account" intro={me?.email}>
      {me?.mfaEnrolmentRequired && (
        <Notice kind="warn">
          <strong>{me.org?.name}</strong> requires two-step verification. Turn it on below to unlock the rest of the platform.
        </Notice>
      )}
      <Profile />
      <TwoStep />
      <Password />
      <Sessions />
    </Page>
  );
}

function Profile() {
  const { me } = useAuth();
  return (
    <Panel title="Profile">
      <div className="stack">
        <div><span className="muted">Email</span><br />{me?.email} {me?.emailVerified && <Badge tone="good">Confirmed</Badge>}</div>
        {me?.name && <div><span className="muted">Name</span><br />{me.name}</div>}
        <div>
          <span className="muted">Organisation</span><br />
          {me?.org ? <>{me.org.name} <span className="muted">({me.roles.map((r) => ROLE_LABEL[r]).join(', ')})</span></> : 'None. This is a personal account.'}
        </div>
      </div>
    </Panel>
  );
}

function TwoStep() {
  const { me, reload } = useAuth();
  const [stage, setStage] = useState<'idle' | 'scan' | 'codes'>('idle');
  const [secret, setSecret] = useState('');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[]>([]);
  const [pw, setPw] = useState('');
  const [offCode, setOffCode] = useState('');
  const { busy, error, run, setError } = useAction();

  async function start() {
    const r = await run(() => api<{ secret: string; otpauthUrl: string }>('/v1/auth/mfa/setup', { method: 'POST', body: {} }));
    if (!r) return;
    setSecret(r.secret);
    setQr(await QRCode.toDataURL(r.otpauthUrl, { margin: 1, width: 176 }));
    setStage('scan');
  }
  async function enable(e: FormEvent) {
    e.preventDefault();
    const r = await run(() => api<{ recoveryCodes: string[] }>('/v1/auth/mfa/enable', { method: 'POST', body: { code: code.trim() } }));
    if (!r) return;
    setRecovery(r.recoveryCodes);
    setStage('codes');
    setCode('');
    await reload();
  }
  async function disable(e: FormEvent) {
    e.preventDefault();
    const r = await run(() => api('/v1/auth/mfa/disable', { method: 'POST', body: { password: pw, code: offCode.trim() } }));
    if (r) { setPw(''); setOffCode(''); await reload(); }
  }

  // Clear stale errors when switching stages.
  useEffect(() => setError(null), [stage, setError]);

  if (stage === 'codes') {
    const text = recovery.join('\n');
    return (
      <Panel title="Save your recovery codes">
        <Notice kind="warn">Store these somewhere safe, like a password manager. Each code works once, and they are not shown again.</Notice>
        <ul className="codes mono">{recovery.map((c) => <li key={c}>{c}</li>)}</ul>
        <div className="row">
          <Button kind="quiet" onClick={() => copyText(text)}>Copy all</Button>
          <a className="btn btn-quiet" download="stackprime-recovery-codes.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}>Download as a file</a>
          <Button onClick={() => { setRecovery([]); setStage('idle'); }}>I have saved them</Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Two-step verification" note="Adds a 6-digit code from an authenticator app to every sign-in.">
      {error && <Notice kind="bad">{error}</Notice>}
      {me?.mfaEnabled ? (
        <>
          <p><Badge tone="good">On</Badge></p>
          {me.org?.mfaRequired ? (
            <p className="muted">Your organisation requires it, so it cannot be turned off.</p>
          ) : (
            <form className="form" onSubmit={disable}>
              <h3>Turn it off</h3>
              <Field label="Password"><input type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
              <Field label="Authentication code"><input inputMode="numeric" autoComplete="one-time-code" required value={offCode} onChange={(e) => setOffCode(e.target.value)} /></Field>
              <Button type="submit" kind="danger" busy={busy}>Turn off two-step verification</Button>
            </form>
          )}
        </>
      ) : stage === 'scan' ? (
        <div className="split">
          <div className="stack">
            <p>1. Scan this code with an authenticator app such as Google Authenticator, Microsoft Authenticator or Authy.</p>
            <img className="qr" src={qr} alt="QR code for your authenticator app" />
            <p className="small muted">Cannot scan? Enter this key instead:<br /><span className="mono">{secret}</span></p>
          </div>
          <form className="form" onSubmit={enable}>
            <p>2. Enter the 6-digit code the app shows.</p>
            <Field label="Authentication code"><input inputMode="numeric" autoComplete="one-time-code" required pattern="\d{6}" value={code} onChange={(e) => setCode(e.target.value)} /></Field>
            <Button type="submit" busy={busy}>Turn on two-step verification</Button>
          </form>
        </div>
      ) : (
        <div className="row">
          <Badge>Off</Badge>
          <Button onClick={start} busy={busy}>Set up two-step verification</Button>
        </div>
      )}
    </Panel>
  );
}

function Password() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [done, setDone] = useState(false);
  const { busy, error, run } = useAction();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setDone(false);
    const r = await run(() => api('/v1/auth/change-password', { method: 'POST', body: { currentPassword: current, newPassword: next } }));
    if (r) { setDone(true); setCurrent(''); setNext(''); }
  }
  return (
    <Panel title="Password">
      <form className="form" onSubmit={submit}>
        {done && <Notice kind="good">Password changed. Your other devices were signed out.</Notice>}
        {error && <Notice kind="bad">{error}</Notice>}
        <Field label="Current password"><input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
        <Field label="New password" hint="At least 12 characters, with letters and numbers.">
          <input type="password" autoComplete="new-password" required minLength={12} value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Button type="submit" busy={busy}>Change password</Button>
      </form>
    </Panel>
  );
}

function Sessions() {
  const { logout } = useAuth();
  const list = useLoad(() => api<{ sessions: SessionRow[] }>('/v1/auth/sessions'), []);
  const { busy, error, run } = useAction();

  async function revoke(id: string) {
    const r = await run(() => api(`/v1/auth/sessions/${id}`, { method: 'DELETE' }).then(() => true));
    if (r) list.reload();
  }
  async function everywhere() {
    if (!window.confirm('Sign out of every device, including this one?')) return;
    const r = await run(() => api('/v1/auth/logout-all', { method: 'POST', body: {} }).then(() => true));
    if (r) await logout();
  }
  return (
    <Panel title="Where you are signed in" note="Remove any device you do not recognise.">
      {error && <Notice kind="bad">{error}</Notice>}
      <Loaded state={list}>
        {({ sessions }) =>
          sessions.length === 0 ? (
            <Empty title="No active sessions" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Device</th><th>Last used</th><th>Address</th><th /></tr></thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td>{(s.userAgent ?? 'Unknown device').slice(0, 70)} {s.current && <Badge tone="good">This device</Badge>}</td>
                      <td>{fmtDateTime(s.lastUsedAt)}</td>
                      <td className="mono">{s.ip ?? ''}</td>
                      <td>{!s.current && <Button small kind="quiet" busy={busy} onClick={() => revoke(s.id)}>Sign out</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Loaded>
      <div><Button kind="danger" busy={busy} onClick={everywhere}>Sign out everywhere</Button></div>
    </Panel>
  );
}
