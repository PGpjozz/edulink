import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { notifyParent } from '@/lib/notifications-delivery';
import { canAccessClass } from '@/lib/staff-context';

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Calendar day in the school's local timezone, from a YYYY-MM-DD field. */
function dayRange(dateStr: string): { start: Date; end: Date } | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const start = new Date(year, month - 1, day);
    if (start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day) {
        return null;
    }
    const end = new Date(year, month - 1, day + 1);
    return { start, end };
}

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const dateStr = searchParams.get('date'); // YYYY-MM-DD

    if (!classId || !dateStr) {
        return new NextResponse('Class ID and Date required', { status: 400 });
    }

    try {
        const klass = await prisma.class.findFirst({
            where: { id: classId, schoolId: auth.schoolId as string },
            select: { id: true }
        });

        if (!klass) {
            return new NextResponse('Class not found', { status: 404 });
        }

        if (!['PRINCIPAL', 'SCHOOL_ADMIN', 'SCHOOL_OWNER', 'HOD', 'TEACHER', 'LEARNER', 'PARENT'].includes(auth.role)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (auth.role === 'LEARNER') {
            const learnerProfile = await prisma.learnerProfile.findUnique({
                where: { userId: auth.userId },
                select: { classId: true }
            });

            if (!learnerProfile || learnerProfile.classId !== classId) {
                return new NextResponse('Forbidden', { status: 403 });
            }
        }

        if (auth.role === 'PARENT') {
            const parentProfile = await prisma.parentProfile.findUnique({
                where: { userId: auth.userId },
                select: { learnerIds: true }
            });

            if (!parentProfile?.learnerIds?.length) {
                return new NextResponse('Forbidden', { status: 403 });
            }

            const childInClass = await prisma.learnerProfile.findFirst({
                where: {
                    id: { in: parentProfile.learnerIds },
                    classId
                },
                select: { id: true }
            });

            if (!childInClass) {
                return new NextResponse('Forbidden', { status: 403 });
            }
        }

        const range = dayRange(dateStr);
        if (!range) {
            return new NextResponse('Invalid date', { status: 400 });
        }

        const attendance = await prisma.attendance.findMany({
            where: {
                learner: { classId },
                date: {
                    gte: range.start,
                    lt: range.end
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
    const auth = await requireAuth({
        roles: ['TEACHER', 'HOD', 'PRINCIPAL', 'SCHOOL_ADMIN', 'SCHOOL_OWNER'],
        requireSchoolId: true,
    });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<any>(req);
        if (body instanceof NextResponse) return body;
        const { classId, date, records } = body; // records: [{ learnerId, status, reason }]

        if (!classId || !date || !Array.isArray(records)) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const klass = await prisma.class.findFirst({
            where: { id: classId, schoolId: auth.schoolId as string },
            select: { id: true }
        });

        if (!klass) {
            return new NextResponse('Class not found', { status: 404 });
        }

        if (!(await canAccessClass(auth, classId))) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const range = dayRange(date);
        if (!range) {
            return new NextResponse('Invalid date', { status: 400 });
        }

        const learnerIds = records.map((r: any) => r.learnerId).filter(Boolean);
        if (learnerIds.length !== records.length) {
            return new NextResponse('Invalid records', { status: 400 });
        }

        const allowedStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
        for (const r of records) {
            if (!allowedStatuses.includes(r.status)) {
                return new NextResponse('Invalid status in records', { status: 400 });
            }
        }

        const learnersInClass = await prisma.learnerProfile.count({
            where: { id: { in: learnerIds }, classId }
        });

        if (learnersInClass !== learnerIds.length) {
            return new NextResponse('Invalid learners for class', { status: 400 });
        }

        // Transaction: Delete existing records for this class/date, then create new ones
        await prisma.$transaction(async (tx: TxClient) => {
            await tx.attendance.deleteMany({
                where: {
                    learner: { classId },
                    date: {
                        gte: range.start,
                        lt: range.end
                    }
                }
            });

            await tx.attendance.createMany({
                data: records.map((r: any) => ({
                    learnerId: r.learnerId,
                    date: range.start,
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
                    const message = `${learner.user.firstName} was marked ${r.status.toLowerCase()} for today (${range.start.toLocaleDateString()}). ${r.reason ? `Reason: ${r.reason}` : ''}`;

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
                        select: { firstName: true, lastName: true, phoneNumber: true, email: true },
                    });

                    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
                    for (const p of parentUsers) {
                        await notifyParent({
                            parentName: `${p.firstName} ${p.lastName}`,
                            phoneNumber: p.phoneNumber,
                            email: p.email,
                            title,
                            message,
                            link: `${baseUrl}/dashboard/parent/notifications`,
                        });
                    }
                }
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'SAVE_ATTENDANCE',
            entity: 'CLASS',
            entityId: classId,
            details: { date: range.start.toISOString(), learnerCount: records.length }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving attendance:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
