import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson } from '@/lib/api-auth';
import { canAccessLearner } from '@/lib/staff-context';
import { GRADING_ROLES } from '@/lib/permissions';
import { getCurrentTermLabel } from '@/lib/report-generation';

export async function POST(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (!(GRADING_ROLES as readonly string[]).includes(auth.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await readJson<{
        learnerId?: string;
        subjectId?: string;
        comment?: string;
        term?: string;
        tone?: string;
    }>(req);
    if (body instanceof NextResponse) return body;

    const { learnerId, subjectId, comment, term = getCurrentTermLabel(), tone } = body;

    if (!learnerId || !subjectId || !comment?.trim()) {
        return NextResponse.json({ error: 'Learner, subject, and comment are required' }, { status: 400 });
    }

    if (!(await canAccessLearner(auth, learnerId))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subject = await prisma.subject.findFirst({
        where: { id: subjectId, schoolId: auth.schoolId! },
        select: { id: true },
    });
    if (!subject) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const saved = await prisma.reportComment.upsert({
        where: {
            learnerId_subjectId_term: { learnerId, subjectId, term },
        },
        create: {
            learnerId,
            subjectId,
            teacherId: auth.userId,
            term,
            comment: comment.trim(),
            tone: tone ?? null,
        },
        update: {
            comment: comment.trim(),
            tone: tone ?? null,
            teacherId: auth.userId,
        },
    });

    return NextResponse.json(saved);
}

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const learnerId = searchParams.get('learnerId');
    const term = searchParams.get('term') ?? getCurrentTermLabel();

    if (!learnerId) {
        return NextResponse.json({ error: 'learnerId required' }, { status: 400 });
    }

    if (!(GRADING_ROLES as readonly string[]).includes(auth.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!(await canAccessLearner(auth, learnerId))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const comments = await prisma.reportComment.findMany({
        where: { learnerId, term },
        include: {
            subject: { select: { name: true, code: true } },
            teacher: { select: { firstName: true, lastName: true } },
        },
        orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(comments);
}
