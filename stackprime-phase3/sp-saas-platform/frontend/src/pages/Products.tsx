import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { PLATFORM_LABEL, money, per } from '../format';
import type { Plan, Product } from '../types';
import { Button, Empty, Loaded, Notice, Page, useAction, useLoad } from '../ui';

export function Products() {
  const catalog = useLoad(() => api<{ products: Product[] }>('/v1/catalog', { auth: false }), []);
  return (
    <Page title="Products" intro="Choose a plan and pay online. Your team gets access as soon as the payment is confirmed.">
      <Loaded state={catalog}>
        {(d) =>
          d.products.length === 0 ? (
            <Empty title="No products are available yet">Check back soon, or email support@stackprimeconsulting.com.ng.</Empty>
          ) : (
            <div className="stack">
              {d.products.map((p) => (
                <ProductSheet key={p.slug} product={p} />
              ))}
            </div>
          )
        }
      </Loaded>
    </Page>
  );
}

function ProductSheet({ product }: { product: Product }) {
  const { status, can } = useAuth();
  const nav = useNavigate();
  const currencies = [...new Set(product.plans.flatMap((p) => p.prices.map((x) => x.currency)))];
  const [currency, setCurrency] = useState(currencies.includes('NGN') ? 'NGN' : (currencies[0] ?? ''));
  const priceIn = (p: Plan) => p.prices.find((x) => x.currency === currency);
  const [planCode, setPlanCode] = useState(() => (product.plans.find((p) => p.prices.some((x) => x.purchasable)) ?? product.plans[0])?.code ?? '');
  const plan = product.plans.find((p) => p.code === planCode);
  const price = plan ? priceIn(plan) : undefined;
  const { busy, error, run } = useAction();

  async function buy() {
    if (status !== 'in') {
      nav('/login?next=%2F');
      return;
    }
    if (!plan) return;
    const r = await run(() =>
      api<{ authorizationUrl: string }>('/v1/billing/checkout', { method: 'POST', body: { productSlug: product.slug, planCode: plan.code, currency } }),
    );
    // Only follow a secure link, to the payment page the server created.
    if (r && /^https:\/\//.test(r.authorizationUrl)) window.location.assign(r.authorizationUrl);
  }

  const platforms = product.latestVersion ? [...new Set(product.latestVersion.platforms.map((p) => PLATFORM_LABEL[p.platform] ?? p.platform))] : [];

  return (
    <article className="product">
      <div>
        <h2>{product.name}</h2>
        {product.tagline && <p className="tagline">{product.tagline}</p>}
        <p>{product.description}</p>
        {product.launchUrl && <p><a href={product.launchUrl} rel="noopener">Try the free version</a></p>}
        {platforms.length > 0 && <p className="small muted">Agents for {platforms.join(', ')}.</p>}
        <ul className="features">
          {product.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>

      <div className="stack">
        {product.plans.length === 0 ? (
          <Empty title="Plans are coming soon" />
        ) : (
          <>
            {currencies.length > 1 && (
              <div className="currency" role="group" aria-label="Currency">
                {currencies.map((c) => (
                  <button key={c} type="button" aria-pressed={c === currency} onClick={() => setCurrency(c)}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            <div className="plans" role="radiogroup" aria-label={`${product.name} plans`}>
              {product.plans.map((p) => {
                const pr = priceIn(p);
                return (
                  <label key={p.code} className="plan" data-selected={p.code === planCode}>
                    <input type="radio" name={`plan-${product.slug}`} checked={p.code === planCode} onChange={() => setPlanCode(p.code)} />
                    <span>
                      <strong>{p.name}</strong>
                      <span className="small muted" style={{ display: 'block' }}>
                        {p.endpointLimit ? `Up to ${p.endpointLimit} devices` : 'Billed ' + per(p.interval)}
                      </span>
                    </span>
                    <span className="plan-price">
                      {pr ? money(pr.amountMinor, pr.currency) : 'On request'}
                      {pr && <small>{per(p.interval)}</small>}
                    </span>
                  </label>
                );
              })}
            </div>

            {error && <Notice kind="bad">{error}</Notice>}
            {price?.purchasable ? (
              status === 'in' && !can('billing:manage') ? (
                <Notice>Ask your organisation&rsquo;s owner or billing admin to buy this plan.</Notice>
              ) : (
                <Button onClick={buy} busy={busy}>
                  {status === 'in' ? `Pay ${money(price.amountMinor, price.currency)}` : 'Sign in to buy'}
                </Button>
              )
            ) : (
              <Notice>
                This plan cannot be paid for online yet.{' '}
                {status === 'in' ? <>Request an invoice under <Link to="/billing#invoices">Billing</Link>, or </> : 'Email '}
                <a href="mailto:support@stackprimeconsulting.com.ng">support@stackprimeconsulting.com.ng</a>.
              </Notice>
            )}
          </>
        )}
      </div>
    </article>
  );
}
