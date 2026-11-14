import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import type { Device } from '@prisma/client';
import { safeEqualHex, sha256 } from '../lib/crypto.js';
import { prisma } from '../lib/db.js';

declare module 'fastify' {
  interface FastifyRequest {
    device: Device | null;
  }
}

/**
 * Agents authenticate with `Authorization: Device <deviceId>.<secret>`, the credential returned once at
 * enrolment. Only a hash of the secret is stored. A revoked device is refused on its very next call.
 */
export const authenticateDevice: preHandlerAsyncHookHandler = async function (req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization ?? '';
  const raw = header.startsWith('Device ') ? header.slice(7).trim() : '';
  const dot = raw.indexOf('.');
  if (dot < 1) return reply.code(401).send({ code: 'UNAUTHENTICATED', message: 'Device credential required.' });

  const device = await prisma.device.findUnique({ where: { id: raw.slice(0, dot) } });
  if (!device || !safeEqualHex(sha256(raw.slice(dot + 1)), device.secretHash)) {
    return reply.code(401).send({ code: 'UNAUTHENTICATED', message: 'Device credential is not valid.' });
  }
  if (device.status !== 'ACTIVE') {
    return reply.code(401).send({ code: 'DEVICE_REVOKED', message: 'This device was removed. Re-enrol it to continue.' });
  }
  req.device = device;
};
