import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ALL_ROLES, ROLE_HELP, ROLE_LABEL, fmtDate, fmtDateTime } from '../format';
import type { AuditEvent, Invite, Member, Role } from '../types';
import { Badge, Button, Empty, Field, Loaded, Notice, Page, Panel, useAction, useLoad } from '../ui';

export function Organisation() {
  const { me } = useAuth();
  return me?.org ? <OrgHome /> : <CreateOrg />;
}

function CreateOrg() {
  const { reload } = useAuth();
  const [name, setName] = useState('');
  const { busy, error, run } = useAction();
  async function submit(e: FormEvent) {
    e.preventDefault();
    const r = await run(() => api('/v1/orgs', { method: 'POST', body: { name: name.trim() } }));
    if (r) await reload();
  }
  return (
    <Page title="Organisation" intro="An organisation lets you invite colleagues, give each person the right access, and share what you buy.">
      <Panel title="Create an organisation">
        <form className="form" onSubmit={submit}>
          {error && <Notice kind="bad">{error}</Notice>}
          <Field label="Organisation name"><input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Button type="submit" busy={busy}>Create organisation</Button>
        </form>
        <p className="small muted">You become its owner. If someone invited you instead, open the link in their invitation email.</p>
      </Panel>
    </Page>
  );
}

type Tab = 'members' | 'invites' | 'settings' | 'audit';

function OrgHome() {
  const { me, can, reload } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('members');
  const { error, run } = useAction();
  const tabs: [Tab, string, boolean][] = [
    ['members', 'Members', true],
    ['invites', 'Invitations', can('members:invite')],
    ['settings', 'Settings', can('org:update')],
    ['audit', 'Activity log', can('audit:read')],
  ];

  async function leave() {
    if (!window.confirm('Leave this organisation? You will lose access to what it has bought.')) return;
    const r = await run(() => api('/v1/orgs/me/leave', { method: 'POST', body: {} }).then(() => true));
    if (r) {
      await reload();
      nav('/dashboard');
    }
  }

  return (
    <Page
      title={me!.org!.name}
      intro={`Your role: ${me!.roles.map((r) => ROLE_LABEL[r]).join(', ')}.`}
      actions={<Button kind="danger" small onClick={leave}>Leave organisation</Button>}
    >
      {error && <Notice kind="bad">{error}</Notice>}
      <div className="tabs" role="tablist">
        {tabs.filter(([, , show]) => show).map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {tab === 'members' && <Members />}
      {tab === 'invites' && <Invites />}
      {tab === 'settings' && <Settings />}
      {tab === 'audit' && <Audit />}
    </Page>
  );
}

function RoleBadges({ roles }: { roles: Role[] }) {
  return <div className="row">{roles.map((r) => <Badge key={r}>{ROLE_LABEL[r]}</Badge>)}</div>;
}

function RolePicker({ value, onChange }: { value: Role[]; onChange: (r: Role[]) => void }) {
  const toggle = (r: Role) => onChange(value.includes(r) ? value.filter((x) => x !== r) : [...value, r]);
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: '.5rem' }}>
      {ALL_ROLES.map((r) => (
        <label className="check" key={r}>
          <input type="checkbox" checked={value.includes(r)} onChange={() => toggle(r)} />
          <span>{ROLE_LABEL[r]}<small>{ROLE_HELP[r]}</small></span>
        </label>
      ))}
    </fieldset>
  );
}

