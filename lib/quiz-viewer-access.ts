import type { AuthContext } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { normalizeQuizViewerGrades } from '@/lib/quiz-access';

export async function getRestrictedQuizViewerGrades(
    auth: Pick<AuthContext, 'role' | 'userId' | 'schoolId'>,
) {
    if (auth.role === 'LEARNER') {
        const learner = await prisma.learnerProfile.findUnique({
            where: { userId: auth.userId },
            select: { grade: true, class: { select: { grade: true } } },
        });
        return normalizeQuizViewerGrades([learner?.class?.grade ?? learner?.grade]);
    }

    if (auth.role === 'PARENT') {
        const parent = await prisma.parentProfile.findUnique({
            where: { userId: auth.userId },
            select: { learnerIds: true },
        });
        if (!parent?.learnerIds.length) return [];

        const learners = await prisma.learnerProfile.findMany({
            where: {
                id: { in: parent.learnerIds },
                user: { schoolId: auth.schoolId },
            },
            select: { grade: true, class: { select: { grade: true } } },
        });

        return normalizeQuizViewerGrades(
            learners.map((learner) => learner.class?.grade ?? learner.grade),
        );
    }

    return [];
}
