import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const quiz = await prisma.quiz.findUnique({
            where: { id },
            include: {
                questions: {
                    include: { options: true }
                }
            }
        });

        if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

        if (session.user.role === 'LEARNER') {
            if (!quiz.isPublished) {
                return NextResponse.json({ error: 'Quiz not available' }, { status: 403 });
            }

            const learnerProfile = await prisma.learnerProfile.findUnique({
                where: { userId: session.user.id },
                include: { class: true }
            });

            if (!learnerProfile?.class) {
                return NextResponse.json({ error: 'Learner profile not found' }, { status: 404 });
            }

            const quizSubject = await prisma.subject.findUnique({
                where: { id: quiz.subjectId },
                select: { grade: true, schoolId: true }
            });

            if (!quizSubject || quizSubject.schoolId !== session.user.schoolId || quizSubject.grade !== learnerProfile.class.grade) {
                return NextResponse.json({ error: 'Quiz not available for your grade' }, { status: 403 });
            }

            quiz.questions.forEach(q => {
                q.options.forEach(o => {
                    delete (o as { isCorrect?: boolean }).isCorrect;
                });
            });
        }

        return NextResponse.json(quiz);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'LEARNER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { answers } = await req.json(); // { questionId: optionId }

        const quiz = await prisma.quiz.findUnique({
            where: { id },
            include: { questions: { include: { options: true } } }
        });

        if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

        if (!quiz.isPublished) {
            return NextResponse.json({ error: 'Quiz not available' }, { status: 403 });
        }

        const learnerProfile = await prisma.learnerProfile.findUnique({
            where: { userId: session.user.id },
            include: { class: true }
        });

        if (!learnerProfile) {
            return NextResponse.json({ error: 'Learner profile not found' }, { status: 404 });
        }

        const quizSubject = await prisma.subject.findUnique({
            where: { id: quiz.subjectId },
            select: { grade: true, schoolId: true }
        });

        if (!quizSubject || quizSubject.schoolId !== session.user.schoolId || quizSubject.grade !== learnerProfile.class?.grade) {
            return NextResponse.json({ error: 'Quiz not available for your grade' }, { status: 403 });
        }

        // 1. Calculate Score
        let totalPoints = 0;
        let earnedPoints = 0;

        const quizAnswersData: { questionId: string; selectedOptionId: string }[] = [];

        for (const question of quiz.questions) {
            totalPoints += question.points;
            const selectedOptionId = answers[question.id];
            const correctOption = question.options.find(o => o.isCorrect);

            if (selectedOptionId === correctOption?.id) {
                earnedPoints += question.points;
            }

            if (selectedOptionId) {
                quizAnswersData.push({
                    questionId: question.id,
                    selectedOptionId: selectedOptionId
                });
            }
        }

        const scorePercentage = (earnedPoints / totalPoints) * 100;

        // 2. Save Attempt & Answers
        const attempt = await prisma.quizAttempt.create({
            data: {
                quizId: quiz.id,
                learnerId: learnerProfile.id,
                score: scorePercentage,
                completedAt: new Date(),
                answers: {
                    create: quizAnswersData
                }
            }
        });

        return NextResponse.json({ attempt, scorePercentage });
    } catch (error) {
        console.error('Quiz Submission Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
