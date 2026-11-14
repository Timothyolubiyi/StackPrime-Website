import { prisma } from '../src/lib/db.js';

const PROTECTED_ADMINS = new Map<string, boolean>([
  ['timothy@stackprimeconsulting.com.ng', true],
  ['admin@stackprimeconsulting.com.ng', false],
]);

const operation = process.argv[2]?.trim().toLowerCase();
const email = process.argv[3]?.trim().toLowerCase();

async function main() {
  if (operation !== 'bootstrap-admin' || !email) {
    console.error(
      'Usage: npm run make-staff -- bootstrap-admin <administrator-email>',
    );
    process.exitCode = 1;
    return;
  }

  if (!PROTECTED_ADMINS.has(email)) {
    console.error('This command only provisions the two designated StackPrime administrators.');
    process.exitCode = 1;
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  if (!databaseUrl) {
    console.error('DATABASE_URL is required.');
    process.exitCode = 1;
    return;
  }

  let database: URL;

  try {
    database = new URL(databaseUrl);
  } catch {
    console.error('DATABASE_URL is invalid.');
    process.exitCode = 1;
    return;
  }

  if (!['postgres:', 'postgresql:'].includes(database.protocol)) {
    console.error('Administrator bootstrap requires a PostgreSQL database.');
    process.exitCode = 1;
    return;
  }

  const databaseName = decodeURIComponent(database.pathname.replace(/^\/+/, ''));
  const databaseHost = database.hostname.toLowerCase();

  if (process.env.STACKPRIME_ALLOW_ADMIN_BOOTSTRAP !== 'true') {
    console.error('Bootstrap blocked. Explicit authorization is required.');
    process.exitCode = 1;
    return;
  }

  if (nodeEnv === 'production') {
    if (
      process.env.STACKPRIME_ALLOW_PRODUCTION_ADMIN_BOOTSTRAP !== 'true' ||
      process.env.STACKPRIME_ADMIN_BOOTSTRAP_CONFIRMATION !== `PRODUCTION:${email}`
    ) {
      console.error('Production bootstrap blocked. Additional explicit authorization is required.');
      process.exitCode = 1;
      return;
    }
  } else {
    const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(databaseHost);

    if (!isLocalDatabase || databaseName !== 'sp_saas_test') {
      console.error('Non-production bootstrap is restricted to the local sp_saas_test database.');
      process.exitCode = 1;
      return;
    }
  }

  console.log(`Bootstrap target verified: ${databaseHost}/${databaseName} (${nodeEnv}).`);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.error(`No existing account found for ${email}. Register the account first.`);
    process.exitCode = 1;
    return;
  }

  if (!user.emailVerifiedAt || user.orgId !== null) {
    console.error('The account must be email-verified and must not belong to a customer organisation.');
    process.exitCode = 1;
    return;
  }

  const isPlatformOwner = PROTECTED_ADMINS.get(email) === true;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        isStaff: true,
        staffRoles: ['SUPER_ADMIN'],
        staffSuspendedAt: null,
        isPlatformOwner,
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'admin.bootstrap',
        targetType: 'user',
        targetId: user.id,
        meta: {
          email,
          staffRoles: ['SUPER_ADMIN'],
          isPlatformOwner,
          via: 'trusted_cli_bootstrap',
        },
      },
    });
  });

  console.log(`Successfully provisioned ${email}.`);
  console.log('Staff role: SUPER_ADMIN');
  console.log(`Platform Owner access: ${isPlatformOwner ? 'ENABLED' : 'NOT ENABLED'}`);
  console.log('MFA must be enabled before privileged staff operations are permitted.');
}

try {
  await main();
} catch (error) {
  console.error('Administrator provisioning failed:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
