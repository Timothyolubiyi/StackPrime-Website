import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { handlePaystackEvent } from '../lib/billing.js';
import { prisma } from '../lib/db.js';
import { verifyWebhookSignature } from '../lib/paystack.js';

// Registered as its own plugin so the JSON parser can be replaced here only: the signature is
// computed over the exact bytes Paystack sent, so the body must not be parsed before it is checked.
export default async function webhookRoutes(app: FastifyInstance) {
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => done(null, body));

  app.post('/webhooks/paystack', { config: { rateLimit: { max: 240, timeWindow: '1 minute' } } }, async (req, reply) => {
    const raw = req.body as Buffer;
    if (!verifyWebhookSignature(raw, req.headers['x-paystack-signature'] as string | undefined)) {
      return reply.code(401).send({ code: 'INVALID_SIGNATURE', message: 'Signature check failed.' });
    }
    let event: { event?: string; data?: unknown };
    try {
      event = JSON.parse(raw.toString('utf8'));
    } catch {
      return reply.code(400).send({ code: 'BAD_JSON', message: 'Body is not valid JSON.' });
    }

    // Paystack sends no event id, so identical bytes mean the same event delivered again.
    const key = `paystack:${createHash('sha256').update(raw).digest('hex')}`;
    if (await prisma.paymentEvent.findUnique({ where: { id: key } })) return { received: true, duplicate: true };

    // Any error here becomes a non-200 answer, and Paystack retries (every 3 minutes, then hourly, for 72 h).
    await handlePaystackEvent(event, req);

    try {
      await prisma.paymentEvent.create({ data: { id: key, provider: 'PAYSTACK', type: String(event.event ?? 'unknown') } });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err; // a parallel delivery stored it first
    }
    return { received: true };
  });
}
