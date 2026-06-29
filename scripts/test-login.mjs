import { config } from 'dotenv';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

config({ path: resolve(process.cwd(), '.env.local') });
neonConfig.webSocketConstructor = ws;

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/test-login.mjs <email-or-id> <password>');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

const user = await prisma.user.findFirst({
  where: email.includes('@') ? { email } : { idNumber: email },
  select: { email: true, idNumber: true, role: true, isActive: true, password: true },
});

console.log('DB host:', process.env.DATABASE_URL?.match(/@([^/]+)/)?.[1]);
console.log('User found:', !!user, user ? { email: user.email, idNumber: user.idNumber, role: user.role, isActive: user.isActive, hasPassword: !!user.password } : null);

if (user?.password) {
  const ok = await bcrypt.compare(password, user.password);
  console.log('Password match:', ok);
}

await prisma.$disconnect();
