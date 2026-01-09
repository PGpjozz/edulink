import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const records = await prisma.behaviorRecord.findMany({
            where: {
                learner: {
                    schoolId: session.user.schoolId
                }
            },
            include: {
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
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId || !['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN'].includes(session.user.role)) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { learnerId, type, category, points, reason } = body;

        const record = await prisma.behaviorRecord.create({
            data: {
                learnerId,
                teacherId: session.user.id,
                type,
                category,
                points: type === 'DEMERIT' ? -Math.abs(points) : Math.abs(points),
                reason
            },
            include: {
                learner: {
                    include: {
                        user: {
                            select: { firstName: true, lastName: true }
                        },
                        parentIds: true
                    }
                }
            }
        });

        // Send notification to parents
        if (record.learner.parentIds && record.learner.parentIds.length > 0) {
            await prisma.notification.createMany({
                data: record.learner.parentIds.map(parentId => ({
                    userId: parentId,
                    title: `Behavioral Update: ${record.learner.user.firstName}`,
                    message: `${record.learner.user.firstName} received a ${type === 'MERIT' ? 'merit' : 'demerit'} for ${category}: ${reason}`,
                    type: 'BEHAVIOR',
                    link: '/dashboard/parent/notifications'
                }))
            });
        }

        return NextResponse.json(record);
    } catch (error) {
        console.error('Error creating behavior record:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
