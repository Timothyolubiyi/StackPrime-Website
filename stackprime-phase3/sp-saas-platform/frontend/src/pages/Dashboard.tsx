import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ROLE_LABEL, copyText, fmtDate } from '../format';
import type { Entitlement, EntitlementState, Product } from '../types';
import { Badge, Button, Empty, Loaded, Notice, Page, Panel, useLoad } from '../ui';

const STATE_LABEL: Record<EntitlementState, string> = {
  active: 'Active',
  cancelling: 'Will not renew',
  expired: 'Expired',
  cancelled: 'Cancelled',
  pending: 'Pending',
};
const STATE_TONE: Record<EntitlementState, 'good' | 'warn' | 'bad' | 'neutral'> = {
  active: 'good',
  cancelling: 'warn',
  expired: 'neutral',
  cancelled: 'bad',
  pending: 'neutral',
};

export function Dashboard() {
  const { me, can } = useAuth();
  const ents = useLoad(() => api<{ entitlements: Entitlement[] }>('/v1/entitlements'), []);
  const catalog = useLoad(() => api<{ products: Product[] }>('/v1/catalog', { auth: false }), []);
  const launch = new Map((catalog.data?.products ?? []).map((p) => [p.slug, p.launchUrl]));

  return (
    <Page
      title={`Welcome${me?.name ? `, ${me.name}` : ''}`}
      intro={me?.org ? <>You are part of <strong>{me.org.name}</strong> as {me.roles.map((r) => ROLE_LABEL[r]).join(', ')}.</> : 'This is your personal account.'}
    >
      {!me?.org && (
        <Notice>
          Working with a team? <Link to="/organisation">Create an organisation</Link> to invite colleagues and share what you buy.
        </Notice>
      )}

      <Panel title="Your products" note="What this account can use right now.">
        <Loaded state={ents}>
          {({ entitlements }) =>
            entitlements.length === 0 ? (
              <Empty title="No products yet">
                <Link to="/">Browse the products</Link> to get started.
              </Empty>
            ) : (
              <div className="ledger">
                {entitlements.map((e) => {
                  const url = launch.get(e.product.slug);
                  return (
                    <div className="ledger-row" data-state={e.state} key={e.id}>
                      <span className="ledger-bar" aria-hidden="true" />
                      <div className="ledger-body">
                        <h3>{e.product.name}</h3>
                        <div className="ledger-meta">
                          <span>{e.plan.name}</span>
                          {e.endpointLimit && <span>Up to {e.endpointLimit} devices</span>}
                          {e.expiresAt && <span>{e.state === 'expired' ? 'Ended' : 'Access until'} {fmtDate(e.expiresAt)}</span>}
                          {!e.expiresAt && e.state === 'active' && <span>No expiry</span>}
                        </div>
                        {e.licenseKey && (
                          <div className="row small">
                            <span className="muted">Licence key</span>
                            <span className="mono">{e.licenseKey}</span>
                            <Button kind="quiet" small onClick={() => copyText(e.licenseKey!)}>Copy</Button>
                          </div>
                        )}
                      </div>
                      <div className="ledger-side">
                        <Badge tone={STATE_TONE[e.state]}>{STATE_LABEL[e.state]}</Badge>
                        {url && (e.state === 'active' || e.state === 'cancelling') && <a className="small" href={url} rel="noopener">Open the free tool</a>}
                        {can('billing:manage') && <Link className="small" to="/billing">Manage billing</Link>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </Loaded>
      </Panel>

      <Panel title="Installers and devices">
        <p className="muted">
          Downloads and device management will appear here as soon as the first installers are published. Nothing needs to be done on your side;
          your access above is already recorded.
        </p>
      </Panel>
    </Page>
  );
}
