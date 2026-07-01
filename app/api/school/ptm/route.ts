import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    try {
        const schoolId = session.user.schoolId || '';
        const sessions = await prisma.pTMSession.findMany({
            where: { schoolId },
            include: {
                teacher: { select: { firstName: true, lastName: true } },
                bookings: {
                    include: {
                        parent: { select: { firstName: true, lastName: true } },
                        learner: { include: { user: { select: { firstName: true, lastName: true } } } }
                    }
                }
            },
            orderBy: { date: 'asc' }
        });

        return NextResponse.json(sessions);
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
        const { date, startTime, endTime, slotDuration } = body;

        const ptmSession = await prisma.pTMSession.create({
            data: {
                schoolId: session.user.schoolId!,
                teacherId: session.user.id,
                date: new Date(date),
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                slotDuration
            }
        });

        return NextResponse.json(ptmSession);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PARENT') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { sessionId, learnerId, startTime, endTime } = body;

        const ptmSession = await prisma.pTMSession.findUnique({
            where: { id: sessionId },
            select: { teacherId: true, date: true },
        });

        if (!ptmSession) {
            return new NextResponse('Session not found', { status: 404 });
        }

        const [learner, parent] = await Promise.all([
            prisma.learnerProfile.findUnique({
                where: { id: learnerId },
                select: { user: { select: { firstName: true, lastName: true } } },
            }),
            prisma.user.findUnique({
                where: { id: session.user.id },
                select: { firstName: true, lastName: true },
            }),
        ]);

        const booking = await prisma.pTMBooking.create({
            data: {
                sessionId,
                learnerId,
                parentId: session.user.id,
                startTime: new Date(startTime),
                endTime: new Date(endTime)
            }
        });

        const learnerName = learner
            ? `${learner.user.firstName} ${learner.user.lastName}`
            : 'a learner';
        const parentName = parent ? `${parent.firstName} ${parent.lastName}` : 'A parent';
        const slotTime = new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        await createNotification({
            userId: ptmSession.teacherId,
            title: 'New PTM booking',
            message: `${parentName} booked a meeting for ${learnerName} at ${slotTime}.`,
            type: 'SYSTEM',
            link: '/dashboard/teacher/meetings',
        });

        return NextResponse.json(booking);
    } catch (error: any) {
        // If unique constraint fails (already booked)
        if (error.code === 'P2002') {
            return new NextResponse('Slot already booked', { status: 400 });
        }
        return new NextResponse('Internal Error', { status: 500 });
    }
}
