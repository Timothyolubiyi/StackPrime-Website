import type { Role } from './types';

// Amounts are stored in the smallest unit (kobo, cents).
export function money(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2 }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

export const fmtDate = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const fmtDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const per = (interval: string): string => (interval === 'month' ? 'a month' : interval === 'year' ? 'a year' : 'one-time');

export const ROLE_LABEL: Record<Role, string> = {
  ORG_OWNER: 'Owner',
  BILLING_ADMIN: 'Billing admin',
  IT_ADMIN: 'IT admin',
  STANDARD_USER: 'Standard user',
  AUDITOR: 'Auditor',
};
export const ALL_ROLES = Object.keys(ROLE_LABEL) as Role[];

export const ROLE_HELP: Record<Role, string> = {
  ORG_OWNER: 'Everything, including roles and billing',
  BILLING_ADMIN: 'Subscriptions and invoices only',
  IT_ADMIN: 'Products, downloads, devices and API keys',
  STANDARD_USER: 'Use the products the organisation has bought',
  AUDITOR: 'View-only, including the audit log',
};

export const PLATFORM_LABEL: Record<string, string> = {
  windows: 'Windows',
  macos: 'macOS',
  'linux-deb': 'Ubuntu / Debian',
  'linux-rpm': 'RHEL / Fedora',
  'linux-tar': 'Other Linux',
  container: 'Container',
};

export const copyText = (t: string) => navigator.clipboard?.writeText(t).catch(() => undefined);
