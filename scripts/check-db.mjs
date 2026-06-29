import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

config({ path: resolve(process.cwd(), '.env.local') });

neonConfig.webSocketConstructor = ws;

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: url }),
});

const [schools, users, provider, schoolList] = await Promise.all([
  prisma.school.count(),
  prisma.user.count(),
  prisma.user.findFirst({ where: { role: 'PROVIDER' }, select: { email: true } }),
  prisma.school.findMany({ select: { name: true, subdomain: true, createdAt: true }, orderBy: { createdAt: 'asc' }, take: 15 }),
]);

console.log(JSON.stringify({
  neonHost: url?.match(/@([^/]+)/)?.[1],
  database: url?.split('/').pop()?.split('?')[0],
  schoolCount: schools,
  userCount: users,
  providerEmail: provider?.email,
  schools: schoolList,
}, null, 2));

await prisma.$disconnect();
