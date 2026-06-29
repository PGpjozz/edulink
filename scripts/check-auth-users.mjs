import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const rawUrl = (process.env.DIRECT_URL ?? process.env.DATABASE_URL).replace(/[&?]channel_binding=[^&]*/g, '');
const pool = new Pool({ connectionString: rawUrl, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const users = await prisma.user.findMany({
  select: {
    email: true,
    idNumber: true,
    role: true,
    isActive: true,
    password: true,
    firstName: true,
    lastName: true,
  },
  orderBy: { role: 'asc' },
});

const summary = {
  total: users.length,
  withPassword: users.filter((u) => !!u.password).length,
  withoutPassword: users.filter((u) => !u.password).length,
  bcryptHashes: users.filter((u) => u.password?.startsWith('$2')).length,
  byRole: Object.groupBy(users, (u) => u.role),
};

const roleCounts = {};
for (const u of users) {
  roleCounts[u.role] ??= { total: 0, withPassword: 0 };
  roleCounts[u.role].total++;
  if (u.password) roleCounts[u.role].withPassword++;
}

console.log('Role password stats:', JSON.stringify(roleCounts, null, 2));

console.log('\nUsers with passwords:');
for (const u of users.filter((x) => x.password)) {
  console.log(`  ${u.role} | ${u.email ?? u.idNumber} | hash: ${u.password?.slice(0, 7)}... | active: ${u.isActive}`);
}

console.log('\nUsers WITHOUT passwords (cannot sign in):');
for (const u of users.filter((x) => !x.password).slice(0, 15)) {
  console.log(`  ${u.role} | ${u.email ?? u.idNumber} | ${u.firstName} ${u.lastName}`);
}
if (users.filter((x) => !x.password).length > 15) {
  console.log(`  ... and ${users.filter((x) => !x.password).length - 15} more`);
}

await prisma.$disconnect();
await pool.end();
