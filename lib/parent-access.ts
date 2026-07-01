import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { AuthContext } from '@/lib/api-auth';

export type LearnerAccessResult =
    | { ok: true; learnerUserId: string; learnerProfileId: string }
    | { ok: false; response: NextResponse };

/** Resolve which learner record the caller may access (learner self or parent's child). */
export async function resolveLearnerAccess(
    auth: Pick<AuthContext, 'userId' | 'role' | 'schoolId'>,
    childUserId?: string | null,
): Promise<LearnerAccessResult> {
    if (!auth.schoolId) {
        return { ok: false, response: new NextResponse('Unauthorized', { status: 401 }) };
    }

    if (auth.role === 'LEARNER') {
        const profile = await prisma.learnerProfile.findUnique({
            where: { userId: auth.userId },
            select: { id: true, user: { select: { schoolId: true } } },
        });
        if (!profile || profile.user.schoolId !== auth.schoolId) {
            return { ok: false, response: new NextResponse('Forbidden', { status: 403 }) };
        }
        return { ok: true, learnerUserId: auth.userId, learnerProfileId: profile.id };
    }

    if (auth.role === 'PARENT') {
        if (!childUserId) {
            return { ok: false, response: new NextResponse('Child ID required', { status: 400 }) };
        }

        const [parentProfile, learnerProfile] = await Promise.all([
            prisma.parentProfile.findUnique({
                where: { userId: auth.userId },
                select: { learnerIds: true },
            }),
            prisma.learnerProfile.findUnique({
                where: { userId: childUserId },
                select: { id: true, user: { select: { schoolId: true } } },
            }),
        ]);

        if (!learnerProfile || learnerProfile.user.schoolId !== auth.schoolId) {
            return { ok: false, response: new NextResponse('Learner not found', { status: 404 }) };
        }

        if (!parentProfile?.learnerIds.includes(learnerProfile.id)) {
            return { ok: false, response: new NextResponse('Forbidden', { status: 403 }) };
        }

        return { ok: true, learnerUserId: childUserId, learnerProfileId: learnerProfile.id };
    }

    return { ok: false, response: new NextResponse('Unauthorized', { status: 401 }) };
}
