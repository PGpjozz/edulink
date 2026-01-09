import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const learnerId = searchParams.get('learnerId');
    const session = await getServerSession(authOptions);

    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    try {
        const where: any = {};
        if (learnerId) {
            where.learnerId = learnerId;
        } else if (session.user.role === 'LEARNER') {
            const profile = await prisma.learnerProfile.findUnique({ where: { userId: session.user.id } });
            if (!profile) return NextResponse.json([]);
            where.learnerId = profile.id;
        } else if (session.user.role === 'PARENT') {
            const parentProfile = await prisma.parentProfile.findUnique({ where: { userId: session.user.id } });
            if (!parentProfile) return NextResponse.json([]);
            where.learnerId = { in: parentProfile.learnerIds };
        }

        const records = await prisma.behaviorRecord.findMany({
            where,
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
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TEACHER') {
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
                points: parseInt(points),
                reason
            }
        });

        return NextResponse.json(record);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
