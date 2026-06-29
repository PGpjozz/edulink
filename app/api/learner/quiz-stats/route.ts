import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId || session.user.role !== 'LEARNER') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const profile = await prisma.learnerProfile.findUnique({
            where: { userId: session.user.id }
        });

        if (!profile) {
            return NextResponse.json({ completed: 0, averageScore: null, focusArea: null });
        }

        const attempts = await prisma.quizAttempt.findMany({
            where: {
                learnerId: profile.id,
                completedAt: { not: null },
                score: { not: null }
            },
            include: {
                quiz: { include: { subject: true } }
            },
            orderBy: { completedAt: 'desc' }
        });

        const completed = attempts.length;
        const averageScore = completed > 0
            ? Math.round(attempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / completed)
            : null;

        const subjectScores: Record<string, number[]> = {};
        for (const attempt of attempts) {
            const subjectName = attempt.quiz.subject?.name;
            if (!subjectName || attempt.score == null) continue;
            if (!subjectScores[subjectName]) subjectScores[subjectName] = [];
            subjectScores[subjectName].push(attempt.score);
        }

        const subjectAverages = Object.entries(subjectScores).map(([name, scores]) => ({
            name,
            average: scores.reduce((a, b) => a + b, 0) / scores.length
        }));

        const weakest = subjectAverages.sort((a, b) => a.average - b.average)[0];

        return NextResponse.json({
            completed,
            averageScore,
            focusArea: weakest && weakest.average < 70
                ? {
                    subject: weakest.name,
                    message: `Based on your recent ${weakest.name} quiz results, consider reviewing key topics before your next assessment.`
                }
                : null
        });
    } catch (error) {
        console.error('Error fetching quiz stats:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
