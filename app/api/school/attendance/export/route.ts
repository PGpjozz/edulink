import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { canManageSchool } from '@/lib/permissions';
import { termDateRange } from '@/lib/caps';
import { toCsv, csvResponse } from '@/lib/csv';

/** CSV attendance register for a class over a term. */
export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;
    if (!canManageSchool(auth.role) && auth.role !== 'HOD') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const term = Number(searchParams.get('term'));
    const year = Number(searchParams.get('year'));

    if (!classId || !Number.isInteger(term) || !Number.isInteger(year)) {
        return NextResponse.json({ error: 'classId, term and year are required' }, { status: 400 });
    }

    const klass = await prisma.class.findFirst({
        where: { id: classId, schoolId: auth.schoolId as string },
        select: { id: true, name: true },
    });
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const { start, end } = termDateRange(term, year);

    const learners = await prisma.learnerProfile.findMany({
        where: { classId },
        include: {
            user: { select: { firstName: true, lastName: true, idNumber: true } },
            attendance: {
                where: { date: { gte: start, lt: end } },
                select: { status: true },
            },
        },
        orderBy: { user: { lastName: 'asc' } },
    });

    const headers = ['Learner', 'ID Number', 'Present', 'Late', 'Absent', 'Total Days', 'Attendance %'];
    const rows = learners.map((l) => {
        const present = l.attendance.filter((a) => a.status === 'PRESENT').length;
        const late = l.attendance.filter((a) => a.status === 'LATE').length;
        const absent = l.attendance.filter((a) => a.status === 'ABSENT').length;
        const total = l.attendance.length;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : '';
        return [
            `${l.user.firstName} ${l.user.lastName}`,
            l.user.idNumber ?? '',
            present, late, absent, total, rate,
        ];
    });

    return csvResponse(`attendance-${klass.name}-T${term}-${year}.csv`, toCsv(headers, rows));
}
