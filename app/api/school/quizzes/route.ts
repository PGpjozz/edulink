import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { getStaffContext } from '@/lib/staff-context';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');

    try {
        const where: {
            subjectId?: string | { in: string[] };
            isPublished?: boolean;
            subject: { schoolId: string; grade?: string };
        } = {
            subject: { schoolId: auth.schoolId as string },
        };

        if (auth.role === 'TEACHER') {
            // Subject.teacherId references TeacherProfile.id, so scope by the
            // teacher's assigned subjects (direct assignment + class subjects).
            const ctx = await getStaffContext(auth);
            where.subjectId = { in: ctx.assignedSubjectIds };
        }

        if (subjectId) {
            if (auth.role === 'TEACHER') {
                const ctx = await getStaffContext(auth);
                if (!ctx.assignedSubjectIds.includes(subjectId)) {
                    return NextResponse.json([], { status: 200 });
                }
            }
            where.subjectId = subjectId;
        }

        if (auth.role === 'LEARNER') {
            where.isPublished = true;
            const learnerProfile = await prisma.learnerProfile.findUnique({
                where: { userId: auth.userId },
                include: { class: true }
            });
            if (learnerProfile?.class?.grade) {
                where.subject.grade = learnerProfile.class.grade;
            }
        }

        const quizzes = await prisma.quiz.findMany({
            where,
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

type QuizOptionInput = { text: string; isCorrect: boolean };
type QuizQuestionInput = { text: string; points?: number; options: QuizOptionInput[] };
type QuizCreateInput = {
    title?: string;
    description?: string;
    subjectId?: string;
    timeLimit?: string | number;
    questions?: QuizQuestionInput[];
};

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['TEACHER', 'HOD', 'PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<QuizCreateInput>(req);
        if (body instanceof NextResponse) return body;
        const { title, description, subjectId, timeLimit, questions } = body;

        if (!title || !subjectId || !Array.isArray(questions) || questions.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const subject = await prisma.subject.findFirst({
            where: { id: subjectId, schoolId: auth.schoolId as string },
            select: { id: true }
        });
        if (!subject) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        if (auth.role === 'TEACHER') {
            const ctx = await getStaffContext(auth);
            if (!ctx.assignedSubjectIds.includes(subjectId)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const parsedTimeLimit = timeLimit != null && timeLimit !== '' ? parseInt(String(timeLimit), 10) : null;

        const quiz = await prisma.quiz.create({
            data: {
                title,
                description,
                subjectId,
                timeLimit: Number.isFinite(parsedTimeLimit) ? parsedTimeLimit : null,
                questions: {
                    create: questions.map((q) => ({
                        text: q.text,
                        points: q.points || 1,
                        options: {
                            create: (q.options ?? []).map((o) => ({
                                text: o.text,
                                isCorrect: Boolean(o.isCorrect)
                            }))
                        }
                    }))
                }
            },
            include: {
                questions: {
                    include: { options: true }
                }
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_QUIZ',
            entity: 'QUIZ',
            entityId: quiz.id,
            details: { subjectId, title }
        });

        return NextResponse.json(quiz);
    } catch (error) {
        console.error('Quiz POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireAuth({ roles: ['TEACHER', 'HOD', 'PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ quizId?: string; isPublished?: boolean }>(req);
        if (body instanceof NextResponse) return body;
        const { quizId, isPublished } = body;
        if (!quizId || typeof isPublished !== 'boolean') {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }
        const quiz = await prisma.quiz.findFirst({
            where: { id: quizId, subject: { schoolId: auth.schoolId as string } },
            select: { id: true, subjectId: true }
        });
        if (!quiz) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        if (auth.role === 'TEACHER') {
            const ctx = await getStaffContext(auth);
            if (!ctx.assignedSubjectIds.includes(quiz.subjectId)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const result = await prisma.quiz.update({
            where: { id: quizId },
            data: { isPublished },
            include: { _count: { select: { questions: true, attempts: true } } }
        });
        return NextResponse.json(result);
    } catch (error) {
        console.error('Quiz PATCH Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
