import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { ARCH_LABEL, PLATFORM_LABEL, bytes, fmtDate, money } from '../format';
import type { AdminPlan, AdminProduct, AdminPurchaseOrder, AdminVersion } from '../types';
import { Badge, Button, Empty, Field, Loaded, Notice, Page, Panel, useAction, useLoad } from '../ui';

type Tab = 'pricing' | 'releases' | 'orders' | 'access';

export function Admin() {
  const [tab, setTab] = useState<Tab>('pricing');
  const tabs: [Tab, string][] = [['pricing', 'Pricing'], ['releases', 'Releases'], ['orders', 'Invoice requests'], ['access', 'Grant or revoke access']];
  return (
    <Page title="Admin" intro="For StackPrime staff. Every change here is recorded in the audit log.">
      <div className="tabs" role="tablist">
        {tabs.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>)}
      </div>
      {tab === 'pricing' && <Pricing />}
      {tab === 'releases' && <Releases />}
      {tab === 'orders' && <Orders />}
      {tab === 'access' && <Access />}
    </Page>
  );
}

// ───────────── pricing ─────────────

function Pricing() {
  const list = useLoad(() => api<{ products: AdminProduct[] }>('/v1/admin/products'), []);
  return (
    <Loaded state={list}>
      {({ products }) => (
        <div className="stack">
          <Notice>
            Prices are set per plan and per currency. A subscription can be sold online only after its Paystack plan has been created. Changing an
            amount later removes that link, so create the Paystack plan again afterwards.
          </Notice>
          {products.map((p) => (
            <Panel key={p.id} title={p.name} note={p.slug}>
              {p.plans.map((pl) => <PlanRow key={pl.id} plan={pl} onChanged={list.reload} />)}
            </Panel>
          ))}
        </div>
      )}
    </Loaded>
  );
}

function PlanRow({ plan, onChanged }: { plan: AdminPlan; onChanged: () => void }) {
  const [currency, setCurrency] = useState('NGN');
  const [amount, setAmount] = useState('');
  const { busy, error, run } = useAction();
  const isSub = plan.billingModel === 'SUBSCRIPTION';

  async function save(e: FormEvent) {
    e.preventDefault();
    const minor = Math.round(Number(amount) * 100);
    if (!Number.isFinite(minor) || minor < 1) return;
    const r = await run(() => api(`/v1/admin/plans/${plan.id}/prices/${currency}`, { method: 'PUT', body: { amountMinor: minor } }));
    if (r) { setAmount(''); onChanged(); }
  }
  async function createPlan(cur: string) {
    const r = await run(() => api(`/v1/admin/plans/${plan.id}/prices/${cur}/paystack-plan`, { method: 'POST', body: {} }));
    if (r) onChanged();
  }

  return (
    <div className="stack" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: '.75rem' }}>
      <div className="row">
        <h3>{plan.name}</h3>
        <span className="muted small">{plan.code}</span>
        <Badge>{plan.billingModel === 'SUBSCRIPTION' ? plan.interval.toLowerCase() : 'one-time licence'}</Badge>
        {!plan.isActive && <Badge tone="bad">Hidden</Badge>}
      </div>
      {error && <Notice kind="bad">{error}</Notice>}
      {plan.prices.length === 0 ? (
        <p className="muted small">No prices yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Currency</th><th className="num">Amount</th><th>Online sales</th><th /></tr></thead>
            <tbody>
              {plan.prices.map((pr) => (
                <tr key={pr.currency}>
                  <td>{pr.currency}</td>
                  <td className="num">{money(pr.amountMinor, pr.currency)}</td>
                  <td>
                    {!pr.isActive ? <Badge>Off</Badge> : !isSub || pr.hasProviderPlan ? <Badge tone="good">Ready</Badge> : <Badge tone="warn">Needs a Paystack plan</Badge>}
                  </td>
                  <td>{isSub && !pr.hasProviderPlan && <Button small busy={busy} onClick={() => createPlan(pr.currency)}>Create Paystack plan</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form className="row" onSubmit={save}>
        <select aria-label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: '6rem' }}>
          <option>NGN</option>
          <option>USD</option>
        </select>
        <input aria-label="Amount" type="number" min="0.01" step="0.01" placeholder="Amount, e.g. 25000" required value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '12rem' }} />
        <Button type="submit" kind="quiet" busy={busy}>Set price</Button>
      </form>
    </div>
  );
}

