import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { getStaffContext, subjectScopeWhere } from '@/lib/staff-context';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');

    try {
        const ctx = await getStaffContext(auth);
        const subjectFilter = subjectScopeWhere(auth, ctx);

        const quizzes = await prisma.quiz.findMany({
            where: {
                subjectId: subjectId || undefined,
                subject: subjectFilter,
            },
            include: {
                subject: { select: { name: true, grade: true } },
                _count: { select: { questions: true, attempts: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(quizzes);
    } catch (error) {
        console.error('Quiz GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (auth.role !== 'TEACHER' && auth.role !== 'HOD' && auth.role !== 'PRINCIPAL') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { title, description, subjectId, timeLimit, questions } = await req.json();

        if (!title?.trim() || !subjectId) {
            return NextResponse.json({ error: 'Title and subject are required' }, { status: 400 });
        }

        const ctx = await getStaffContext(auth);
        if (!ctx.assignedSubjectIds.includes(subjectId) && auth.role === 'TEACHER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const quiz = await prisma.quiz.create({
            data: {
                title: title.trim(),
                description: description?.trim() ?? null,
                subjectId,
                timeLimit: timeLimit ? parseInt(timeLimit) : null,
                questions: {
                    create: (questions ?? []).map((q: { text: string; points?: number; options: { text: string; isCorrect: boolean }[] }) => ({
                        text: q.text,
                        points: q.points || 1,
                        options: {
                            create: q.options.map((o) => ({
                                text: o.text,
                                isCorrect: o.isCorrect
                            }))
                        }
                    }))
                }
            },
            include: {
                subject: { select: { name: true, grade: true } },
                questions: {
                    include: { options: true }
                },
                _count: { select: { questions: true, attempts: true } }
            }
        });

        return NextResponse.json(quiz);
    } catch (error) {
        console.error('Quiz POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (auth.role !== 'TEACHER' && auth.role !== 'HOD' && auth.role !== 'PRINCIPAL') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { quizId, isPublished } = await req.json();
        if (!quizId || typeof isPublished !== 'boolean') {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const ctx = await getStaffContext(auth);
        const quiz = await prisma.quiz.findFirst({
            where: {
                id: quizId,
                subject: subjectScopeWhere(auth, ctx),
            },
            include: { _count: { select: { questions: true, attempts: true } } }
        });

        if (!quiz) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const updated = await prisma.quiz.update({
            where: { id: quizId },
            data: { isPublished }
        });

        const result = await prisma.quiz.findUnique({
            where: { id: updated.id },
            include: {
                subject: { select: { name: true, grade: true } },
                _count: { select: { questions: true, attempts: true } }
            }
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Quiz PATCH Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
