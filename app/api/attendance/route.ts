import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const dateStr = searchParams.get('date'); // YYYY-MM-DD

    if (!classId || !dateStr) {
        return new NextResponse('Class ID and Date required', { status: 400 });
    }

    try {
        // Parse date range for the specific day to avoid timezone issues
        const date = new Date(dateStr);
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);

        const attendance = await prisma.attendance.findMany({
            where: {
                learner: { classId },
                date: {
                    gte: date,
                    lt: nextDay
                }
            },
            include: {
                learner: {
                    include: { user: { select: { firstName: true, lastName: true } } }
                }
            }
        });

        return NextResponse.json(attendance);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId || session.user.role !== 'TEACHER') {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        const body = await req.json();
        const { classId, date, records } = body; // records: [{ learnerId, status, reason }]

        // Validate class ownership (optional but recommended)
        // ...

        const selectedDate = new Date(date);
        const nextDay = new Date(selectedDate);
        nextDay.setDate(selectedDate.getDate() + 1);

        // Transaction: Delete existing records for this class/date, then create new ones
        await prisma.$transaction(async (tx) => {
            await tx.attendance.deleteMany({
                where: {
                    learner: { classId },
                    date: {
                        gte: selectedDate,
                        lt: nextDay
                    }
                }
            });

            await tx.attendance.createMany({
                data: records.map((r: any) => ({
                    learnerId: r.learnerId,
                    date: selectedDate,
                    status: r.status,
                    reason: r.reason
                }))
            });

            // Trigger Notifications for ABSENT or LATE
            const alertRecords = records.filter((r: any) => r.status === 'ABSENT' || r.status === 'LATE');

            if (alertRecords.length > 0) {
                const learners = await tx.learnerProfile.findMany({
                    where: { id: { in: alertRecords.map((r: any) => r.learnerId) } },
                    include: { user: { select: { firstName: true, lastName: true } } }
                });

                for (const r of alertRecords) {
                    const learner = learners.find(l => l.id === r.learnerId);
                    if (!learner || !learner.parentIds.length) continue;

                    const title = `Attendance Alert: ${learner.user.firstName}`;
                    const message = `${learner.user.firstName} was marked ${r.status.toLowerCase()} for today (${selectedDate.toLocaleDateString()}). ${r.reason ? `Reason: ${r.reason}` : ''}`;

                    // Create notifications for all linked parents
                    await tx.notification.createMany({
                        data: learner.parentIds.map(parentId => ({
                            userId: parentId,
                            title,
                            message,
                            type: 'ATTENDANCE',
                            link: '/dashboard/parent/notifications'
                        }))
                    });

                    // SIMULATE SMS SENDING (SaaS Feature)
                    const parentUsers = await tx.user.findMany({
                        where: { id: { in: learner.parentIds } },
                        select: { firstName: true, lastName: true, phoneNumber: true }
                    });

                    parentUsers.forEach(p => {
                        const parentName = `${p.firstName} ${p.lastName}`;
                        if (p.phoneNumber) {
                            console.log(`[SIMULATED SMS] TO: ${p.phoneNumber} (${parentName}) | MSG: ${message}`);
                        } else {
                            console.log(`[SIMULATED PUSH] TO: ${parentName} (In-App Only) | MSG: ${message}`);
                        }
                    });
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving attendance:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
