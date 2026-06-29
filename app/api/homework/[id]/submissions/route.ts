import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson } from '@/lib/api-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { id: homeworkId } = await params;

    const homework = await prisma.homework.findFirst({
        where: { id: homeworkId, schoolId: auth.schoolId! },
    });
    if (!homework) return new NextResponse('Not found', { status: 404 });

    if (auth.role !== 'LEARNER') {
        return NextResponse.json({ error: 'Only learners can submit' }, { status: 403 });
    }

    const learner = await prisma.learnerProfile.findUnique({
        where: { userId: auth.userId },
        select: { id: true },
    });
    if (!learner) return NextResponse.json({ error: 'Learner profile not found' }, { status: 400 });

    const body = await readJson<{ note?: string; fileUrl?: string }>(req);
    if (body instanceof NextResponse) return body;

    const submission = await prisma.homeworkSubmission.upsert({
        where: { homeworkId_learnerId: { homeworkId, learnerId: learner.id } },
        create: {
            homeworkId,
            learnerId: learner.id,
            note: body.note ?? null,
            fileUrl: body.fileUrl ?? null,
        },
        update: {
            note: body.note ?? undefined,
            fileUrl: body.fileUrl ?? undefined,
            submittedAt: new Date(),
        },
    });

    return NextResponse.json(submission);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { id: homeworkId } = await params;
    const body = await readJson<{ learnerId?: string; grade?: number; feedback?: string }>(req);
    if (body instanceof NextResponse) return body;

    if (!body.learnerId) return NextResponse.json({ error: 'learnerId required' }, { status: 400 });

    const homework = await prisma.homework.findFirst({
        where: { id: homeworkId, schoolId: auth.schoolId! },
    });
    if (!homework) return new NextResponse('Not found', { status: 404 });

    if (!['SCHOOL_OWNER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'HOD', 'TEACHER'].includes(auth.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.homeworkSubmission.update({
        where: { homeworkId_learnerId: { homeworkId, learnerId: body.learnerId } },
        data: {
            grade: body.grade ?? undefined,
            feedback: body.feedback ?? undefined,
        },
    });

    return NextResponse.json(updated);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { id: homeworkId } = await params;

    const submissions = await prisma.homeworkSubmission.findMany({
        where: { homeworkId, homework: { schoolId: auth.schoolId! } },
        include: {
            learner: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
    });

    return NextResponse.json(submissions);
}
