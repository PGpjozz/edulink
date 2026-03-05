/* eslint-disable @typescript-eslint/no-explicit-any */
// ─── COMPREHENSIVE SEED ───────────────────────────────────────────────────────
// Covers: school, principal, teachers, learners, parents, classes, subjects,
// assessments, grades, attendance, fee invoices, payments, behavior records,
// quizzes (questions/options/attempts), PTM sessions/bookings, assets/bookings,
// applications, messages, notifications, resources, AI insights, timetables.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const ref = () => `REF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daysFromNow = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('secret') !== 'edulink-seed-2026') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // ─── SCHOOL ───────────────────────────────────────────────────
        let school = await prisma.school.findFirst({ orderBy: { createdAt: 'asc' } });

        if (!school) {
            school = await prisma.school.create({
                data: {
                    name: 'Westview High School', subdomain: 'westview', tier: 'MEDIUM',
                    isActive: true, primaryColor: '#1565C0',
                    contactEmail: 'admin@westview.edu.za',
                    gradesOffered: ['8', '9', '10', '11', '12'], monthlyFee: 1500,
                }
            });
        } else {
            school = await prisma.school.update({
                where: { id: school.id },
                data: { name: 'Westview High School', contactEmail: 'admin@westview.edu.za', gradesOffered: ['8', '9', '10', '11', '12'], monthlyFee: 1500 }
            });
        }

        const schoolId = school.id;
        const pw = await bcrypt.hash('password123', 10);
        const counts: Record<string, number> = {};

        // ─── PRINCIPAL ───────────────────────────────────────────────
        const principal = await prisma.user.upsert({
            where: { email: 'principal@westview.edu.za' },
            update: {},
            create: { schoolId, role: 'PRINCIPAL', email: 'principal@westview.edu.za', password: pw, firstName: 'Nomvula', lastName: 'Dlamini', phoneNumber: '0821234567', isActive: true }
        });

        // ─── TEACHERS ────────────────────────────────────────────────
        const teacherDefs = [
            { email: 'jvanzyl@westview.edu.za', firstName: 'Johan', lastName: 'van Zyl', phone: '0831234567', qualifications: 'BSc Mathematics, PGCE' },
            { email: 'pmokoena@westview.edu.za', firstName: 'Priya', lastName: 'Mokoena', phone: '0841234567', qualifications: 'BA English, PGCE' },
            { email: 'sbotha@westview.edu.za', firstName: 'Stefan', lastName: 'Botha', phone: '0851234567', qualifications: 'BSc Physics, PGCE' },
            { email: 'lndlovu@westview.edu.za', firstName: 'Lungelo', lastName: 'Ndlovu', phone: '0861234567', qualifications: 'BCom Accounting, PGCE' },
        ];
        const teacherUsers: { userId: string; profileId: string; email: string; firstName: string }[] = [];
        for (const t of teacherDefs) {
            const u = await prisma.user.upsert({
                where: { email: t.email }, update: {},
                create: { schoolId, role: 'TEACHER', email: t.email, password: pw, firstName: t.firstName, lastName: t.lastName, phoneNumber: t.phone, isActive: true }
            });
            const p = await prisma.teacherProfile.upsert({
                where: { userId: u.id }, update: {},
                create: { userId: u.id, qualifications: t.qualifications }
            });
            teacherUsers.push({ userId: u.id, profileId: p.id, email: t.email, firstName: t.firstName });
        }
        counts.teachers = teacherDefs.length;

        // ─── TIMETABLE TEMPLATE ───────────────────────────────────────
        const makeTimetable = (grade: string) => ({
            Monday: [{ p: 1, subject: 'Mathematics', time: '08:00-08:45' }, { p: 2, subject: 'English Home Language', time: '08:45-09:30' }, { p: 3, subject: 'Physical Sciences', time: '09:45-10:30' }, { p: 4, subject: 'Accounting', time: '10:30-11:15' }, { p: 5, subject: 'Life Orientation', time: '11:30-12:15' }],
            Tuesday: [{ p: 1, subject: 'English Home Language', time: '08:00-08:45' }, { p: 2, subject: 'Mathematics', time: '08:45-09:30' }, { p: 3, subject: 'Accounting', time: '09:45-10:30' }, { p: 4, subject: 'Physical Sciences', time: '10:30-11:15' }, { p: 5, subject: 'Life Orientation', time: '11:30-12:15' }],
            Wednesday: [{ p: 1, subject: 'Physical Sciences', time: '08:00-08:45' }, { p: 2, subject: 'Life Orientation', time: '08:45-09:30' }, { p: 3, subject: 'Mathematics', time: '09:45-10:30' }, { p: 4, subject: 'English Home Language', time: '10:30-11:15' }, { p: 5, subject: 'Accounting', time: '11:30-12:15' }],
            Thursday: [{ p: 1, subject: 'Accounting', time: '08:00-08:45' }, { p: 2, subject: 'Physical Sciences', time: '08:45-09:30' }, { p: 3, subject: 'English Home Language', time: '09:45-10:30' }, { p: 4, subject: 'Mathematics', time: '10:30-11:15' }, { p: 5, subject: 'Life Orientation', time: '11:30-12:15' }],
            Friday: [{ p: 1, subject: 'Life Orientation', time: '08:00-08:45' }, { p: 2, subject: 'Accounting', time: '08:45-09:30' }, { p: 3, subject: 'English Home Language', time: '09:45-10:30' }, { p: 4, subject: 'Physical Sciences', time: '10:30-11:15' }, { p: 5, subject: 'Mathematics', time: '11:30-12:15' }],
            grade,
        });

        // ─── CLASSES ─────────────────────────────────────────────────
        const classDefs = [
            { name: '8A', grade: '8', tIdx: 0 }, { name: '9A', grade: '9', tIdx: 1 },
            { name: '10A', grade: '10', tIdx: 2 }, { name: '11A', grade: '11', tIdx: 3 },
            { name: '12A', grade: '12', tIdx: 0 },
        ];
        const classes: { id: string; grade: string }[] = [];
        for (const c of classDefs) {
            let cls = await prisma.class.findFirst({ where: { schoolId, name: c.name } });
            if (!cls) {
                cls = await prisma.class.create({
                    data: { schoolId, name: c.name, grade: c.grade, teacherProfileId: teacherUsers[c.tIdx].profileId, timetable: makeTimetable(c.grade) }
                });
            } else {
                cls = await prisma.class.update({ where: { id: cls.id }, data: { timetable: makeTimetable(c.grade) } });
            }
            classes.push({ id: cls.id, grade: c.grade });
        }
        counts.classes = classDefs.length;

        // ─── SUBJECTS ────────────────────────────────────────────────
        const subjectDefs = [
            { name: 'Mathematics', code: 'MATH', tIdx: 0 },
            { name: 'English Home Language', code: 'ENG', tIdx: 1 },
            { name: 'Physical Sciences', code: 'SCI', tIdx: 2 },
            { name: 'Accounting', code: 'ACC', tIdx: 3 },
            { name: 'Life Orientation', code: 'LO', tIdx: 1 },
        ];
        const allSubjects: { id: string; grade: string; name: string; tIdx: number }[] = [];
        for (const cls of classes) {
            for (const sub of subjectDefs) {
                let subject = await prisma.subject.findFirst({ where: { schoolId, name: sub.name, grade: cls.grade } });
                if (!subject) {
                    subject = await prisma.subject.create({
                        data: { schoolId, name: sub.name, code: sub.code, grade: cls.grade, teacherId: teacherUsers[sub.tIdx].profileId }
                    });
                }
                allSubjects.push({ id: subject.id, grade: cls.grade, name: sub.name, tIdx: sub.tIdx });
            }
        }
        counts.subjects = subjectDefs.length;

        // ─── LEARNERS ────────────────────────────────────────────────
        const learnerDefs = [
            { firstName: 'Ayanda', lastName: 'Nkosi', idNumber: '0801015001083', grade: '8', cIdx: 0 },
            { firstName: 'Ruan', lastName: 'Vermeulen', idNumber: '0804025002082', grade: '8', cIdx: 0 },
            { firstName: 'Keamogetse', lastName: 'Sithole', idNumber: '0802015003081', grade: '8', cIdx: 0 },
            { firstName: 'Mia', lastName: 'Erasmus', idNumber: '0803025004080', grade: '8', cIdx: 0 },
            { firstName: 'Sipho', lastName: 'Zulu', idNumber: '0701015005089', grade: '9', cIdx: 1 },
            { firstName: 'Danielle', lastName: 'du Plessis', idNumber: '0703025006088', grade: '9', cIdx: 1 },
            { firstName: 'Thabo', lastName: 'Molefe', idNumber: '0702015007087', grade: '9', cIdx: 1 },
            { firstName: 'Jade', lastName: 'Jacobs', idNumber: '0704025008086', grade: '9', cIdx: 1 },
            { firstName: 'Nomsa', lastName: 'Khumalo', idNumber: '0601015009085', grade: '10', cIdx: 2 },
            { firstName: 'Werner', lastName: 'Steyn', idNumber: '0603025010084', grade: '10', cIdx: 2 },
            { firstName: 'Lindiwe', lastName: 'Mthembu', idNumber: '0602015011083', grade: '10', cIdx: 2 },
            { firstName: 'Michael', lastName: 'Coetzee', idNumber: '0604025012082', grade: '10', cIdx: 2 },
            { firstName: 'Zanele', lastName: 'Mahlangu', idNumber: '0501015013081', grade: '11', cIdx: 3 },
            { firstName: 'Pieter', lastName: 'van der Berg', idNumber: '0503025014080', grade: '11', cIdx: 3 },
            { firstName: 'Ntombi', lastName: 'Shabalala', idNumber: '0502015015089', grade: '11', cIdx: 3 },
            { firstName: 'Caitlin', lastName: 'Olivier', idNumber: '0504025016088', grade: '11', cIdx: 3 },
            { firstName: 'Bongani', lastName: 'Dube', idNumber: '0401015017087', grade: '12', cIdx: 4 },
            { firstName: 'Annika', lastName: 'Louw', idNumber: '0403025018086', grade: '12', cIdx: 4 },
            { firstName: 'Siyanda', lastName: 'Mkhize', idNumber: '0402015019085', grade: '12', cIdx: 4 },
            { firstName: 'Elsa', lastName: 'Pretorius', idNumber: '0404025020084', grade: '12', cIdx: 4 },
        ];
        type LearnerRec = { id: string; userId: string; grade: string; firstName: string; lastName: string };
        const learnerProfiles: LearnerRec[] = [];
        for (const l of learnerDefs) {
            let u = await prisma.user.findFirst({ where: { idNumber: l.idNumber } });
            if (!u) {
                u = await prisma.user.create({
                    data: { schoolId, role: 'LEARNER', password: pw, firstName: l.firstName, lastName: l.lastName, idNumber: l.idNumber, isActive: true }
                });
            }
            let p = await prisma.learnerProfile.findFirst({ where: { userId: u.id } });
            if (!p) {
                p = await prisma.learnerProfile.create({ data: { userId: u.id, grade: l.grade, classId: classes[l.cIdx].id } });
            }
            learnerProfiles.push({ id: p.id, userId: u.id, grade: l.grade, firstName: l.firstName, lastName: l.lastName });
        }
        counts.learners = learnerProfiles.length;

        // ─── PARENTS ─────────────────────────────────────────────────
        // Each parent linked to one learner via learnerIds = [LearnerProfile.id]
        const parentDefs = [
            { email: 'mnkosi@parent.co.za', firstName: 'Mandla', lastName: 'Nkosi', phone: '0711110001', lIdx: 0 },
            { email: 'rvermeulen@parent.co.za', firstName: 'Rian', lastName: 'Vermeulen', phone: '0711110002', lIdx: 1 },
            { email: 'bsithole@parent.co.za', firstName: 'Busisiwe', lastName: 'Sithole', phone: '0711110003', lIdx: 2 },
            { email: 'cerasmus@parent.co.za', firstName: 'Charl', lastName: 'Erasmus', phone: '0711110004', lIdx: 3 },
            { email: 'szulu@parent.co.za', firstName: 'Sthembiso', lastName: 'Zulu', phone: '0711110005', lIdx: 4 },
            { email: 'fduplessis@parent.co.za', firstName: 'Frans', lastName: 'du Plessis', phone: '0711110006', lIdx: 5 },
            { email: 'lmolefe@parent.co.za', firstName: 'Lindiwe', lastName: 'Molefe', phone: '0711110007', lIdx: 6 },
            { email: 'sjacobs@parent.co.za', firstName: 'Sandra', lastName: 'Jacobs', phone: '0711110008', lIdx: 7 },
            { email: 'tkhumalo@parent.co.za', firstName: 'Thokozile', lastName: 'Khumalo', phone: '0711110009', lIdx: 8 },
            { email: 'jsteyn@parent.co.za', firstName: 'Jan', lastName: 'Steyn', phone: '0711110010', lIdx: 9 },
            { email: 'tmthembu@parent.co.za', firstName: 'Thandi', lastName: 'Mthembu', phone: '0711110011', lIdx: 10 },
            { email: 'pcoetzee@parent.co.za', firstName: 'Peter', lastName: 'Coetzee', phone: '0711110012', lIdx: 11 },
            { email: 'smahlangu@parent.co.za', firstName: 'Sarah', lastName: 'Mahlangu', phone: '0711110013', lIdx: 12 },
            { email: 'rvanderberg@parent.co.za', firstName: 'Riaan', lastName: 'van der Berg', phone: '0711110014', lIdx: 13 },
            { email: 'kshabalala@parent.co.za', firstName: 'Khosi', lastName: 'Shabalala', phone: '0711110015', lIdx: 14 },
            { email: 'molivier@parent.co.za', firstName: 'Mark', lastName: 'Olivier', phone: '0711110016', lIdx: 15 },
            { email: 'tdube@parent.co.za', firstName: 'Themba', lastName: 'Dube', phone: '0711110017', lIdx: 16 },
            { email: 'alouw@parent.co.za', firstName: 'André', lastName: 'Louw', phone: '0711110018', lIdx: 17 },
            { email: 'tmkhize@parent.co.za', firstName: 'Thandi', lastName: 'Mkhize', phone: '0711110019', lIdx: 18 },
            { email: 'dpretorius@parent.co.za', firstName: 'Dries', lastName: 'Pretorius', phone: '0711110020', lIdx: 19 },
        ];
        const parentUsers: { userId: string; firstName: string; lIdx: number }[] = [];
        for (const p of parentDefs) {
            let u = await prisma.user.findFirst({ where: { email: p.email } });
            if (!u) {
                u = await prisma.user.create({
                    data: { schoolId, role: 'PARENT', email: p.email, password: pw, firstName: p.firstName, lastName: p.lastName, phoneNumber: p.phone, isActive: true }
                });
            }
            const childProfileId = learnerProfiles[p.lIdx].id;
            await prisma.parentProfile.upsert({
                where: { userId: u.id },
                update: { learnerIds: [childProfileId] },
                create: { userId: u.id, learnerIds: [childProfileId] }
            });
            parentUsers.push({ userId: u.id, firstName: p.firstName, lIdx: p.lIdx });
        }
        counts.parents = parentDefs.length;

        // ─── ASSESSMENTS + GRADES ─────────────────────────────────────
        const assessmentDefs = [
            { title: 'Term 1 Test', type: 'TEST', weight: 15, totalMarks: 50, dAgo: 75 },
            { title: 'Term 1 Exam', type: 'EXAM', weight: 25, totalMarks: 100, dAgo: 55 },
            { title: 'Assignment 1', type: 'ASSIGNMENT', weight: 10, totalMarks: 20, dAgo: 65 },
            { title: 'Term 2 Test', type: 'TEST', weight: 15, totalMarks: 50, dAgo: 35 },
            { title: 'Term 2 Exam', type: 'EXAM', weight: 25, totalMarks: 100, dAgo: 15 },
            { title: 'Assignment 2', type: 'ASSIGNMENT', weight: 10, totalMarks: 20, dAgo: 25 },
        ];
        for (const sub of allSubjects) {
            const gradeLearners = learnerProfiles.filter(lp => lp.grade === sub.grade);
            for (const ad of assessmentDefs) {
                let assessment = await prisma.assessment.findFirst({ where: { subjectId: sub.id, title: ad.title } });
                if (!assessment) {
                    assessment = await prisma.assessment.create({
                        data: { subjectId: sub.id, title: ad.title, type: ad.type, date: daysAgo(ad.dAgo), totalMarks: ad.totalMarks, weight: ad.weight }
                    });
                }
                for (const lp of gradeLearners) {
                    const exists = await prisma.grade.findFirst({ where: { assessmentId: assessment.id, learnerId: lp.id } });
                    if (!exists) {
                        await prisma.grade.create({
                            data: { assessmentId: assessment.id, learnerId: lp.id, score: rand(Math.floor(ad.totalMarks * 0.4), ad.totalMarks) }
                        });
                    }
                }
            }
        }

        // ─── ATTENDANCE (45 school days) ──────────────────────────────
        const attStatuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'LATE'];
        for (const lp of learnerProfiles) {
            let schoolDay = 0;
            for (let i = 1; schoolDay < 45; i++) {
                const d = daysAgo(i);
                if (d.getDay() === 0 || d.getDay() === 6) continue;
                schoolDay++;
                const exists = await prisma.attendance.findFirst({ where: { learnerId: lp.id, date: d } });
                if (!exists) {
                    await prisma.attendance.create({
                        data: { learnerId: lp.id, date: d, status: attStatuses[rand(0, attStatuses.length - 1)] }
                    });
                }
            }
        }

        // ─── FEE INVOICES + PAYMENTS ──────────────────────────────────
        const feeMonths = [
            { label: 'January 2026', mIdx: 0 }, { label: 'February 2026', mIdx: 1 },
            { label: 'March 2026', mIdx: 2 }, { label: 'April 2026', mIdx: 3 },
            { label: 'May 2026', mIdx: 4 },
        ];
        const invStatuses = ['PAID', 'PAID', 'PAID', 'PENDING', 'OVERDUE'] as const;
        for (const lp of learnerProfiles) {
            for (const fm of feeMonths) {
                const title = `Monthly Tuition - ${fm.label}`;
                const exists = await prisma.feeInvoice.findFirst({ where: { learnerId: lp.id, title } });
                if (!exists) {
                    const status = invStatuses[rand(0, invStatuses.length - 1)];
                    const invoice = await prisma.feeInvoice.create({
                        data: { schoolId, learnerId: lp.id, title, amount: 1500, dueDate: new Date(2026, fm.mIdx, 25), status }
                    });
                    if (status === 'PAID') {
                        await prisma.payment.create({
                            data: { invoiceId: invoice.id, amount: 1500, method: ['CARD', 'TRANSFER', 'CASH'][rand(0, 2)], reference: ref(), status: 'COMPLETED' }
                        });
                    }
                }
            }
        }

        // ─── BEHAVIOR RECORDS ─────────────────────────────────────────
        const behExamples = [
            { type: 'MERIT', category: 'ACADEMIC', points: 5, reason: 'Outstanding test performance' },
            { type: 'MERIT', category: 'SPORT', points: 3, reason: 'Represented school at athletics' },
            { type: 'MERIT', category: 'ACADEMIC', points: 4, reason: 'Submitted exemplary assignment' },
            { type: 'MERIT', category: 'CONDUCT', points: 2, reason: 'Showed exceptional leadership' },
            { type: 'DEMERIT', category: 'CONDUCT', points: 2, reason: 'Disrupted class repeatedly' },
            { type: 'DEMERIT', category: 'CONDUCT', points: 3, reason: 'Late to school on 3 occasions' },
            { type: 'DEMERIT', category: 'ACADEMIC', points: 2, reason: 'Failed to submit assignment' },
            { type: 'DEMERIT', category: 'CONDUCT', points: 1, reason: 'Uniform violation' },
        ];
        for (const tu of teacherUsers) {
            for (let i = 0; i < 6; i++) {
                const lp = learnerProfiles[rand(0, learnerProfiles.length - 1)];
                const ex = behExamples[rand(0, behExamples.length - 1)];
                await prisma.behaviorRecord.create({
                    data: { learnerId: lp.id, teacherId: tu.userId, type: ex.type as any, category: ex.category, points: ex.points, reason: ex.reason }
                });
            }
        }
        counts.behaviorRecords = teacherUsers.length * 6;

        // ─── RESOURCES ───────────────────────────────────────────────
        const resourceDefs = [
            { name: 'Mathematics', resources: [{ title: 'Algebra Study Guide', type: 'PDF' }, { title: 'Geometry Practice Problems', type: 'PDF' }, { title: 'Calculus Introduction Video', type: 'MP4' }] },
            { name: 'English Home Language', resources: [{ title: 'Essay Writing Tips', type: 'PDF' }, { title: 'Grammar Reference Sheet', type: 'PDF' }] },
            { name: 'Physical Sciences', resources: [{ title: 'Newton\'s Laws Notes', type: 'PDF' }, { title: 'Chemical Reactions Guide', type: 'PDF' }, { title: 'Lab Report Template', type: 'DOCX' }] },
            { name: 'Accounting', resources: [{ title: 'Trial Balance Template', type: 'XLSX' }, { title: 'Income Statement Examples', type: 'PDF' }] },
            { name: 'Life Orientation', resources: [{ title: 'Career Guidance Booklet', type: 'PDF' }, { title: 'Health & Wellness Notes', type: 'PDF' }] },
        ];
        for (const rd of resourceDefs) {
            // Find grade 10 subject for this name
            const subj = allSubjects.find(s => s.name === rd.name && s.grade === '10');
            if (!subj) continue;
            for (const r of rd.resources) {
                const exists = await prisma.resource.findFirst({ where: { subjectId: subj.id, title: r.title } });
                if (!exists) {
                    await prisma.resource.create({
                        data: { subjectId: subj.id, title: r.title, fileUrl: `https://storage.westview.edu.za/resources/${r.title.toLowerCase().replace(/ /g, '-')}.${r.type.toLowerCase()}`, fileType: r.type, fileSize: rand(50000, 5000000) }
                    });
                }
            }
        }

        // ─── QUIZZES ─────────────────────────────────────────────────
        // One published quiz per subject (using grade 10 subjects) with 5 questions
        const quizDefs = [
            {
                subjectName: 'Mathematics', title: 'Algebra Fundamentals Quiz', description: 'Test your understanding of algebraic expressions.', timeLimit: 20,
                questions: [
                    { text: 'Solve for x: 2x + 4 = 12', points: 2, options: [{ text: '3', correct: false }, { text: '4', correct: true }, { text: '6', correct: false }, { text: '8', correct: false }] },
                    { text: 'What is the gradient of y = 3x + 2?', points: 2, options: [{ text: '2', correct: false }, { text: '3', correct: true }, { text: '5', correct: false }, { text: '1', correct: false }] },
                    { text: 'Expand: (x + 3)(x - 2)', points: 3, options: [{ text: 'x² + x - 6', correct: true }, { text: 'x² - x - 6', correct: false }, { text: 'x² + 5x - 6', correct: false }, { text: 'x² - 6', correct: false }] },
                    { text: 'What is the value of x² when x = 5?', points: 1, options: [{ text: '10', correct: false }, { text: '25', correct: true }, { text: '15', correct: false }, { text: '50', correct: false }] },
                    { text: 'Simplify: 4x + 3x - x', points: 2, options: [{ text: '6x', correct: true }, { text: '7x', correct: false }, { text: '8x', correct: false }, { text: '5x', correct: false }] },
                ]
            },
            {
                subjectName: 'English Home Language', title: 'Grammar & Comprehension Quiz', description: 'Test your English grammar knowledge.', timeLimit: 25,
                questions: [
                    { text: 'Identify the noun in: "The dog ran quickly."', points: 1, options: [{ text: 'ran', correct: false }, { text: 'quickly', correct: false }, { text: 'dog', correct: true }, { text: 'The', correct: false }] },
                    { text: 'Which sentence uses the past tense correctly?', points: 2, options: [{ text: 'She run yesterday', correct: false }, { text: 'She ran yesterday', correct: true }, { text: 'She runs yesterday', correct: false }, { text: 'She running yesterday', correct: false }] },
                    { text: 'What is an antonym of "brave"?', points: 1, options: [{ text: 'bold', correct: false }, { text: 'courageous', correct: false }, { text: 'cowardly', correct: true }, { text: 'strong', correct: false }] },
                    { text: 'Choose the correct spelling:', points: 2, options: [{ text: 'recieve', correct: false }, { text: 'receive', correct: true }, { text: 'receve', correct: false }, { text: 'reciave', correct: false }] },
                    { text: 'A "metaphor" is best described as:', points: 2, options: [{ text: 'A comparison using like or as', correct: false }, { text: 'A direct comparison between two things', correct: true }, { text: 'A type of rhyme', correct: false }, { text: 'Repeating consonant sounds', correct: false }] },
                ]
            },
            {
                subjectName: 'Physical Sciences', title: 'Forces & Motion Quiz', description: 'Newton\'s laws and basic physics concepts.', timeLimit: 30,
                questions: [
                    { text: 'What is Newton\'s First Law also known as?', points: 2, options: [{ text: 'Law of Acceleration', correct: false }, { text: 'Law of Action-Reaction', correct: false }, { text: 'Law of Inertia', correct: true }, { text: 'Law of Gravity', correct: false }] },
                    { text: 'Force = Mass × ?', points: 2, options: [{ text: 'Velocity', correct: false }, { text: 'Distance', correct: false }, { text: 'Acceleration', correct: true }, { text: 'Weight', correct: false }] },
                    { text: 'What is the unit of force?', points: 1, options: [{ text: 'Joule', correct: false }, { text: 'Watt', correct: false }, { text: 'Newton', correct: true }, { text: 'Pascal', correct: false }] },
                    { text: 'An object at rest will remain at rest unless acted upon by:', points: 2, options: [{ text: 'Gravity only', correct: false }, { text: 'An unbalanced force', correct: true }, { text: 'Friction', correct: false }, { text: 'Air resistance', correct: false }] },
                    { text: 'Which of these is a vector quantity?', points: 3, options: [{ text: 'Speed', correct: false }, { text: 'Mass', correct: false }, { text: 'Temperature', correct: false }, { text: 'Velocity', correct: true }] },
                ]
            },
        ];

        const createdQuizzes: { quizId: string; grade: string; questions: { id: string; options: { id: string; isCorrect: boolean }[] }[] }[] = [];
        for (const qd of quizDefs) {
            const subj = allSubjects.find(s => s.name === qd.subjectName && s.grade === '10');
            if (!subj) continue;
            let quiz = await prisma.quiz.findFirst({ where: { subjectId: subj.id, title: qd.title } });
            if (!quiz) {
                quiz = await prisma.quiz.create({
                    data: {
                        subjectId: subj.id, title: qd.title, description: qd.description,
                        timeLimit: qd.timeLimit, isPublished: true,
                        questions: {
                            create: qd.questions.map(q => ({
                                text: q.text, points: q.points,
                                options: { create: q.options.map(o => ({ text: o.text, isCorrect: o.correct })) }
                            }))
                        }
                    },
                    include: { questions: { include: { options: true } } }
                });
            }
            const fullQuiz = await prisma.quiz.findFirst({
                where: { id: quiz.id },
                include: { questions: { include: { options: true } } }
            });
            if (fullQuiz) {
                createdQuizzes.push({
                    quizId: quiz.id, grade: '10',
                    questions: fullQuiz.questions.map(q => ({ id: q.id, options: q.options.map(o => ({ id: o.id, isCorrect: o.isCorrect })) }))
                });
            }
        }
        counts.quizzes = createdQuizzes.length;

        // Quiz attempts by grade 10 learners
        const gr10Learners = learnerProfiles.filter(lp => lp.grade === '10');
        for (const quiz of createdQuizzes) {
            for (const lp of gr10Learners) {
                const exists = await prisma.quizAttempt.findFirst({ where: { quizId: quiz.quizId, learnerId: lp.id } });
                if (!exists) {
                    const answers: { questionId: string; selectedOptionId: string }[] = [];
                    let earned = 0, total = 0;
                    for (const q of quiz.questions) {
                        total += q.options.length > 0 ? 1 : 0;
                        const correct = q.options.find(o => o.isCorrect);
                        const wrong = q.options.find(o => !o.isCorrect);
                        const pickCorrect = rand(0, 1) === 1;
                        const chosen = pickCorrect ? correct : wrong;
                        if (chosen) {
                            answers.push({ questionId: q.id, selectedOptionId: chosen.id });
                            if (pickCorrect) earned++;
                        }
                    }
                    const score = total > 0 ? (earned / total) * 100 : 0;
                    await prisma.quizAttempt.create({
                        data: {
                            quizId: quiz.quizId, learnerId: lp.id, score, completedAt: daysAgo(rand(1, 10)),
                            answers: { create: answers }
                        }
                    });
                }
            }
        }

        // ─── PTM SESSIONS + BOOKINGS ──────────────────────────────────
        for (const tu of teacherUsers) {
            const sessionDate = daysFromNow(rand(5, 14));
            const start = new Date(sessionDate); start.setHours(9, 0, 0, 0);
            const end = new Date(sessionDate); end.setHours(14, 0, 0, 0);
            let ptmSession = await prisma.pTMSession.findFirst({ where: { schoolId, teacherId: tu.userId, date: sessionDate } });
            if (!ptmSession) {
                ptmSession = await prisma.pTMSession.create({
                    data: { schoolId, teacherId: tu.userId, date: sessionDate, startTime: start, endTime: end, slotDuration: 15 }
                });
            }
            // Book 3 slots for parents of learners this teacher handles
            let booked = 0;
            for (const pu of parentUsers) {
                if (booked >= 3) break;
                const lp = learnerProfiles[pu.lIdx];
                const exists = await prisma.pTMBooking.findFirst({ where: { sessionId: ptmSession.id, learnerId: lp.id } });
                if (!exists) {
                    const slotStart = new Date(start.getTime() + booked * 15 * 60000);
                    const slotEnd = new Date(slotStart.getTime() + 15 * 60000);
                    try {
                        await prisma.pTMBooking.create({
                            data: { sessionId: ptmSession.id, learnerId: lp.id, parentId: pu.userId, startTime: slotStart, endTime: slotEnd }
                        });
                        booked++;
                    } catch { /* skip duplicate */ }
                }
            }
        }
        counts.ptmSessions = teacherUsers.length;

        // ─── ASSETS ───────────────────────────────────────────────────
        const assetDefs = [
            { name: 'MacBook Pro Laptop', category: 'ELECTRONICS', identifier: 'MAC-001', price: 22000, bookable: true },
            { name: 'MacBook Pro Laptop', category: 'ELECTRONICS', identifier: 'MAC-002', price: 22000, bookable: true },
            { name: 'Epson Projector', category: 'ELECTRONICS', identifier: 'PROJ-001', price: 8500, bookable: true },
            { name: 'Canon DSLR Camera', category: 'ELECTRONICS', identifier: 'CAM-001', price: 12000, bookable: true },
            { name: 'Mathematics Gr10 Textbook', category: 'BOOKS', identifier: 'BK-MATH-001', price: 350, bookable: false },
            { name: 'Mathematics Gr10 Textbook', category: 'BOOKS', identifier: 'BK-MATH-002', price: 350, bookable: false },
            { name: 'Physical Sciences Gr12', category: 'BOOKS', identifier: 'BK-SCI-001', price: 380, bookable: false },
            { name: 'Soccer Ball', category: 'SPORTS', identifier: 'SPORT-SOC-01', price: 450, bookable: true },
            { name: 'Volleyball', category: 'SPORTS', identifier: 'SPORT-VOL-01', price: 380, bookable: true },
            { name: 'Athletics Starting Blocks', category: 'SPORTS', identifier: 'SPORT-ATH-01', price: 1200, bookable: true },
            { name: 'Biology Microscope', category: 'LAB', identifier: 'LAB-MICRO-01', price: 5500, bookable: true },
            { name: 'Chemistry Safety Goggles (set)', category: 'LAB', identifier: 'LAB-GOG-01', price: 800, bookable: false },
            { name: 'Scientific Calculator (Casio)', category: 'STATIONERY', identifier: 'CALC-001', price: 280, bookable: true },
            { name: 'Scientific Calculator (Casio)', category: 'STATIONERY', identifier: 'CALC-002', price: 280, bookable: true },
            { name: 'Globe & Atlas Set', category: 'BOOKS', identifier: 'GEO-001', price: 650, bookable: true },
        ];
        const createdAssets: { id: string; bookable: boolean }[] = [];
        for (const ad of assetDefs) {
            let asset = await prisma.asset.findFirst({ where: { schoolId, identifier: ad.identifier } });
            if (!asset) {
                asset = await prisma.asset.create({
                    data: { schoolId, name: ad.name, category: ad.category, identifier: ad.identifier, replacementPrice: ad.price, isBookable: ad.bookable, status: 'AVAILABLE' }
                });
            }
            createdAssets.push({ id: asset.id, bookable: ad.bookable });
        }
        counts.assets = assetDefs.length;

        // Asset bookings (bookable assets only)
        const bookableAssets = createdAssets.filter(a => a.bookable);
        const bookingStatuses = ['APPROVED', 'APPROVED', 'PENDING', 'RETURNED'] as const;
        for (let i = 0; i < Math.min(6, bookableAssets.length); i++) {
            const asset = bookableAssets[i];
            const user = teacherUsers[rand(0, teacherUsers.length - 1)];
            const exists = await prisma.assetBooking.findFirst({ where: { assetId: asset.id, userId: user.userId } });
            if (!exists) {
                await prisma.assetBooking.create({
                    data: { assetId: asset.id, userId: user.userId, startDate: daysAgo(rand(1, 7)), endDate: daysFromNow(rand(1, 7)), status: bookingStatuses[rand(0, bookingStatuses.length - 1)] }
                });
            }
        }

        // ─── APPLICATIONS ─────────────────────────────────────────────
        const appDefs = [
            { firstName: 'Lethu', lastName: 'Dlamini', email: 'lethu.d@gmail.com', grade: '8', status: 'PENDING', notes: 'Transfer from Greenview Primary' },
            { firstName: 'Hannes', lastName: 'Kruger', email: 'hkruger@gmail.com', grade: '9', status: 'REVIEWING', notes: 'Applying from Pretoria' },
            { firstName: 'Amahle', lastName: 'Ngcobo', email: 'angcobo@gmail.com', grade: '8', status: 'PENDING', notes: null },
            { firstName: 'Dylan', lastName: 'Nortje', email: 'dnortje@gmail.com', grade: '10', status: 'APPROVED', notes: 'Sports scholarship candidate' },
            { firstName: 'Thandeka', lastName: 'Buthelezi', email: 'tbuthelezi@gmail.com', grade: '11', status: 'REJECTED', notes: 'Capacity constraints' },
            { firstName: 'Marco', lastName: 'Pietersen', email: 'mpietersen@gmail.com', grade: '12', status: 'REVIEWING', notes: 'Academic merit application' },
        ];
        for (const ap of appDefs) {
            const exists = await prisma.application.findFirst({ where: { schoolId, email: ap.email } });
            if (!exists) {
                await prisma.application.create({
                    data: { schoolId, firstName: ap.firstName, lastName: ap.lastName, email: ap.email, grade: ap.grade, status: ap.status as any, notes: ap.notes }
                });
            }
        }
        counts.applications = appDefs.length;

        // ─── MESSAGES ─────────────────────────────────────────────────
        // Teachers/principal message parents and vice versa
        const msgDefs = [
            { fromEmail: 'jvanzyl@westview.edu.za', toIdx: 0, subject: 'Maths Progress Update', content: 'Dear Mr Nkosi, I wanted to let you know that Ayanda has shown great improvement in algebra this term. Keep encouraging her at home.' },
            { fromEmail: 'pmokoena@westview.edu.za', toIdx: 4, subject: 'English Assignment Reminder', content: 'Dear Mr Zulu, please remind Sipho that the English essay is due this Friday. It counts 15% of his term mark.' },
            { fromEmail: 'principal@westview.edu.za', toIdx: 9, subject: 'Parent Meeting Reminder', content: 'Dear Mr Steyn, this is a reminder that our Parent-Teacher Meeting is scheduled for next Thursday. Please check your booking via the portal.' },
            { fromEmail: 'mnkosi@parent.co.za', toEmail: 'jvanzyl@westview.edu.za', subject: 'Re: Maths Progress Update', content: 'Thank you Mr van Zyl! We have been doing extra practice at home. Ayanda is very motivated.' },
            { fromEmail: 'szulu@parent.co.za', toEmail: 'pmokoena@westview.edu.za', subject: 'Essay help', content: 'Good afternoon Ms Mokoena. Sipho is struggling with the essay structure. Could you recommend any resources?' },
            { fromEmail: 'pmokoena@westview.edu.za', toIdx: 4, subject: 'Re: Essay help', content: 'Of course! I have uploaded a study guide to the library section. Also check the Essay Writing Tips resource on the portal.' },
            { fromEmail: 'sbotha@westview.edu.za', toIdx: 8, subject: 'Lab Safety Notice', content: 'Dear Ms Khumalo, just a reminder that learners must bring their own safety goggles for next week\'s practical. These can be borrowed from the asset library.' },
            { fromEmail: 'lndlovu@westview.edu.za', toIdx: 11, subject: 'Accounting Exam Preparation', content: 'Dear Mr Coetzee, Michael has been doing well in class tests but I have noticed some gaps in his understanding of financial statements. I recommend extra revision.' },
            { fromEmail: 'pcoetzee@parent.co.za', toEmail: 'lndlovu@westview.edu.za', subject: 'Re: Accounting Exam Preparation', content: 'Thank you Mr Ndlovu. We will arrange a tutor for Michael over the weekend. Should we focus on income statements specifically?' },
            { fromEmail: 'jsteyn@parent.co.za', toEmail: 'sbotha@westview.edu.za', subject: 'Werner absent today', content: 'Good morning Mr Botha. Werner is unwell today and will not be at school. Please let us know if there is any classwork he needs to catch up on.' },
        ];

        const userEmailToId: Record<string, string> = {};
        const allSchoolUsers = await prisma.user.findMany({ where: { schoolId }, select: { id: true, email: true } });
        for (const u of allSchoolUsers) { if (u.email) userEmailToId[u.email] = u.id; }

        for (const msg of msgDefs) {
            const senderId = userEmailToId[msg.fromEmail];
            let recipientId: string | undefined;
            if ('toIdx' in msg) {
                recipientId = parentUsers[msg.toIdx]?.userId;
            } else if ('toEmail' in msg) {
                recipientId = userEmailToId[(msg as any).toEmail];
            }
            if (!senderId || !recipientId) continue;
            const exists = await prisma.message.findFirst({ where: { senderId, recipientId, subject: msg.subject } });
            if (!exists) {
                await prisma.message.create({ data: { schoolId, senderId, recipientId, subject: msg.subject, content: msg.content } });
            }
        }
        counts.messages = msgDefs.length;

        // ─── NOTIFICATIONS ────────────────────────────────────────────
        const notifDefs: { userId: string; title: string; message: string; type: string; link?: string }[] = [];

        // For each learner's parent: billing notification
        for (const pu of parentUsers.slice(0, 10)) {
            notifDefs.push({ userId: pu.userId, title: 'Invoice Due', message: 'Your March 2026 tuition invoice is due on 25 March.', type: 'BILLING', link: '/dashboard/parent/billing' });
        }
        // For teachers: behavior alert
        for (const tu of teacherUsers) {
            notifDefs.push({ userId: tu.userId, title: 'Behaviour Report Submitted', message: 'Your recent behaviour record has been saved successfully.', type: 'BEHAVIOR' });
        }
        // For some parents: attendance alert
        for (const pu of parentUsers.slice(0, 5)) {
            notifDefs.push({ userId: pu.userId, title: 'Attendance Alert', message: `Your child was marked ABSENT on ${daysAgo(2).toDateString()}.`, type: 'ATTENDANCE', link: '/dashboard/parent' });
        }
        // Academic notifications for learners
        for (const lp of learnerProfiles.filter(l => l.grade === '10' || l.grade === '12')) {
            notifDefs.push({ userId: lp.userId, title: 'New Quiz Available', message: 'A new quiz has been published for your subject. Complete it before the deadline.', type: 'ACADEMIC', link: '/dashboard/learner/quizzes' });
        }
        // System notification for principal
        notifDefs.push({ userId: principal.id, title: 'System Update', message: 'EduLink has been updated with new features. Check the settings panel.', type: 'SYSTEM' });

        for (const n of notifDefs) {
            await prisma.notification.create({
                data: { userId: n.userId, title: n.title, message: n.message, type: n.type as any, link: n.link, isRead: rand(0, 1) === 1 }
            });
        }
        counts.notifications = notifDefs.length;

        // ─── AI INSIGHTS ─────────────────────────────────────────────
        const gr12Learners = learnerProfiles.filter(lp => lp.grade === '12');
        for (const lp of gr12Learners) {
            const exists = await prisma.aIInsight.findFirst({ where: { learnerId: lp.id, term: 'Term 1 2026' } });
            if (!exists) {
                await prisma.aIInsight.create({
                    data: {
                        learnerId: lp.id, term: 'Term 1 2026',
                        content: {
                            strengths: ['Consistent attendance', 'Strong performance in Mathematics', 'Good class participation'],
                            weaknesses: ['Needs improvement in essay writing', 'Accounting concepts require reinforcement'],
                            suggestions: ['Schedule extra tutoring for Accounting', 'Encourage daily reading for English improvement', 'Practice past exam papers'],
                            overallRating: rand(60, 90),
                            predictedFinalMark: rand(65, 85),
                        }
                    }
                });
            }
        }
        counts.aiInsights = gr12Learners.length;

        return NextResponse.json({
            success: true,
            message: 'Database fully seeded with comprehensive school data.',
            schoolName: school.name,
            counts,
            logins: {
                principal: 'principal@westview.edu.za / password123',
                teacher_example: 'jvanzyl@westview.edu.za / password123',
                parent_example: 'mnkosi@parent.co.za / password123',
                learner_example: 'ID: 0801015001083 / password123',
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack?.slice(0, 800) }, { status: 500 });
    }
}
