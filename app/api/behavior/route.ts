import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import {
    behaviorErrorResponse,
    behaviorListWhere,
    canLogBehavior,
    createBehaviorRecord,
} from '@/lib/behavior';

export async function GET() {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const where = await behaviorListWhere(auth);
        if (!where) {
            return behaviorErrorResponse('Forbidden', 403);
        }

        const records = await prisma.behaviorRecord.findMany({
            where,
            include: {
                teacher: { select: { firstName: true, lastName: true, role: true } },
                learner: {
                    include: {
                        user: { select: { firstName: true, lastName: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        return NextResponse.json(records);
    } catch (error) {
        console.error('Error fetching behavior records:', error);
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
        console.error('Error creating behavior record:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
