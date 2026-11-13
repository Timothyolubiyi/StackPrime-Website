import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errText } from '../api';
import { useAuth } from '../auth';
import { fmtDate, money } from '../format';
import type { Entitlement, Payment, Product, PurchaseOrder } from '../types';
import { Badge, Button, Empty, Field, Loaded, Notice, Page, Panel, useAction, useLoad } from '../ui';

const PAY_TONE: Record<string, 'good' | 'warn' | 'bad' | 'neutral'> = { succeeded: 'good', pending: 'neutral', failed: 'bad', flagged: 'warn' };
const PO_LABEL: Record<string, string> = { requested: 'Requested', invoiced: 'Invoice sent', paid: 'Paid and active', rejected: 'Declined' };

export function Billing() {
  const { can, me } = useAuth();
  return (
    <Page title="Billing" intro="Subscriptions, payments and invoice requests for this account.">
      <Subscriptions manage={can('billing:manage')} />
      {can('billing:read') && <Payments />}
      {me?.org && <Invoices manage={can('billing:manage')} />}
    </Page>
  );
}

function Subscriptions({ manage }: { manage: boolean }) {
  const ents = useLoad(() => api<{ entitlements: Entitlement[] }>('/v1/entitlements'), []);
  const { busy, error, run } = useAction();
  const [done, setDone] = useState<string | null>(null);

  async function cancel(e: Entitlement) {
    if (!window.confirm(`Cancel ${e.product.name}? You keep access until the end of the period you have paid for.`)) return;
    const r = await run(() => api<{ accessUntil: string | null }>(`/v1/billing/entitlements/${e.id}/cancel`, { method: 'POST', body: {} }));
    if (r) {
      setDone(`${e.product.name} will not renew. Access continues${r.accessUntil ? ` until ${fmtDate(r.accessUntil)}` : ''}.`);
      ents.reload();
    }
  }
  async function updateCard(e: Entitlement) {
    const r = await run(() => api<{ link: string }>(`/v1/billing/entitlements/${e.id}/manage-link`));
    if (r && /^https:\/\//.test(r.link)) window.open(r.link, '_blank', 'noopener');
  }

  return (
    <Panel title="Subscriptions and licences">
      {error && <Notice kind="bad">{error}</Notice>}
      {done && <Notice kind="good">{done}</Notice>}
      <Loaded state={ents}>
        {({ entitlements }) =>
          entitlements.length === 0 ? (
            <Empty title="Nothing bought yet">
              <Link to="/">See the plans</Link>.
            </Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th>Plan</th><th>Status</th><th>Access until</th>{manage && <th />}</tr>
                </thead>
                <tbody>
                  {entitlements.map((e) => (
                    <tr key={e.id}>
                      <td>{e.product.name}</td>
                      <td>{e.plan.name}{e.source === 'po_invoice' && <span className="small muted"> (invoiced)</span>}</td>
                      <td><Badge tone={e.state === 'active' ? 'good' : e.state === 'cancelling' ? 'warn' : 'neutral'}>{e.state === 'cancelling' ? 'Will not renew' : e.state[0]!.toUpperCase() + e.state.slice(1)}</Badge></td>
                      <td>{e.expiresAt ? fmtDate(e.expiresAt) : 'No expiry'}</td>
                      {manage && (
                        <td>
                          {e.source === 'paystack' && e.state === 'active' && (
                            <div className="row">
                              <Button kind="quiet" small busy={busy} onClick={() => updateCard(e)}>Update card</Button>
                              <Button kind="danger" small busy={busy} onClick={() => cancel(e)}>Cancel</Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Loaded>
    </Panel>
  );
}

function Payments() {
  const pays = useLoad(() => api<{ payments: Payment[] }>('/v1/billing/payments'), []);
  return (
    <Panel title="Payment history">
      <Loaded state={pays}>
        {({ payments }) =>
          payments.length === 0 ? (
            <Empty title="No payments yet" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Product</th><th>Status</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.reference}>
                      <td>{fmtDate(p.paidAt ?? p.createdAt)}</td>
                      <td>{p.product} <span className="muted small">{p.plan}</span></td>
                      <td>
                        <Badge tone={PAY_TONE[p.status] ?? 'neutral'}>{p.status === 'flagged' ? 'Under review' : p.status[0]!.toUpperCase() + p.status.slice(1)}</Badge>
                      </td>
                      <td className="num">{money(p.amountMinor, p.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Loaded>
    </Panel>
  );
}

function Invoices({ manage }: { manage: boolean }) {
  const orders = useLoad(() => api<{ purchaseOrders: PurchaseOrder[] }>('/v1/billing/purchase-orders'), []);
  const catalog = useLoad(() => api<{ products: Product[] }>('/v1/catalog', { auth: false }), []);
  const [sel, setSel] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [sent, setSent] = useState(false);
  const { busy, error, run } = useAction();

  const options = (catalog.data?.products ?? []).flatMap((p) => p.plans.map((pl) => ({ key: `${p.slug}|${pl.code}`, label: `${p.name}: ${pl.name}` })));
  const chosen = sel || options[0]?.key || '';

  async function submit(e: FormEvent) {
    e.preventDefault();
    const [productSlug, planCode] = chosen.split('|');
    const r = await run(() =>
      api('/v1/billing/purchase-orders', {
        method: 'POST',
        body: { productSlug, planCode, quantity: Number(quantity), ...(reference.trim() ? { reference: reference.trim() } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}) },
      }),
    );
    if (r) {
      setSent(true);
      setReference('');
      setNotes('');
      orders.reload();
    }
  }

  return (
    <Panel id="invoices" title="Pay by invoice" note="For organisations that cannot pay by card. We send an invoice, and your access starts when it is paid.">
      <Loaded state={orders}>
        {({ purchaseOrders }) =>
          purchaseOrders.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Requested</th><th>Product</th><th className="num">Devices</th><th>Your PO number</th><th>Status</th></tr></thead>
                <tbody>
                  {purchaseOrders.map((p) => (
                    <tr key={p.id}>
                      <td>{fmtDate(p.createdAt)}</td>
                      <td>{p.product} <span className="muted small">{p.plan}</span></td>
                      <td className="num">{p.quantity}</td>
                      <td>{p.reference ?? ''}</td>
                      <td><Badge tone={p.status === 'paid' ? 'good' : p.status === 'rejected' ? 'bad' : 'neutral'}>{PO_LABEL[p.status] ?? p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Loaded>
      {manage ? (
        <form className="form wide" onSubmit={submit}>
          <h3>Request an invoice</h3>
          {sent && <Notice kind="good">Request sent. We will reply by email with the invoice.</Notice>}
          {error && <Notice kind="bad">{error}</Notice>}
          <Field label="Plan">
            <select value={chosen} onChange={(e) => setSel(e.target.value)} required>
              {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Number of devices" hint="How many devices will run the agent.">
            <input type="number" min={1} max={100000} required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label="Your purchase order number (optional)"><input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} /></Field>
          <Field label="Anything we should know (optional)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} /></Field>
          <Button type="submit" busy={busy} disabled={options.length === 0}>Send request</Button>
        </form>
      ) : (
        <p className="muted">Only an owner or billing admin can request an invoice.</p>
      )}
    </Panel>
  );
}

export function BillingComplete() {
  const [params] = useSearchParams();
  const reference = params.get('reference') ?? params.get('trxref') ?? '';
  const [state, setState] = useState<{ status: string; error?: string }>({ status: 'checking' });

  useEffect(() => {
    let live = true;
    let tries = 0;
    async function check() {
      try {
        const r = await api<{ status: string }>(`/v1/billing/verify?reference=${encodeURIComponent(reference)}`);
        if (!live) return;
        // The webhook can be a few seconds behind the customer, so wait a little before giving up.
        if (r.status === 'pending' && tries++ < 6) {
          setTimeout(check, 2000);
          return;
        }
        setState({ status: r.status });
      } catch (e) {
        if (live) setState({ status: 'error', error: errText(e) });
      }
    }
    if (reference) void check();
    else setState({ status: 'error', error: 'This page needs a payment reference. Start again from the products page.' });
    return () => {
      live = false;
    };
  }, [reference]);

  return (
    <Page title="Your payment">
      <Panel>
        {state.status === 'checking' && <p role="status">Confirming your payment with Paystack…</p>}
        {state.status === 'succeeded' && (
          <>
            <Notice kind="good">Payment received. Your access is active.</Notice>
            <p><Link className="btn btn-primary" to="/dashboard">Go to your dashboard</Link></p>
          </>
        )}
        {state.status === 'pending' && (
          <Notice kind="warn">We have not had confirmation yet. This can take a minute. Check your <Link to="/dashboard">dashboard</Link> shortly; if nothing changes, email support@stackprimeconsulting.com.ng with this reference: <span className="mono">{reference}</span></Notice>
        )}
        {state.status === 'failed' && (
          <>
            <Notice kind="bad">The payment did not go through, and you have not been charged for this order.</Notice>
            <p><Link className="btn btn-primary" to="/">Choose a plan again</Link></p>
          </>
        )}
        {state.status === 'flagged' && (
          <Notice kind="warn">Your payment needs a quick manual check before access is switched on. Email support@stackprimeconsulting.com.ng with this reference: <span className="mono">{reference}</span></Notice>
        )}
        {state.status === 'error' && <Notice kind="bad">{state.error}</Notice>}
      </Panel>
    </Page>
  );
}
