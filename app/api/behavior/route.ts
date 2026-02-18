import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

export async function GET() {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const where: any = {
            learner: { user: { schoolId: auth.schoolId as string } }
        };

        if (auth.role === 'LEARNER') {
            const learnerProfile = await prisma.learnerProfile.findUnique({
                where: { userId: auth.userId },
                select: { id: true }
            });
            if (!learnerProfile) return NextResponse.json([]);
            where.learnerId = learnerProfile.id;
        }

        if (auth.role === 'PARENT') {
            const parentProfile = await prisma.parentProfile.findUnique({
                where: { userId: auth.userId },
                select: { learnerIds: true }
            });
            if (!parentProfile?.learnerIds?.length) return NextResponse.json([]);
            where.learnerId = { in: parentProfile.learnerIds };
        }

        if (!['PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER', 'LEARNER', 'PARENT'].includes(auth.role)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const records = await prisma.behaviorRecord.findMany({
            where,
            include: {
                teacher: { select: { firstName: true, lastName: true, role: true } },
                learner: {
                    include: {
                        user: {
                            select: { firstName: true, lastName: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return NextResponse.json(records);
    } catch (error) {
        console.error('Error fetching behavior records:', error);
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
            include: { user: { select: { firstName: true, lastName: true } } }
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
            },
            include: {
                learner: {
                    include: {
                        user: {
                            select: { firstName: true, lastName: true }
                        }
                    }
                }
            }
        });

        // Send notification to parents
        const learnerRecord = record.learner;
        if (learnerRecord.parentIds && learnerRecord.parentIds.length > 0) {
            await prisma.notification.createMany({
                data: learnerRecord.parentIds.map((parentId: string) => ({
                    userId: parentId,
                    title: `Behavioral Update: ${learnerRecord.user.firstName}`,
                    message: `${learnerRecord.user.firstName} received a ${type === 'MERIT' ? 'merit' : 'demerit'} for ${category}: ${reason}`,
                    type: 'BEHAVIOR',
                    link: '/dashboard/parent/notifications'
                }))
            });
        }

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
        console.error('Error creating behavior record:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
