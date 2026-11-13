import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(4000),
    APP_ORIGIN: z.string().url(),
    API_PUBLIC_URL: z.string().url(),

    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),

    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    MFA_ENC_KEY: z.string().min(1),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().default(465),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().default('StackPrime Support <support@stackprimeconsulting.com.ng>'),
    ADMIN_NOTIFY_EMAIL: z.string().default('support@stackprimeconsulting.com.ng'),

    // Used from step 4 / 5 onward; optional so the identity layer runs on its own.
    PAYSTACK_SECRET_KEY: z.string().optional(),
    PAYSTACK_ENABLED: bool,
    STRIPE_ENABLED: bool,
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    SPACES_ENDPOINT: z.string().optional(),
    SPACES_REGION: z.string().optional(),
    SPACES_BUCKET: z.string().optional(),
    SPACES_KEY: z.string().optional(),
    SPACES_SECRET: z.string().optional(),

    // Dev convenience only; ignored in production.
    SMTP_DISABLED: bool,
  })
  .superRefine((v, ctx) => {
    if (v.PAYSTACK_ENABLED && !v.PAYSTACK_SECRET_KEY) {
      ctx.addIssue({ code: 'custom', path: ['PAYSTACK_SECRET_KEY'], message: 'PAYSTACK_SECRET_KEY is required when Paystack is enabled' });
    }
    if (v.STRIPE_ENABLED) {
      ctx.addIssue({ code: 'custom', path: ['STRIPE_ENABLED'], message: 'Stripe checkout is not wired in this release; keep STRIPE_ENABLED=false.' });
    }
    if (v.NODE_ENV === 'production') {
      for (const k of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'] as const) {
        if (!v[k]) ctx.addIssue({ code: 'custom', path: [k], message: `${k} is required in production` });
      }
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast with a readable message; never print values.
  console.error('Invalid environment configuration:');
  for (const i of parsed.error.issues) console.error(` - ${i.path.join('.')}: ${i.message}`);
  process.exit(1);
}

export const config = parsed.data;
export const isProd = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 30;
export const REFRESH_ABSOLUTE_MAX_DAYS = 90;
export const REFRESH_COOKIE = 'sp_rt';
