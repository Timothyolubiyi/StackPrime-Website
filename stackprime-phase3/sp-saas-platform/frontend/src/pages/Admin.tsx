import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { fmtDate, money } from '../format';
import type { AdminPlan, AdminProduct, AdminPurchaseOrder } from '../types';
import { Badge, Button, Empty, Field, Loaded, Notice, Page, Panel, useAction, useLoad } from '../ui';

type Tab = 'pricing' | 'orders' | 'access';

export function Admin() {
  const [tab, setTab] = useState<Tab>('pricing');
  const tabs: [Tab, string][] = [['pricing', 'Pricing'], ['orders', 'Invoice requests'], ['access', 'Grant or revoke access']];
  return (
    <Page title="Admin" intro="For StackPrime staff. Every change here is recorded in the audit log.">
      <div className="tabs" role="tablist">
        {tabs.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>)}
      </div>
      {tab === 'pricing' && <Pricing />}
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
