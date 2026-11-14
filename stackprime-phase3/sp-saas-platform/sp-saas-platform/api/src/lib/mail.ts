import nodemailer from 'nodemailer';
import { config, isProd, isTest } from '../config.js';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

// In tests, mail is captured here so the integration test can read verification links.
export const mailOutbox: Mail[] = [];

const transport =
  config.SMTP_HOST && !config.SMTP_DISABLED
    ? nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
      })
    : null;

export async function sendMail(mail: Mail): Promise<void> {
  if (isTest) {
    mailOutbox.push(mail);
    return;
  }
  if (!transport) {
    if (isProd) throw new Error('SMTP is not configured');
    console.log(`[mail:dev] to=${mail.to} subject="${mail.subject}"\n${mail.text}\n`);
    return;
  }
  await transport.sendMail({ from: config.MAIL_FROM, replyTo: mail.replyTo, to: mail.to, subject: mail.subject, text: mail.text });
}

const link = (path: string, token: string) => `${config.APP_ORIGIN}${path}?token=${encodeURIComponent(token)}`;
const signoff = '\n\nStackPrime Consulting Ltd\nsupport@stackprimeconsulting.com.ng';

export const verifyEmailMail = (to: string, token: string): Mail => ({
  to,
  subject: 'Confirm your StackPrime account',
  text:
    `Welcome to StackPrime.\n\nConfirm your email address to activate your account (link valid for 24 hours):\n` +
    `${link('/verify-email', token)}\n\nIf you did not create this account, ignore this email.${signoff}`,
});

export const accountExistsMail = (to: string): Mail => ({
  to,
  subject: 'Someone tried to register with your email',
  text:
    `Someone tried to create a StackPrime account with this email address, but one already exists.\n\n` +
    `If it was you, sign in or use "Forgot password" at ${config.APP_ORIGIN}/login. If not, no action is needed.${signoff}`,
});

export const resetPasswordMail = (to: string, token: string): Mail => ({
  to,
  subject: 'Reset your StackPrime password',
  text:
    `We received a request to reset your password. This link is valid for 1 hour and works once:\n` +
    `${link('/reset-password', token)}\n\nIf you did not ask for this, ignore this email; your password has not changed.${signoff}`,
});

export const passwordChangedMail = (to: string): Mail => ({
  to,
  subject: 'Your StackPrime password was changed',
  text:
    `Your password was just changed and you were signed out of all devices.\n\n` +
    `If this was not you, reset your password immediately and contact support@stackprimeconsulting.com.ng.${signoff}`,
});

export const mfaChangedMail = (to: string, enabled: boolean): Mail => ({
  to,
  subject: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`,
  text:
    `Two-factor authentication was ${enabled ? 'turned on' : 'turned off'} on your StackPrime account.\n\n` +
    `If this was not you, contact support@stackprimeconsulting.com.ng immediately.${signoff}`,
});

export const inviteMail = (to: string, orgName: string, invitedBy: string, token: string): Mail => ({
  to,
  subject: `You have been invited to ${orgName} on StackPrime`,
  text:
    `${invitedBy} invited you to join "${orgName}" on StackPrime.\n\n` +
    `Sign in (or create an account with this email address), then accept the invitation. The link is valid for 7 days:\n` +
    `${link('/accept-invite', token)}\n\nIf you were not expecting this, ignore this email.${signoff}`,
});

export const paymentFailedMail = (to: string, productName: string): Mail => ({
  to,
  subject: `Your ${productName} payment did not go through`,
  text:
    `We could not collect the latest payment for ${productName}. Your access continues for a few more days.\n\n` +
    `Sign in at ${config.APP_ORIGIN}/billing to update your card, or reply to this email and we will help.${signoff}`,
});

export const purchaseOrderMail = (
  to: string,
  p: { id: string; org: string; product: string; plan: string; quantity: number; poRef?: string | null; notes?: string | null; requestedBy: string },
): Mail => ({
  to,
  replyTo: p.requestedBy, // replying goes straight to the customer
  subject: `New purchase order request: ${p.org} (${p.id})`,
  text:
    `Organisation: ${p.org}\nRequested by: ${p.requestedBy}\nProduct: ${p.product}\nPlan: ${p.plan}\n` +
    `Endpoints/quantity: ${p.quantity}\nCustomer PO number: ${p.poRef ?? '-'}\nNotes: ${p.notes ?? '-'}\n\n` +
    `Request id: ${p.id}\nNext: raise the invoice, then activate it in the admin API once payment is received.`,
});