// ───────────── invoice requests ─────────────

const PO_TONE: Record<string, 'good' | 'warn' | 'bad' | 'neutral'> = { REQUESTED: 'warn', INVOICED: 'neutral', PAID: 'good', REJECTED: 'bad' };

function Orders() {
  const [status, setStatus] = useState('REQUESTED');
  const list = useLoad(() => api<{ purchaseOrders: AdminPurchaseOrder[] }>(`/v1/admin/purchase-orders${status ? `?status=${status}` : ''}`), [status]);
  return (
    <Panel title="Invoice requests" note="Mark a request as invoiced once you have sent the invoice, then activate it when payment arrives.">
      <Field label="Show">
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '14rem' }}>
          <option value="REQUESTED">Waiting for an invoice</option>
          <option value="INVOICED">Invoiced, awaiting payment</option>
          <option value="PAID">Paid and active</option>
          <option value="REJECTED">Declined</option>
          <option value="">All</option>
        </select>
      </Field>
      <Loaded state={list}>
        {({ purchaseOrders }) =>
          purchaseOrders.length === 0 ? (
            <Empty title="Nothing here" />
          ) : (
            <div className="stack">
              {purchaseOrders.map((po) => <OrderRow key={po.id} po={po} onChanged={list.reload} />)}
            </div>
          )
        }
      </Loaded>
    </Panel>
  );
}

