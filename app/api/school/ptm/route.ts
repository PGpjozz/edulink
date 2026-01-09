import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    try {
        const schoolId = session.user.schoolId;
        const sessions = await prisma.ptmSession.findMany({
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

        const ptmSession = await prisma.ptmSession.create({
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

        const booking = await prisma.ptmBooking.create({
            data: {
                sessionId,
                learnerId,
                parentId: session.user.id,
                startTime: new Date(startTime),
                endTime: new Date(endTime)
            }
        });

        return NextResponse.json(booking);
    } catch (error) {
        // If unique constraint fails (already booked)
        if (error.code === 'P2002') {
            return new NextResponse('Slot already booked', { status: 400 });
        }
        return new NextResponse('Internal Error', { status: 500 });
    }
}
