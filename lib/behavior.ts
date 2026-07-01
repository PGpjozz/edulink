import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { AuthContext } from '@/lib/api-auth';
import { canManageSchool, GRADING_ROLES } from '@/lib/permissions';
import { canAccessLearner, getStaffContext } from '@/lib/staff-context';
import type { Prisma } from '@prisma/client';

export const BEHAVIOR_STAFF_ROLES = [...GRADING_ROLES] as string[];

export function canLogBehavior(role: string): boolean {
    return BEHAVIOR_STAFF_ROLES.includes(role);
}

export async function behaviorListWhere(auth: AuthContext): Promise<Prisma.BehaviorRecordWhereInput | null> {
    const schoolFilter = { learner: { user: { schoolId: auth.schoolId! } } };

    if (canManageSchool(auth.role)) {
        return schoolFilter;
    }

    if (auth.role === 'LEARNER') {
        const profile = await prisma.learnerProfile.findUnique({
            where: { userId: auth.userId },
            select: { id: true },
        });
        if (!profile) return { ...schoolFilter, learnerId: { in: [] } };
        return { ...schoolFilter, learnerId: profile.id };
    }

    if (auth.role === 'PARENT') {
        const parentProfile = await prisma.parentProfile.findUnique({
            where: { userId: auth.userId },
            select: { learnerIds: true },
        });
        if (!parentProfile?.learnerIds?.length) return { ...schoolFilter, learnerId: { in: [] } };
        return { ...schoolFilter, learnerId: { in: parentProfile.learnerIds } };
    }

    if (canLogBehavior(auth.role)) {
        const ctx = await getStaffContext(auth);
        const orClauses: Prisma.BehaviorRecordWhereInput[] = [];

        if (ctx.learnerIds.length > 0) {
            orClauses.push({ learnerId: { in: ctx.learnerIds } });
        }
        if (ctx.gradesTaught.length > 0) {
            orClauses.push({ learner: { class: { grade: { in: ctx.gradesTaught } } } });
        }

        if (orClauses.length === 0) {
            return { ...schoolFilter, learnerId: { in: [] } };
        }

        return { ...schoolFilter, OR: orClauses };
    }

    return null;
}

export type CreateBehaviorResult =
    | { ok: true; record: { id: string; points: number; learner: { user: { firstName: string } } } }
    | { ok: false; error: string; status: number };

export async function createBehaviorRecord(
    auth: AuthContext,
    data: { learnerId: string; type: string; category: string; points: number; reason: string },
): Promise<CreateBehaviorResult> {
    const { learnerId, type, category, points, reason } = data;

    if (!learnerId || !type || !category || points === undefined || points === null || !reason) {
        return { ok: false, error: 'Missing required fields', status: 400 };
    }

    if (type !== 'MERIT' && type !== 'DEMERIT') {
        return { ok: false, error: 'Invalid type', status: 400 };
    }

    if (!canLogBehavior(auth.role)) {
        return { ok: false, error: 'Forbidden', status: 403 };
    }

    const learner = await prisma.learnerProfile.findFirst({
        where: { id: learnerId, user: { schoolId: auth.schoolId! } },
        include: { user: { select: { firstName: true, lastName: true } } },
    });

    if (!learner) {
        return { ok: false, error: 'Learner not found', status: 404 };
    }

    if (!canManageSchool(auth.role) && !(await canAccessLearner(auth, learnerId))) {
        return { ok: false, error: 'Forbidden', status: 403 };
    }

    const pointsNum = Number(points);
    if (!Number.isFinite(pointsNum) || pointsNum === 0) {
        return { ok: false, error: 'Invalid points', status: 400 };
    }

    const record = await prisma.behaviorRecord.create({
        data: {
            learnerId,
            teacherId: auth.userId,
            type,
            category,
            points: type === 'DEMERIT' ? -Math.abs(pointsNum) : Math.abs(pointsNum),
            reason,
        },
        include: {
            teacher: { select: { firstName: true, lastName: true, role: true } },
            learner: {
                include: {
                    user: { select: { firstName: true, lastName: true } },
                },
            },
        },
    });

    if (learner.parentIds.length > 0) {
        await prisma.notification.createMany({
            data: learner.parentIds.map((parentUserId) => ({
                userId: parentUserId,
                title: `Behavioral Update: ${learner.user.firstName}`,
                message: `${learner.user.firstName} received a ${type === 'MERIT' ? 'merit' : 'demerit'} for ${category}: ${reason}`,
                type: 'BEHAVIOR' as const,
                link: '/dashboard/parent/notifications',
            })),
        });
    }

    return { ok: true, record };
}

export function behaviorErrorResponse(message: string, status: number) {
    return new NextResponse(message, { status });
}
