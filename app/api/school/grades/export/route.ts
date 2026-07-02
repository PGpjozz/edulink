import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { canAccessSubject } from '@/lib/staff-context';
import { toCsv, csvResponse } from '@/lib/csv';

/** CSV gradebook export for a single subject (one row per learner). */
export async function GET(req: Request) {
    const auth = await requireAuth({ gradingStaff: true, requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');
    if (!subjectId) {
        return NextResponse.json({ error: 'subjectId is required' }, { status: 400 });
    }

    const subject = await prisma.subject.findFirst({
        where: { id: subjectId, schoolId: auth.schoolId as string },
        include: {
            assessments: {
                orderBy: { date: 'asc' },
                include: { grades: { select: { learnerId: true, score: true } } },
            },
        },
    });
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

    if (!(await canAccessSubject(auth, subjectId))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const learners = await prisma.learnerProfile.findMany({
        where: { user: { schoolId: auth.schoolId as string }, grade: subject.grade },
        include: { user: { select: { firstName: true, lastName: true, idNumber: true } } },
        orderBy: { user: { lastName: 'asc' } },
    });

    const headers = [
        'Learner', 'ID Number',
        ...subject.assessments.map((a) => `${a.title} (/${a.totalMarks})`),
        'Average %',
    ];

    const rows = learners.map((l) => {
        const cells: unknown[] = [`${l.user.firstName} ${l.user.lastName}`, l.user.idNumber ?? ''];
        const percentages: number[] = [];
        for (const a of subject.assessments) {
            const g = a.grades.find((gr) => gr.learnerId === l.id);
            if (g && a.totalMarks > 0) {
                cells.push(g.score);
                percentages.push((g.score / a.totalMarks) * 100);
            } else {
                cells.push('');
            }
        }
        const avg = percentages.length > 0
            ? Math.round(percentages.reduce((acc, p) => acc + p, 0) / percentages.length)
            : '';
        cells.push(avg);
        return cells;
    });

    return csvResponse(`gradebook-${subject.name}-G${subject.grade}.csv`, toCsv(headers, rows));
}
