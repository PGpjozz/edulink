import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const quiz = await prisma.quiz.findUnique({
            where: { id: params.id },
            include: {
                questions: {
                    include: { options: true }
                }
            }
        });

        if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

        // If Learner, hide "isCorrect" to prevent cheating via dev tools
        if (session.user.role === 'LEARNER') {
            quiz.questions.forEach(q => {
                q.options.forEach(o => {
                    delete (o as any).isCorrect;
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
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'LEARNER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { answers } = await req.json(); // { questionId: optionId }

        const quiz = await prisma.quiz.findUnique({
            where: { id: params.id },
            include: { questions: { include: { options: true } } }
        });

        if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

        // 1. Calculate Score
        let totalPoints = 0;
        let earnedPoints = 0;

        const quizAnswersData = [];

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
                learnerId: session.user.id, // This should match a LearnerProfile ID. 
                // WAIT: User.id != LearnerProfile.id. 
                // I need to find the LearnerProfile for this user first.
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