function OrderRow({ po, onChanged }: { po: AdminPurchaseOrder; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [until, setUntil] = useState('');
  const [devices, setDevices] = useState(String(po.quantity));
  const { busy, error, run } = useAction();
  const live = po.status === 'REQUESTED' || po.status === 'INVOICED';

  async function setState(next: 'INVOICED' | 'REJECTED') {
    const r = await run(() => api(`/v1/admin/purchase-orders/${po.id}/status`, { method: 'POST', body: { status: next } }));
    if (r) onChanged();
  }
  async function activate(e: FormEvent) {
    e.preventDefault();
    const r = await run(() =>
      api(`/v1/admin/purchase-orders/${po.id}/activate`, { method: 'POST', body: { expiresAt: new Date(`${until}T23:59:59Z`).toISOString(), endpointLimit: Number(devices) } }),
    );
    if (r) onChanged();
  }

  return (
    <div className="stack" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: '.75rem' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <strong>{po.org}</strong> <Badge tone={PO_TONE[po.status] ?? 'neutral'}>{po.status.toLowerCase()}</Badge>
          <div className="small muted">
            {po.product}, {po.plan}. {po.quantity} devices. Requested {fmtDate(po.createdAt)}. {po.reference && <>Their PO: {po.reference}. </>}
          </div>
          {po.notes && <div className="small">&ldquo;{po.notes}&rdquo;</div>}
          <div className="small muted mono">Organisation id: {po.orgId}</div>
        </div>
        {live && (
          <div className="row">
            {po.status === 'REQUESTED' && <Button small kind="quiet" busy={busy} onClick={() => setState('INVOICED')}>Mark invoiced</Button>}
            <Button small kind="quiet" onClick={() => setOpen(!open)}>Activate</Button>
            <Button small kind="danger" busy={busy} onClick={() => setState('REJECTED')}>Decline</Button>
          </div>
        )}
      </div>
      {error && <Notice kind="bad">{error}</Notice>}
      {open && live && (
        <form className="row" onSubmit={activate}>
          <Field label="Access until"><input type="date" required value={until} onChange={(e) => setUntil(e.target.value)} /></Field>
          <Field label="Devices allowed"><input type="number" min={1} required value={devices} onChange={(e) => setDevices(e.target.value)} /></Field>
          <Button type="submit" busy={busy}>Activate now</Button>
        </form>
      )}
    </div>
  );
}

// ───────────── manual access ─────────────

function Access() {
  const products = useLoad(() => api<{ products: AdminProduct[] }>('/v1/admin/products'), []);
  const [scope, setScope] = useState<'orgId' | 'userId'>('orgId');
  const [id, setId] = useState('');
  const [sel, setSel] = useState('');
  const [until, setUntil] = useState('');
  const [devices, setDevices] = useState('');
  const [reason, setReason] = useState('');
  const [granted, setGranted] = useState<string | null>(null);
  const grant = useAction();

  const [revokeId, setRevokeId] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [revoked, setRevoked] = useState(false);
  const revoke = useAction();

  const options = (products.data?.products ?? []).flatMap((p) => p.plans.map((pl) => ({ key: `${p.slug}|${pl.code}`, label: `${p.name}: ${pl.name}` })));
  const chosen = sel || options[0]?.key || '';

  async function submitGrant(e: FormEvent) {
    e.preventDefault();
    setGranted(null);
    const [productSlug, planCode] = chosen.split('|');
    const r = await grant.run(() =>
      api<{ id: string }>('/v1/admin/entitlements', {
        method: 'POST',
        body: {
          [scope]: id.trim(),
          productSlug,
          planCode,
          reason: reason.trim(),
          ...(until ? { expiresAt: new Date(`${until}T23:59:59Z`).toISOString() } : {}),
          ...(devices ? { endpointLimit: Number(devices) } : {}),
        },
      }),
    );
    if (r) { setGranted(r.id); setReason(''); }
  }
  async function submitRevoke(e: FormEvent) {
    e.preventDefault();
    setRevoked(false);
    const r = await revoke.run(() => api(`/v1/admin/entitlements/${revokeId.trim()}/revoke`, { method: 'POST', body: { reason: revokeReason.trim() } }));
    if (r) { setRevoked(true); setRevokeId(''); setRevokeReason(''); }
  }

  return (
    <div className="split">
      <Panel title="Grant access" note="For trials, pilots and support fixes. A reason is required and is recorded.">
        <form className="form" onSubmit={submitGrant}>
          {granted && <Notice kind="good">Access granted. Entitlement id: <span className="mono">{granted}</span></Notice>}
          {grant.error && <Notice kind="bad">{grant.error}</Notice>}
          <Field label="Grant to">
            <select value={scope} onChange={(e) => setScope(e.target.value as 'orgId' | 'userId')}>
              <option value="orgId">An organisation</option>
              <option value="userId">A person</option>
            </select>
          </Field>
          <Field label={scope === 'orgId' ? 'Organisation id' : 'User id'}><input required value={id} onChange={(e) => setId(e.target.value)} /></Field>
          <Field label="Plan">
            <select value={chosen} onChange={(e) => setSel(e.target.value)}>
              {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Access until (optional)"><input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></Field>
          <Field label="Devices allowed (optional)"><input type="number" min={1} value={devices} onChange={(e) => setDevices(e.target.value)} /></Field>
          <Field label="Reason"><textarea required minLength={5} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <Button type="submit" busy={grant.busy}>Grant access</Button>
        </form>
      </Panel>
      <Panel title="Revoke access">
        <form className="form" onSubmit={submitRevoke}>
          {revoked && <Notice kind="good">Access revoked.</Notice>}
          {revoke.error && <Notice kind="bad">{revoke.error}</Notice>}
          <Field label="Entitlement id"><input required value={revokeId} onChange={(e) => setRevokeId(e.target.value)} /></Field>
          <Field label="Reason"><textarea required minLength={5} value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} /></Field>
          <Button type="submit" kind="danger" busy={revoke.busy}>Revoke access</Button>
        </form>
      </Panel>
    </div>
  );
}

const PLATFORMS = ['windows', 'macos', 'linux-deb', 'linux-rpm', 'linux-tar', 'container'];
const ARCHES = ['x64', 'arm64', 'universal'];

function Releases() {
  const products = useLoad(() => api<{ products: AdminProduct[] }>('/v1/admin/products'), []);
  const [slug, setSlug] = useState('');
  const chosen = slug || products.data?.products[0]?.slug || '';
  return (
    <div className="stack">
      <Notice>
        To publish an installer: 1. Copy the file to the server with <span className="mono">upload-artifact.ps1</span> (it prints the path to use). 2. Create a draft
        version here. 3. Add the file, choosing it again so its size and checksum are filled in for you. 4. Publish. A published version can no longer be changed.
      </Notice>
      <Loaded state={products}>
        {({ products: list }) => (
          <>
            <Field label="Product">
              <select value={chosen} onChange={(e) => setSlug(e.target.value)} style={{ maxWidth: '22rem' }}>
                {list.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
            </Field>
            {chosen && <ReleaseList key={chosen} slug={chosen} />}
          </>
        )}
      </Loaded>
    </div>
  );
}

function ReleaseList({ slug }: { slug: string }) {
  const list = useLoad(() => api<{ versions: AdminVersion[] }>(`/v1/admin/products/${slug}/versions`), [slug]);
  const [version, setVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [minSupported, setMinSupported] = useState(false);
  const { busy, error, run } = useAction();

  async function createDraft(e: FormEvent) {
    e.preventDefault();
    const r = await run(() => api(`/v1/admin/products/${slug}/versions`, { method: 'POST', body: { version: version.trim(), ...(changelog.trim() ? { changelog: changelog.trim() } : {}), minSupported } }));
    if (r) { setVersion(''); setChangelog(''); setMinSupported(false); list.reload(); }
  }

  return (
    <div className="stack">
      <Panel title="New draft version">
        <form className="form wide" onSubmit={createDraft}>
          {error && <Notice kind="bad">{error}</Notice>}
          <Field label="Version" hint="Like 1.4.0, or 1.4.0-rc.1 for a trial build."><input required value={version} onChange={(e) => setVersion(e.target.value)} style={{ maxWidth: '12rem' }} /></Field>
          <Field label="What changed (shown to customers)"><textarea value={changelog} onChange={(e) => setChangelog(e.target.value)} maxLength={10000} /></Field>
          <label className="check">
            <input type="checkbox" checked={minSupported} onChange={(e) => setMinSupported(e.target.checked)} />
            <span>Agents older than this version must update<small>Agents tell the platform their version every few minutes and are told when this applies.</small></span>
          </label>
          <Button type="submit" busy={busy}>Create draft</Button>
        </form>
      </Panel>
      <Loaded state={list}>
        {({ versions }) => (versions.length === 0 ? <Empty title="No versions yet" /> : <>{versions.map((v) => <VersionCard key={v.id} slug={slug} v={v} onChanged={list.reload} />)}</>)}
      </Loaded>
    </div>
  );
}

function VersionCard({ slug, v, onChanged }: { slug: string; v: AdminVersion; onChanged: () => void }) {
  const [platform, setPlatform] = useState('windows');
  const [arch, setArch] = useState('x64');
  const [filename, setFilename] = useState('');
  const [sizeBytes, setSizeBytes] = useState('');
  const [sha, setSha] = useState('');
  const [key, setKey] = useState('');
  const { busy, error, run } = useAction();

  // Choosing the file again fills in its name, size and checksum, computed in this browser (nothing is uploaded).
  async function inspect(file: File | undefined) {
    if (!file) return;
    setFilename(file.name);
    setSizeBytes(String(file.size));
    setKey(`${slug}/${v.version}/${file.name}`);
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    setSha([...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join(''));
  }
  async function addFile(e: FormEvent) {
    e.preventDefault();
    const r = await run(() => api(`/v1/admin/versions/${v.id}/artifacts`, { method: 'POST', body: { platform, arch, filename, storageKey: key, sha256: sha, sizeBytes: Number(sizeBytes) } }));
    if (r) { setFilename(''); setSizeBytes(''); setSha(''); setKey(''); onChanged(); }
  }
  async function removeFile(id: string) {
    const r = await run(() => api(`/v1/admin/artifacts/${id}`, { method: 'DELETE' }).then(() => true));
    if (r) onChanged();
  }
  async function publish() {
    if (!window.confirm(`Publish ${v.version}? Customers with a plan can download it straight away, and it cannot be changed afterwards.`)) return;
    const r = await run(() => api(`/v1/admin/versions/${v.id}/publish`, { method: 'POST', body: {} }));
    if (r) onChanged();
  }
  async function togglePolicy() {
    const r = await run(() => api(`/v1/admin/versions/${v.id}`, { method: 'PATCH', body: { minSupported: !v.minSupported } }));
    if (r) onChanged();
  }

  return (
    <Panel title={`Version ${v.version}`} note={v.published ? `Published ${fmtDate(v.publishedAt)}` : 'Draft: not visible to customers'}>
      <div className="row">
        <Badge tone={v.published ? 'good' : 'warn'}>{v.published ? 'Published' : 'Draft'}</Badge>
        {v.minSupported && <Badge>Minimum supported</Badge>}
        <Button small kind="quiet" busy={busy} onClick={togglePolicy}>{v.minSupported ? 'Stop requiring this version' : 'Require agents to update to this version'}</Button>
      </div>
      {v.changelog && <p className="muted">{v.changelog}</p>}
      {error && <Notice kind="bad">{error}</Notice>}
      {v.artifacts.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>For</th><th>File</th><th className="num">Size</th><th>Stored at</th>{!v.published && <th />}</tr></thead>
            <tbody>
              {v.artifacts.map((a) => (
                <tr key={a.id}>
                  <td>{PLATFORM_LABEL[a.platform] ?? a.platform}<div className="small muted">{ARCH_LABEL[a.arch] ?? a.arch}</div></td>
                  <td className="mono">{a.filename}</td>
                  <td className="num">{bytes(a.sizeBytes)}</td>
                  <td className="mono small">{a.storageKey}</td>
                  {!v.published && <td><Button small kind="danger" busy={busy} onClick={() => removeFile(a.id)}>Remove</Button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!v.published && (
        <>
          <form className="form wide" onSubmit={addFile}>
            <h3>Add a file</h3>
            <Field label="Choose the installer again" hint="Only to read its name, size and checksum."><input type="file" onChange={(e) => void inspect(e.target.files?.[0])} /></Field>
            <div className="row">
              <Field label="System"><select value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p] ?? p}</option>)}</select></Field>
              <Field label="Processor"><select value={arch} onChange={(e) => setArch(e.target.value)}>{ARCHES.map((a) => <option key={a} value={a}>{ARCH_LABEL[a] ?? a}</option>)}</select></Field>
            </div>
            <Field label="File name"><input required value={filename} onChange={(e) => setFilename(e.target.value)} /></Field>
            <Field label="Size in bytes"><input required type="number" min={1} value={sizeBytes} onChange={(e) => setSizeBytes(e.target.value)} /></Field>
            <Field label="SHA-256 checksum"><input required className="mono" value={sha} onChange={(e) => setSha(e.target.value)} /></Field>
            <Field label="Stored at" hint="Where upload-artifact.ps1 put the file on the server."><input required className="mono" value={key} onChange={(e) => setKey(e.target.value)} /></Field>
            <Button type="submit" kind="quiet" busy={busy}>Add file</Button>
          </form>
          <div><Button busy={busy} disabled={v.artifacts.length === 0} onClick={publish}>Publish this version</Button></div>
        </>
      )}
    </Panel>
  );
}
