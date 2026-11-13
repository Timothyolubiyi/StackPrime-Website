import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { config, isProd, isTest } from './config.js';
import { prisma } from './lib/db.js';
import { redis } from './lib/redis.js';
import adminBillingRoutes from './routes/adminBilling.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import billingRoutes from './routes/billing.js';
import catalogRoutes from './routes/catalog.js';
import meRoutes from './routes/me.js';
import orgRoutes from './routes/orgs.js';
import webhookRoutes from './routes/webhooks.js';

export async function buildApp() {
  const app = Fastify({
    logger: isTest
      ? false
      : {
          level: isProd ? 'info' : 'debug',
          // Never log credentials, tokens or cookies.
          redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        },
    trustProxy: true, // behind Nginx on the same host; req.ip comes from X-Forwarded-For
    bodyLimit: 1_048_576,
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: config.APP_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.register(cookie);
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] },
  });
  // Tests make many signups from one IP, so rate limiting is off there. Route-level limits
  // (config.rateLimit) are simply ignored when the plugin is not registered.
  if (!isTest) {
    await app.register(rateLimit, {
      global: true,
      max: 300,
      timeWindow: '1 minute',
      redis: redis.duplicate({ maxRetriesPerRequest: 1, connectTimeout: 500 }),
      nameSpace: 'rl:',
      skipOnError: true, // a Redis hiccup must not take the API down
    });
  }

  app.decorateRequest('auth', null);

  app.setErrorHandler((err: Error & { statusCode?: number; code?: string; expose?: boolean }, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Some fields are not valid.',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
    if (status >= 500 && !err.expose) {
      req.log.error({ err }, 'unhandled error');
      return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'Something went wrong.' });
    }
    return reply.code(status).send({ code: err.code ?? 'ERROR', message: err.message });
  });

  app.setNotFoundHandler((_req, reply) => reply.code(404).send({ code: 'NOT_FOUND', message: 'Not found.' }));

  // Liveness: the process is up. Readiness: it can reach its dependencies.
  app.get('/healthz', { config: { rateLimit: false } }, async () => ({ status: 'ok' }));
  app.get('/readyz', { config: { rateLimit: false } }, async (_req, reply) => {
    try {
      await Promise.all([prisma.$queryRaw`SELECT 1`, redis.ping()]);
      return { status: 'ready' };
    } catch {
      return reply.code(503).send({ status: 'unavailable' });
    }
  });

  await app.register(authRoutes, { prefix: '/v1/auth' });
  await app.register(meRoutes, { prefix: '/v1' });
  await app.register(orgRoutes, { prefix: '/v1' });
  await app.register(catalogRoutes, { prefix: '/v1' });
  await app.register(adminRoutes, { prefix: '/v1/admin' });
  await app.register(adminBillingRoutes, { prefix: '/v1/admin' });
  await app.register(billingRoutes, { prefix: '/v1' });
  await app.register(webhookRoutes, { prefix: '/v1' }); // own plugin: it needs the raw request body

  return app;
}
