// Usage: npm run make-staff -- someone@stackprimeconsulting.com.ng
// Marks an existing, verified account as StackPrime staff (platform admin).
import { prisma } from '../src/lib/db.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('usage: npm run make-staff -- <email>');
  process.exit(1);
}
const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error(`no user with email ${email}`);
  process.exit(1);
}
await prisma.user.update({ where: { id: user.id }, data: { isStaff: true } });
await prisma.auditLog.create({ data: { action: 'admin.staff_granted', targetType: 'user', targetId: user.id, meta: { via: 'cli' } } });
console.log(`${email} is now staff`);
await prisma.$disconnect();
