import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import {
    behaviorErrorResponse,
    behaviorListWhere,
    canLogBehavior,
    createBehaviorRecord,
} from '@/lib/behavior';
import { canAccessLearner } from '@/lib/staff-context';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const learnerId = searchParams.get('learnerId');
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const baseWhere = await behaviorListWhere(auth);
        if (!baseWhere) {
            return behaviorErrorResponse('Forbidden', 403);
        }

        let where = baseWhere;

        if (learnerId) {
            if (!(await canAccessLearner(auth, learnerId))) {
                const profile = await prisma.learnerProfile.findFirst({
                    where: { id: learnerId, user: { schoolId: auth.schoolId! } },
                    select: { id: true },
                });
                if (!profile) return behaviorErrorResponse('Learner not found', 404);
                return behaviorErrorResponse('Forbidden', 403);
            }
            where = { AND: [baseWhere, { learnerId }] };
        }

        const records = await prisma.behaviorRecord.findMany({
            where,
            include: {
                teacher: { select: { firstName: true, lastName: true } },
                learner: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(records);
    } catch (error) {
        console.error('Error fetching school behavior records:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (!canLogBehavior(auth.role)) {
        return behaviorErrorResponse('Forbidden', 403);
    }

    try {
        const body = await readJson<{
            learnerId?: string;
            type?: string;
            category?: string;
            points?: number;
            reason?: string;
        }>(req);
        if (body instanceof NextResponse) return body;

        const result = await createBehaviorRecord(auth, {
            learnerId: body.learnerId ?? '',
            type: body.type ?? '',
            category: body.category ?? '',
            points: body.points ?? 0,
            reason: body.reason ?? '',
        });

        if (!result.ok) {
            return behaviorErrorResponse(result.error, result.status);
        }

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_BEHAVIOR_RECORD',
            entity: 'BEHAVIOR_RECORD',
            entityId: result.record.id,
            details: {
                learnerId: body.learnerId,
                type: body.type,
                category: body.category,
                points: result.record.points,
            },
        });

        return NextResponse.json(result.record);
    } catch (error) {
        console.error('Error creating school behavior record:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
