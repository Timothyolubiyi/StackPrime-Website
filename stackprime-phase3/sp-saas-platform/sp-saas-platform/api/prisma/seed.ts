// Usage: npm run seed
// Creates the two launch products and their plans if they do not exist yet. It never overwrites
// anything already there, so copy and prices edited through the admin API survive a re-seed.
// Prices are deliberately NOT set: pricing is still an open decision (scope section 10).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    slug: 'sp-vas',
    name: 'SP VAS Premium',
    tagline: 'Vulnerability assessment without the limits',
    description:
      'The full version of the SP VAS scanner for teams that assess their systems regularly: unlimited scans, branded reports, history over time, and an agent that runs assessments on a schedule.',
    launchUrl: process.env.VAS_LAUNCH_URL ?? null,
    sortOrder: 10,
    features: [
      'Unlimited scans (no 3-scan cap)',
      'Deeper scan coverage',
      'Branded PDF reports with your organisation on the letterhead',
      'Scan history and comparison over time',
      'API access for CI/CD pipelines',
      'Desktop agent for scheduled, automated assessments',
    ],
    plans: [
      { code: 'premium-monthly', name: 'Premium (monthly)', interval: 'MONTH' as const },
      { code: 'premium-annual', name: 'Premium (annual)', interval: 'YEAR' as const },
    ],
  },
  {
    slug: 'sp-fast',
    name: 'SP Fast Enterprise',
    tagline: 'Network performance intelligence for your whole organisation',
    description:
      'Continuous internet performance monitoring from many regions, with trend reporting, alerting and SLA verification, plus a desktop agent for every endpoint you want to measure from.',
    launchUrl: process.env.FAST_LAUNCH_URL ?? null,
    sortOrder: 20,
    features: [
      'Continuous monitoring',
      'Multi-region measurement nodes',
      'Historical trend reporting',
      'Alerting and threshold configuration',
      'SLA verification and reporting',
      'Desktop agent for Windows, macOS and Linux (each agent counts toward your endpoint limit)',
      'Shared team dashboard',
      'API access for exporting metrics',
    ],
    plans: [
      { code: 'enterprise-monthly', name: 'Enterprise (monthly)', interval: 'MONTH' as const },
      { code: 'enterprise-annual', name: 'Enterprise (annual)', interval: 'YEAR' as const },
    ],
  },
];

for (const p of products) {
  const { plans, ...data } = p;
  const product = await prisma.product.upsert({ where: { slug: p.slug }, update: {}, create: data });
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { productId_code: { productId: product.id, code: plan.code } },
      update: {},
      create: { productId: product.id, ...plan, billingModel: 'SUBSCRIPTION' }, // endpoint limits and prices: open decisions
    });
  }
  console.log(`seeded ${p.slug} (${plans.length} plans)`);
}
await prisma.$disconnect();
