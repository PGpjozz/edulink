import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('secret') !== 'edulink-seed-2026') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // Find or create the school
        let school = await prisma.school.findFirst({ orderBy: { createdAt: 'asc' } });

        if (!school) {
            school = await prisma.school.create({
                data: {
                    name: 'Westview High School',
                    subdomain: 'westview',
                    tier: 'MEDIUM',
                    isActive: true,
                    primaryColor: '#1565C0',
                    contactEmail: 'admin@westview.edu.za',
                    gradesOffered: ['8', '9', '10', '11', '12'],
                    monthlyFee: 1500,
                }
            });
        } else {
            // Update school details
            school = await prisma.school.update({
                where: { id: school.id },
                data: {
                    name: 'Westview High School',
                    contactEmail: 'admin@westview.edu.za',
                    gradesOffered: ['8', '9', '10', '11', '12'],
                    monthlyFee: 1500,
                }
            });
        }

        const schoolId = school.id;
        const pw = await bcrypt.hash('password123', 10);

        const created = { school: school.name, teachers: [] as string[], learners: [] as string[], classes: [] as string[], subjects: [] as string[] };

        // ─── PRINCIPAL ───────────────────────────────────────────────
        await prisma.user.upsert({
            where: { email: 'principal@westview.edu.za' },
            update: {},
            create: {
                schoolId,
                role: 'PRINCIPAL',
                email: 'principal@westview.edu.za',
                password: pw,
                firstName: 'Nomvula',
                lastName: 'Dlamini',
                isActive: true,
            }
        });

        // ─── TEACHERS ─────────────────────────────────────────────────
        const teacherData = [
            { email: 'jvanzyl@westview.edu.za',      firstName: 'Johan',    lastName: 'van Zyl',    qualifications: 'BSc Mathematics, PGCE' },
            { email: 'pmokoena@westview.edu.za',      firstName: 'Priya',    lastName: 'Mokoena',    qualifications: 'BA English, PGCE' },
            { email: 'sbotha@westview.edu.za',        firstName: 'Stefan',   lastName: 'Botha',      qualifications: 'BSc Physics, PGCE' },
            { email: 'lndlovu@westview.edu.za',       firstName: 'Lungelo',  lastName: 'Ndlovu',     qualifications: 'BCom Accounting, PGCE' },
        ];

        const teacherProfiles: { id: string; email: string }[] = [];

        for (const t of teacherData) {
            const user = await prisma.user.upsert({
                where: { email: t.email },
                update: {},
                create: {
                    schoolId,
                    role: 'TEACHER',
                    email: t.email,
                    password: pw,
                    firstName: t.firstName,
                    lastName: t.lastName,
                    isActive: true,
                }
            });
            const profile = await prisma.teacherProfile.upsert({
                where: { userId: user.id },
                update: {},
                create: { userId: user.id, qualifications: t.qualifications }
            });
            teacherProfiles.push({ id: profile.id, email: t.email });
            created.teachers.push(`${t.firstName} ${t.lastName}`);
        }

        // ─── CLASSES ──────────────────────────────────────────────────
        const classData = [
            { name: '8A',  grade: '8',  teacherIdx: 0 },
            { name: '9A',  grade: '9',  teacherIdx: 1 },
            { name: '10A', grade: '10', teacherIdx: 2 },
            { name: '11A', grade: '11', teacherIdx: 3 },
            { name: '12A', grade: '12', teacherIdx: 0 },
        ];

        const classes: { id: string; grade: string; name: string }[] = [];

        for (const c of classData) {
            let cls = await prisma.class.findFirst({ where: { schoolId, name: c.name } });
            if (!cls) {
                cls = await prisma.class.create({
                    data: {
                        schoolId,
                        name: c.name,
                        grade: c.grade,
                        teacherProfileId: teacherProfiles[c.teacherIdx].id,
                    }
                });
            }
            classes.push({ id: cls.id, grade: c.grade, name: c.name });
            created.classes.push(c.name);
        }

        // ─── SUBJECTS ─────────────────────────────────────────────────
        const subjectDefs = [
            { name: 'Mathematics',           code: 'MATH',  teacherIdx: 0 },
            { name: 'English Home Language', code: 'ENG',   teacherIdx: 1 },
            { name: 'Physical Sciences',     code: 'SCI',   teacherIdx: 2 },
            { name: 'Accounting',            code: 'ACC',   teacherIdx: 3 },
            { name: 'Life Orientation',      code: 'LO',    teacherIdx: 1 },
        ];

        const allSubjects: { id: string; grade: string; name: string }[] = [];

        for (const cls of classes) {
            for (const sub of subjectDefs) {
                let subject = await prisma.subject.findFirst({
                    where: { schoolId, name: sub.name, grade: cls.grade }
                });
                if (!subject) {
                    subject = await prisma.subject.create({
                        data: {
                            schoolId,
                            name: sub.name,
                            code: sub.code,
                            grade: cls.grade,
                            teacherId: teacherProfiles[sub.teacherIdx].id,
                        }
                    });
                }
                allSubjects.push({ id: subject.id, grade: cls.grade, name: sub.name });
                if (!created.subjects.includes(sub.name)) created.subjects.push(sub.name);
            }
        }

        // ─── LEARNERS ─────────────────────────────────────────────────
        const learnerDefs = [
            // Grade 8
            { firstName: 'Ayanda',    lastName: 'Nkosi',     idNumber: '0801015001083', grade: '8',  classIdx: 0 },
            { firstName: 'Ruan',      lastName: 'Vermeulen', idNumber: '0804025002082', grade: '8',  classIdx: 0 },
            { firstName: 'Keamogetse',lastName: 'Sithole',   idNumber: '0802015003081', grade: '8',  classIdx: 0 },
            { firstName: 'Mia',       lastName: 'Erasmus',   idNumber: '0803025004080', grade: '8',  classIdx: 0 },
            // Grade 9
            { firstName: 'Sipho',     lastName: 'Zulu',      idNumber: '0701015005089', grade: '9',  classIdx: 1 },
            { firstName: 'Danielle',  lastName: 'du Plessis',idNumber: '0703025006088', grade: '9',  classIdx: 1 },
            { firstName: 'Thabo',     lastName: 'Molefe',    idNumber: '0702015007087', grade: '9',  classIdx: 1 },
            { firstName: 'Jade',      lastName: 'Jacobs',    idNumber: '0704025008086', grade: '9',  classIdx: 1 },
            // Grade 10
            { firstName: 'Nomsa',     lastName: 'Khumalo',   idNumber: '0601015009085', grade: '10', classIdx: 2 },
            { firstName: 'Werner',    lastName: 'Steyn',     idNumber: '0603025010084', grade: '10', classIdx: 2 },
            { firstName: 'Lindiwe',   lastName: 'Mthembu',   idNumber: '0602015011083', grade: '10', classIdx: 2 },
            { firstName: 'Michael',   lastName: 'Coetzee',   idNumber: '0604025012082', grade: '10', classIdx: 2 },
            // Grade 11
            { firstName: 'Zanele',    lastName: 'Mahlangu',  idNumber: '0501015013081', grade: '11', classIdx: 3 },
            { firstName: 'Pieter',    lastName: 'van der Berg',idNumber: '0503025014080',grade: '11',classIdx: 3 },
            { firstName: 'Ntombi',    lastName: 'Shabalala',  idNumber: '0502015015089',grade: '11', classIdx: 3 },
            { firstName: 'Caitlin',   lastName: 'Olivier',   idNumber: '0504025016088', grade: '11', classIdx: 3 },
            // Grade 12
            { firstName: 'Bongani',   lastName: 'Dube',      idNumber: '0401015017087', grade: '12', classIdx: 4 },
            { firstName: 'Annika',    lastName: 'Louw',      idNumber: '0403025018086', grade: '12', classIdx: 4 },
            { firstName: 'Siyanda',   lastName: 'Mkhize',    idNumber: '0402015019085', grade: '12', classIdx: 4 },
            { firstName: 'Elsa',      lastName: 'Pretorius', idNumber: '0404025020084', grade: '12', classIdx: 4 },
        ];

        const learnerProfiles: { id: string; grade: string; firstName: string }[] = [];

        for (const l of learnerDefs) {
            let user = await prisma.user.findFirst({ where: { idNumber: l.idNumber } });
            if (!user) {
                user = await prisma.user.create({
                    data: {
                        schoolId,
                        role: 'LEARNER',
                        password: pw,
                        firstName: l.firstName,
                        lastName: l.lastName,
                        idNumber: l.idNumber,
                        isActive: true,
                    }
                });
            }
            let profile = await prisma.learnerProfile.findFirst({ where: { userId: user.id } });
            if (!profile) {
                profile = await prisma.learnerProfile.create({
                    data: {
                        userId: user.id,
                        grade: l.grade,
                        classId: classes[l.classIdx].id,
                    }
                });
            }
            learnerProfiles.push({ id: profile.id, grade: l.grade, firstName: l.firstName });
            created.learners.push(`${l.firstName} ${l.lastName}`);
        }

        // ─── ASSESSMENTS + GRADES ─────────────────────────────────────
        const terms = [
            { title: 'Term 1 Test',  type: 'TEST',  weight: 20, totalMarks: 50,  daysAgo: 60 },
            { title: 'Term 1 Exam',  type: 'EXAM',  weight: 30, totalMarks: 100, daysAgo: 30 },
            { title: 'Assignment 1', type: 'ASSIGNMENT', weight: 10, totalMarks: 20, daysAgo: 45 },
        ];

        const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

        for (const sub of allSubjects) {
            for (const term of terms) {
                let assessment = await prisma.assessment.findFirst({
                    where: { subjectId: sub.id, title: term.title }
                });
                if (!assessment) {
                    const d = new Date();
                    d.setDate(d.getDate() - term.daysAgo);
                    assessment = await prisma.assessment.create({
                        data: {
                            subjectId: sub.id,
                            title: term.title,
                            type: term.type,
                            date: d,
                            totalMarks: term.totalMarks,
                            weight: term.weight,
                        }
                    });
                }
                // Grades for learners in this grade
                const gradelearners = learnerProfiles.filter(lp => lp.grade === sub.grade);
                for (const lp of gradelearners) {
                    const existing = await prisma.grade.findFirst({
                        where: { assessmentId: assessment.id, learnerId: lp.id }
                    });
                    if (!existing) {
                        await prisma.grade.create({
                            data: {
                                assessmentId: assessment.id,
                                learnerId: lp.id,
                                score: rand(40, term.totalMarks),
                            }
                        });
                    }
                }
            }
        }

        // ─── ATTENDANCE (last 30 days) ─────────────────────────────────
        const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'LATE'];
        for (const lp of learnerProfiles) {
            for (let i = 1; i <= 20; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends
                const existing = await prisma.attendance.findFirst({
                    where: { learnerId: lp.id, date: d }
                });
                if (!existing) {
                    await prisma.attendance.create({
                        data: {
                            learnerId: lp.id,
                            date: d,
                            status: statuses[rand(0, statuses.length - 1)],
                        }
                    });
                }
            }
        }

        // ─── FEE INVOICES ─────────────────────────────────────────────
        const months = ['January 2026', 'February 2026', 'March 2026'];
        const invoiceStatuses = ['PAID', 'PAID', 'PENDING', 'OVERDUE'] as const;
        for (const lp of learnerProfiles) {
            for (const month of months) {
                const existing = await prisma.feeInvoice.findFirst({
                    where: { learnerId: lp.id, title: `Monthly Tuition - ${month}` }
                });
                if (!existing) {
                    const due = new Date(month.split(' ')[1] + '-' + (months.indexOf(month) + 1).toString().padStart(2,'0') + '-25');
                    const status = invoiceStatuses[rand(0, invoiceStatuses.length - 1)];
                    const invoice = await prisma.feeInvoice.create({
                        data: {
                            schoolId,
                            learnerId: lp.id,
                            title: `Monthly Tuition - ${month}`,
                            amount: 1500,
                            dueDate: due,
                            status,
                        }
                    });
                    if (status === 'PAID') {
                        await prisma.payment.create({
                            data: {
                                invoiceId: invoice.id,
                                amount: 1500,
                                method: ['CARD', 'TRANSFER', 'CASH'][rand(0, 2)],
                                reference: `REF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
                                status: 'COMPLETED',
                            }
                        });
                    }
                }
            }
        }

        // ─── BEHAVIOR RECORDS ─────────────────────────────────────────
        const behaviorExamples = [
            { type: 'POSITIVE', category: 'ACADEMIC',  points: 5,  reason: 'Outstanding test performance' },
            { type: 'POSITIVE', category: 'SPORT',     points: 3,  reason: 'Represented school at athletics' },
            { type: 'NEGATIVE', category: 'CONDUCT',   points: -2, reason: 'Disrupted class' },
            { type: 'POSITIVE', category: 'ACADEMIC',  points: 4,  reason: 'Submitted exemplary assignment' },
            { type: 'NEGATIVE', category: 'CONDUCT',   points: -3, reason: 'Late to school on 3 occasions' },
        ];

        const mathTeacher = await prisma.user.findFirst({ where: { email: 'jvanzyl@westview.edu.za' } });
        if (mathTeacher) {
            for (let i = 0; i < 8; i++) {
                const lp = learnerProfiles[rand(0, learnerProfiles.length - 1)];
                const ex = behaviorExamples[rand(0, behaviorExamples.length - 1)];
                await prisma.behaviorRecord.create({
                    data: {
                        learnerId: lp.id,
                        teacherId: mathTeacher.id,
                        type: ex.type as any,
                        category: ex.category,
                        points: ex.points,
                        reason: ex.reason,
                    }
                });
            }
        }

        return NextResponse.json({
            success: true,
            seeded: created,
            counts: {
                teachers: created.teachers.length,
                learners: created.learners.length,
                classes: created.classes.length,
                subjects: created.subjects.length,
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack?.slice(0, 500) }, { status: 500 });
    }
}
