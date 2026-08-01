import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson } from '@/lib/api-auth';
import {
    canRestrictedViewerAccessQuiz,
    isRestrictedQuizViewer,
    stripQuizAnswerKeys,
} from '@/lib/quiz-access';
import { getRestrictedQuizViewerGrades } from '@/lib/quiz-viewer-access';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const { id } = await params;
        const quiz = await prisma.quiz.findFirst({
            where: { id, subject: { schoolId: auth.schoolId as string } },
            include: {
                subject: { select: { grade: true, schoolId: true } },
                questions: {
                    include: { options: true }
                }
            }
        });

        if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

        if (isRestrictedQuizViewer(auth.role)) {
            const viewerGrades = await getRestrictedQuizViewerGrades(auth);
            if (!canRestrictedViewerAccessQuiz({
                role: auth.role,
                isPublished: quiz.isPublished,
                subjectGrade: quiz.subject.grade,
                viewerGrades,
            })) {
                return NextResponse.json({ error: 'Quiz not available for your grade' }, { status: 403 });
            }

            stripQuizAnswerKeys(quiz);
        }

        return NextResponse.json(quiz);
    } catch (error) {
        console.error('Quiz GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth({ roles: ['LEARNER'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const { id } = await params;
        const body = await readJson<{ answers?: Record<string, string> }>(req);
        if (body instanceof NextResponse) return body;
        const answers = body.answers ?? {}; // { questionId: optionId }

        const quiz = await prisma.quiz.findFirst({
            where: { id, subject: { schoolId: auth.schoolId as string } },
            include: {
                subject: { select: { grade: true } },
                questions: { include: { options: true } }
            }
        });

        if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

        if (!quiz.isPublished) {
            return NextResponse.json({ error: 'Quiz not available' }, { status: 403 });
        }

        const learnerProfile = await prisma.learnerProfile.findUnique({
            where: { userId: auth.userId },
            include: { class: true }
        });

        if (!learnerProfile) {
            return NextResponse.json({ error: 'Learner profile not found' }, { status: 404 });
        }

        if (quiz.subject.grade !== learnerProfile.class?.grade) {
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

        const scorePercentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

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
