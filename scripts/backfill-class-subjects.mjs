import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const rawUrl = (process.env.DIRECT_URL ?? process.env.DATABASE_URL).replace(/[&?]channel_binding=[^&]*/g, '');
const pool = new Pool({ connectionString: rawUrl, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function guessDepartment(name) {
    const n = name.toLowerCase();
    if (/math/.test(n)) return 'Mathematics';
    if (/english|language|afrikaans|zulu/.test(n)) return 'Languages';
    if (/science|biology|physics|chemistry/.test(n)) return 'Sciences';
    if (/history|geography|social/.test(n)) return 'Humanities';
    return 'General';
}

const schools = await prisma.school.findMany({ select: { id: true, name: true } });
let classSubjectCount = 0;

for (const school of schools) {
    const [classes, subjects] = await Promise.all([
        prisma.class.findMany({ where: { schoolId: school.id } }),
        prisma.subject.findMany({ where: { schoolId: school.id } }),
    ]);

    for (const klass of classes) {
        for (const subject of subjects.filter((s) => s.grade === klass.grade)) {
            await prisma.classSubject.upsert({
                where: { classId_subjectId: { classId: klass.id, subjectId: subject.id } },
                create: {
                    classId: klass.id,
                    subjectId: subject.id,
                    teacherProfileId: subject.teacherId,
                },
                update: {
                    teacherProfileId: subject.teacherId ?? undefined,
                },
            });
            classSubjectCount++;
        }
    }

    if (subjects.length === 0) continue;

    const existingDepts = await prisma.department.count({ where: { schoolId: school.id } });
    if (existingDepts > 0) continue;

    const deptNames = [...new Set(subjects.map((s) => guessDepartment(s.name)))];
    const deptMap = new Map();

    for (const name of deptNames) {
        const dept = await prisma.department.create({
            data: { schoolId: school.id, name, code: name.slice(0, 4).toUpperCase() },
        });
        deptMap.set(name, dept.id);
    }

    for (const subject of subjects) {
        const deptName = guessDepartment(subject.name);
        const departmentId = deptMap.get(deptName);
        if (departmentId) {
            await prisma.subject.update({
                where: { id: subject.id },
                data: { departmentId },
            });
        }
    }

    // Ensure teaching staff have teacher profiles
    const staff = await prisma.user.findMany({
        where: {
            schoolId: school.id,
            role: { in: ['TEACHER', 'HOD', 'PRINCIPAL', 'SCHOOL_ADMIN'] },
        },
        select: { id: true, role: true, teacherProfile: { select: { id: true } } },
    });

    for (const u of staff) {
        if (['TEACHER', 'HOD', 'PRINCIPAL'].includes(u.role) && !u.teacherProfile) {
            await prisma.teacherProfile.create({ data: { userId: u.id } });
        }
    }
}

console.log(`Backfill complete. ClassSubject rows upserted: ${classSubjectCount}`);
await prisma.$disconnect();
await pool.end();
