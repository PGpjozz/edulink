import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');
    const quizId = searchParams.get('quizId');

    try {
        if (quizId) {
            const quiz = await prisma.quiz.findFirst({
                where: { id: quizId, subject: { schoolId: auth.schoolId as string } },
                include: {
                    questions: {
                        include: { options: true }
                    }
                }
            });
            if (!quiz) return new NextResponse('Quiz not found', { status: 404 });
            return NextResponse.json(quiz);
        }

        if (subjectId) {
            const subject = await prisma.subject.findFirst({
                where: { id: subjectId, schoolId: auth.schoolId as string },
                select: { id: true }
            });
            if (!subject) return new NextResponse('Subject not found', { status: 404 });
        }

        const quizzes = await prisma.quiz.findMany({
            where: subjectId ? { subjectId } : { subject: { schoolId: auth.schoolId as string } },
            include: { _count: { select: { questions: true, attempts: true } } },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(quizzes);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<any>(req);
        if (body instanceof NextResponse) return body;
        const { subjectId, title, description, timeLimit, questions } = body;

        if (!subjectId || !title || !Array.isArray(questions)) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const subject = await prisma.subject.findFirst({
            where: { id: subjectId, schoolId: auth.schoolId as string },
            select: { id: true, teacherId: true }
        });

        if (!subject) {
            return new NextResponse('Subject not found', { status: 404 });
        }

        if (auth.role === 'TEACHER') {
            const teacherProfile = await prisma.teacherProfile.findUnique({
                where: { userId: auth.userId },
                select: { id: true }
            });
            if (!teacherProfile || subject.teacherId !== teacherProfile.id) {
                return new NextResponse('Forbidden', { status: 403 });
            }
        }

        const quiz = await prisma.quiz.create({
            data: {
                subjectId,
                title,
                description,
                timeLimit,
                questions: {
                    create: questions.map((q: any) => ({
                        text: q.text,
                        points: q.points,
                        options: {
                            create: q.options.map((o: any) => ({
                                text: o.text,
                                isCorrect: o.isCorrect
                            }))
                        }
                    }))
                }
            },
            include: { questions: { include: { options: true } } }
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
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

// Submitting a quiz attempt
export async function PATCH(req: Request) {
    const auth = await requireAuth({ roles: ['LEARNER'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<any>(req);
        if (body instanceof NextResponse) return body;
        const { quizId, answers } = body; // answers: [{ questionId, selectedOptionId }]

        if (!quizId || !Array.isArray(answers)) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const quiz = await prisma.quiz.findFirst({
            where: { id: quizId, subject: { schoolId: auth.schoolId as string } },
            include: { questions: { include: { options: true } } }
        });

        if (!quiz) return new NextResponse('Quiz not found', { status: 404 });

        // Calculate score
        let earnedPoints = 0;
        let totalPoints = 0;

        const quizAnswers = [];

        for (const question of quiz.questions) {
            totalPoints += question.points;
            const studentAnswer = answers.find((a: any) => a.questionId === question.id);
            if (studentAnswer) {
                const correctOption = question.options.find(o => o.isCorrect);
                if (correctOption && correctOption.id === studentAnswer.selectedOptionId) {
                    earnedPoints += question.points;
                }
                quizAnswers.push({
                    questionId: question.id,
                    selectedOptionId: studentAnswer.selectedOptionId
                });
            }
        }

        const score = (earnedPoints / totalPoints) * 100;

        const attempt = await prisma.quizAttempt.create({
            data: {
                quiz: { connect: { id: quizId } },
                learner: { connect: { userId: auth.userId } },
                score,
                completedAt: new Date(),
                answers: {
                    create: quizAnswers
                }
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'SUBMIT_QUIZ',
            entity: 'QUIZ_ATTEMPT',
            entityId: attempt.id,
            details: { quizId, score }
        });

        return NextResponse.json(attempt);
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
