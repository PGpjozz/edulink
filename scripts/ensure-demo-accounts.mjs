/**
 * Upsert the public demo logins shown on /auth/signin.
 * Safe to run on every build: it only touches the Westview demo school and those four accounts.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const rawUrl = (process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '').trim();
if (!rawUrl) {
  console.warn('Skipping demo accounts. DIRECT_URL or DATABASE_URL is not set.');
  process.exit(0);
}

const connectionString = rawUrl.replace(/[&?]channel_binding=[^&]*/g, '');
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
    ? undefined
    : { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEMO_PASSWORD = 'password123';

async function main() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  const school = await prisma.school.upsert({
    where: { subdomain: 'westview' },
    update: { isActive: true },
    create: {
      name: 'Westview High School',
      subdomain: 'westview',
      tier: 'MEDIUM',
      isActive: true,
      primaryColor: '#1565C0',
      contactEmail: 'admin@westview.edu.za',
      gradesOffered: ['8', '9', '10', '11', '12'],
      monthlyFee: 1500,
    },
  });

  const accountData = {
    schoolId: school.id,
    password,
    isActive: true,
    mustChangePassword: false,
  };

  const principal = await prisma.user.upsert({
    where: { email: 'principal@westview.edu.za' },
    update: accountData,
    create: {
      ...accountData,
      role: 'PRINCIPAL',
      email: 'principal@westview.edu.za',
      firstName: 'Nomvula',
      lastName: 'Dlamini',
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'jvanzyl@westview.edu.za' },
    update: accountData,
    create: {
      ...accountData,
      role: 'TEACHER',
      email: 'jvanzyl@westview.edu.za',
      firstName: 'Johan',
      lastName: 'van Zyl',
    },
  });

  const teacherProfile = await prisma.teacherProfile.upsert({
    where: { userId: teacher.id },
    update: {},
    create: { userId: teacher.id, qualifications: 'BSc Mathematics, PGCE' },
  });

  let demoClass = await prisma.class.findFirst({
    where: { schoolId: school.id, name: '8A' },
  });
  if (!demoClass) {
    demoClass = await prisma.class.create({
      data: {
        schoolId: school.id,
        name: '8A',
        grade: '8',
        teacherProfileId: teacherProfile.id,
      },
    });
  }

  const learner = await prisma.user.upsert({
    where: { idNumber: '0801015001085' },
    update: accountData,
    create: {
      ...accountData,
      role: 'LEARNER',
      idNumber: '0801015001085',
      firstName: 'Ayanda',
      lastName: 'Nkosi',
    },
  });

  await prisma.learnerProfile.upsert({
    where: { userId: learner.id },
    update: { grade: '8', classId: demoClass.id },
    create: { userId: learner.id, grade: '8', classId: demoClass.id },
  });

  const parent = await prisma.user.upsert({
    where: { email: 'mnkosi@parent.co.za' },
    update: accountData,
    create: {
      ...accountData,
      role: 'PARENT',
      email: 'mnkosi@parent.co.za',
      firstName: 'Mandla',
      lastName: 'Nkosi',
    },
  });

  const learnerProfile = await prisma.learnerProfile.findUnique({ where: { userId: learner.id } });
  await prisma.parentProfile.upsert({
    where: { userId: parent.id },
    update: { learnerIds: learnerProfile ? [learnerProfile.id] : [] },
    create: { userId: parent.id, learnerIds: learnerProfile ? [learnerProfile.id] : [] },
  });

  console.log('Demo accounts ready for', school.name);
  console.log('principal', principal.email);
  console.log('teacher', teacher.email);
  console.log('parent', parent.email);
  console.log('learner', learner.idNumber);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
  await pool.end();
}