function Members() {
  const { me, can } = useAuth();
  const list = useLoad(() => api<{ members: Member[] }>('/v1/orgs/me/members'), []);
  const [editing, setEditing] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const { busy, error, run } = useAction();
  const manage = can('members:manage');

  async function save(id: string) {
    const r = await run(() => api(`/v1/orgs/me/members/${id}`, { method: 'PATCH', body: { roles } }));
    if (r) { setEditing(null); list.reload(); }
  }
  async function remove(m: Member) {
    if (!window.confirm(`Remove ${m.email} from the organisation?`)) return;
    const r = await run(() => api(`/v1/orgs/me/members/${m.id}`, { method: 'DELETE' }).then(() => true));
    if (r) list.reload();
  }

  return (
    <Panel>
      {error && <Notice kind="bad">{error}</Notice>}
      <Loaded state={list}>
        {({ members }) => (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Person</th><th>Roles</th><th>Two-step</th>{manage && <th />}</tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name ?? m.email}{m.name && <div className="small muted">{m.email}</div>}{m.id === me?.id && <Badge tone="good">You</Badge>}</td>
                    <td>
                      {editing === m.id ? (
                        <div className="stack">
                          <RolePicker value={roles} onChange={setRoles} />
                          <div className="row">
                            <Button small busy={busy} disabled={roles.length === 0} onClick={() => save(m.id)}>Save roles</Button>
                            <Button small kind="quiet" onClick={() => setEditing(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <RoleBadges roles={m.roles} />
                      )}
                    </td>
                    <td>{m.mfaEnabled ? 'On' : 'Off'}</td>
                    {manage && (
                      <td>
                        {editing !== m.id && (
                          <div className="row">
                            <Button small kind="quiet" onClick={() => { setEditing(m.id); setRoles(m.roles); }}>Change roles</Button>
                            {m.id !== me?.id && <Button small kind="danger" onClick={() => remove(m)}>Remove</Button>}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Loaded>
    </Panel>
  );
}

function Invites() {
  const list = useLoad(() => api<{ invites: Invite[] }>('/v1/orgs/me/invites'), []);
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<Role[]>(['STANDARD_USER']);
  const [sent, setSent] = useState<string | null>(null);
  const { busy, error, run } = useAction();

  async function invite(e: FormEvent) {
    e.preventDefault();
    setSent(null);
    const r = await run(() => api<{ emailSent: boolean }>('/v1/orgs/me/invites', { method: 'POST', body: { email: email.trim(), roles } }));
    if (r) {
      setSent(r.emailSent ? `Invitation sent to ${email.trim()}.` : `The invitation was created but the email could not be sent. Try again later.`);
      setEmail('');
      list.reload();
    }
  }
  async function cancel(id: string) {
    const r = await run(() => api(`/v1/orgs/me/invites/${id}`, { method: 'DELETE' }).then(() => true));
    if (r) list.reload();
  }

  return (
    <div className="split">
      <Panel title="Invite someone" note="They get an email. The invitation works for 7 days and only for that address.">
        <form className="form" onSubmit={invite}>
          {sent && <Notice kind="good">{sent}</Notice>}
          {error && <Notice kind="bad">{error}</Notice>}
          <Field label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <RolePicker value={roles} onChange={setRoles} />
          <Button type="submit" busy={busy} disabled={roles.length === 0}>Send invitation</Button>
        </form>
      </Panel>
      <Panel title="Waiting to be accepted">
        <Loaded state={list}>
          {({ invites }) =>
            invites.length === 0 ? (
              <Empty title="No pending invitations" />
            ) : (
              <div className="stack">
                {invites.map((i) => (
                  <div className="row" key={i.id} style={{ justifyContent: 'space-between' }}>
                    <div>
                      <strong>{i.email}</strong>
                      <div className="small muted">{i.roles.map((r) => ROLE_LABEL[r]).join(', ')}. Expires {fmtDate(i.expiresAt)}</div>
                    </div>
                    <Button small kind="quiet" onClick={() => cancel(i.id)}>Cancel</Button>
                  </div>
                ))}
              </div>
            )
          }
        </Loaded>
      </Panel>
    </div>
  );
}

function Settings() {
  const { me, reload } = useAuth();
  const [name, setName] = useState(me!.org!.name);
  const [mfa, setMfa] = useState(me!.org!.mfaRequired);
  const [saved, setSaved] = useState(false);
  const { busy, error, run } = useAction();

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    const r = await run(() => api('/v1/orgs/me', { method: 'PATCH', body: { name: name.trim(), mfaRequired: mfa } }));
    if (r) { setSaved(true); await reload(); }
  }
  return (
    <Panel title="Organisation settings">
      <form className="form" onSubmit={save}>
        {saved && <Notice kind="good">Saved.</Notice>}
        {error && <Notice kind="bad">{error}</Notice>}
        <Field label="Organisation name"><input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <label className="check">
          <input type="checkbox" checked={mfa} onChange={(e) => setMfa(e.target.checked)} />
          <span>Require two-step verification for everyone<small>Members who have not set it up can only reach their account page until they do. Turn it on for your own account first.</small></span>
        </label>
        <Button type="submit" busy={busy}>Save settings</Button>
      </form>
    </Panel>
  );
}

function Audit() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [next, setNext] = useState<string | null | undefined>(undefined);
  const { busy, error, run } = useAction();

  async function load(before?: string) {
    const r = await run(() => api<{ events: AuditEvent[]; nextBefore: string | null }>(`/v1/orgs/me/audit?limit=50${before ? `&before=${before}` : ''}`));
    if (r) { setEvents((prev) => (before ? [...prev, ...r.events] : r.events)); setNext(r.nextBefore); }
  }
  // Load the first page when the tab opens.
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Panel title="Activity log" note="Sign-ins, role changes, purchases and other important actions. It cannot be edited or deleted.">
      {error && <Notice kind="bad">{error}</Notice>}
      {events.length === 0 && !busy && !error ? (
        <Empty title="Nothing recorded yet" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Action</th><th>Address</th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{fmtDateTime(e.at)}</td>
                  <td className="mono">{e.action}</td>
                  <td className="mono">{e.ip ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {next && <Button kind="quiet" busy={busy} onClick={() => load(next)}>Load older entries</Button>}
    </Panel>
  );
}
