import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const learnerId = searchParams.get('learnerId');
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const where: any = {};
        if (learnerId) {
            if (auth.role === 'LEARNER') {
                const profile = await prisma.learnerProfile.findUnique({ where: { userId: auth.userId }, select: { id: true } });
                if (!profile || profile.id !== learnerId) {
                    return new NextResponse('Forbidden', { status: 403 });
                }
                where.learnerId = learnerId;
            } else if (auth.role === 'PARENT') {
                const parentProfile = await prisma.parentProfile.findUnique({ where: { userId: auth.userId }, select: { learnerIds: true } });
                if (!parentProfile?.learnerIds?.includes(learnerId)) {
                    return new NextResponse('Forbidden', { status: 403 });
                }

                const learner = await prisma.learnerProfile.findFirst({
                    where: { id: learnerId, user: { schoolId: auth.schoolId as string } },
                    select: { id: true }
                });

                if (!learner) return new NextResponse('Learner not found', { status: 404 });
                where.learnerId = learnerId;
            } else if (['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN'].includes(auth.role)) {
                const learner = await prisma.learnerProfile.findFirst({
                    where: { id: learnerId, user: { schoolId: auth.schoolId as string } },
                    select: { id: true }
                });

                if (!learner) return new NextResponse('Learner not found', { status: 404 });
                where.learnerId = learnerId;
            } else {
                return new NextResponse('Forbidden', { status: 403 });
            }
        } else if (auth.role === 'LEARNER') {
            const profile = await prisma.learnerProfile.findUnique({ where: { userId: auth.userId } });
            if (!profile) return NextResponse.json([]);
            where.learnerId = profile.id;
        } else if (auth.role === 'PARENT') {
            const parentProfile = await prisma.parentProfile.findUnique({ where: { userId: auth.userId } });
            if (!parentProfile) return NextResponse.json([]);
            where.learnerId = { in: parentProfile.learnerIds };
        } else if (!['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN'].includes(auth.role)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const records = await prisma.behaviorRecord.findMany({
            where: {
                ...where,
                learner: { user: { schoolId: auth.schoolId as string } }
            },
            include: {
                teacher: { select: { firstName: true, lastName: true } },
                learner: { include: { user: { select: { firstName: true, lastName: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(records);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ learnerId?: string; type?: string; category?: string; points?: number; reason?: string }>(req);
        if (body instanceof NextResponse) return body;
        const { learnerId, type, category, points, reason } = body;

        if (!learnerId || !type || !category || points === undefined || points === null || !reason) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        if (type !== 'MERIT' && type !== 'DEMERIT') {
            return new NextResponse('Invalid type', { status: 400 });
        }

        const learner = await prisma.learnerProfile.findFirst({
            where: { id: learnerId, user: { schoolId: auth.schoolId as string } },
            select: { id: true }
        });

        if (!learner) {
            return new NextResponse('Learner not found', { status: 404 });
        }

        const pointsNum = Number(points);
        if (!Number.isFinite(pointsNum) || pointsNum === 0) {
            return new NextResponse('Invalid points', { status: 400 });
        }

        const record = await prisma.behaviorRecord.create({
            data: {
                learnerId,
                teacherId: auth.userId,
                type,
                category,
                points: type === 'DEMERIT' ? -Math.abs(pointsNum) : Math.abs(pointsNum),
                reason
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_BEHAVIOR_RECORD',
            entity: 'BEHAVIOR_RECORD',
            entityId: record.id,
            details: { learnerId, type, category, points: record.points }
        });

        return NextResponse.json(record);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
