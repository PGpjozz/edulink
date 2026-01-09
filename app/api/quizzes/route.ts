import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');
    const quizId = searchParams.get('quizId');

    try {
        if (quizId) {
            const quiz = await prisma.quiz.findUnique({
                where: { id: quizId },
                include: {
                    questions: {
                        include: { options: true }
                    }
                }
            });
            return NextResponse.json(quiz);
        }

        const quizzes = await prisma.quiz.findMany({
            where: subjectId ? { subjectId } : { subject: { schoolId: session.user.schoolId } },
            include: { _count: { select: { questions: true, attempts: true } } },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(quizzes);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TEACHER') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { subjectId, title, description, timeLimit, questions } = body;

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

        return NextResponse.json(quiz);
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

// Submitting a quiz attempt
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'LEARNER') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { quizId, answers } = body; // answers: [{ questionId, selectedOptionId }]

        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
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
                quizId,
                learnerId: session.user.id, // Assuming user.id is learnerProfile.id or linked
                // Actually, session.user.id is User.id. We need LearnerProfile.id
                // Let's use a nested query or assume session has it. 
                // Better: find learner profile
                learner: { connect: { userId: session.user.id } },
                score,
                completedAt: new Date(),
                answers: {
                    create: quizAnswers
                }
            }
        });

        return NextResponse.json(attempt);
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
