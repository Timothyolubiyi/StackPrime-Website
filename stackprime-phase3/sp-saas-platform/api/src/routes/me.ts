import type { FastifyInstance } from 'fastify';
import { authenticate } from '../plugins/authenticate.js';

export default async function meRoutes(app: FastifyInstance) {
  // allowWithoutMfa: the front end needs this to learn that MFA enrolment is required.
  app.get('/me', { preHandler: authenticate, config: { allowWithoutMfa: true } }, async (req) => {
    const { user, permissions } = req.auth!;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: Boolean(user.emailVerifiedAt),
      mfaEnabled: user.mfaEnabled,
      isStaff: user.isStaff,
      roles: user.roles,
      org: user.org ? { id: user.org.id, name: user.org.name, mfaRequired: user.org.mfaRequired } : null,
      mfaEnrolmentRequired: Boolean(user.org?.mfaRequired && !user.mfaEnabled),
      permissions: [...permissions].sort(),
    };
  });
}
