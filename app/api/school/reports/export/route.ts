import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { canManageSchool } from '@/lib/permissions';
import { toCsv, csvResponse } from '@/lib/csv';

/** CSV of report-card results for a term (one row per learner-subject). */
export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;
    if (!canManageSchool(auth.role) && auth.role !== 'HOD') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const term = searchParams.get('term');
    const year = searchParams.get('year');
    const grade = searchParams.get('grade');

    const reports = await prisma.reportCard.findMany({
        where: {
            schoolId: auth.schoolId as string,
            ...(term ? { term: Number(term) } : {}),
            ...(year ? { year: Number(year) } : {}),
            ...(grade ? { grade } : {}),
        },
        include: {
            entries: { orderBy: { subjectName: 'asc' } },
            learner: { include: { user: { select: { firstName: true, lastName: true, idNumber: true } } } },
        },
        orderBy: [{ className: 'asc' }],
    });

    const headers = [
        'Learner', 'ID Number', 'Grade', 'Class', 'Term', 'Year', 'Status',
        'Subject', 'CAPS Level', 'Percentage', 'Assessments', 'Overall Average', 'Attendance %',
    ];
    const rows: unknown[][] = [];
    for (const r of reports) {
        const name = `${r.learner.user.firstName} ${r.learner.user.lastName}`;
        if (r.entries.length === 0) {
            rows.push([name, r.learner.user.idNumber ?? '', r.grade, r.className, r.term, r.year, r.status, '', '', '', 0, r.overallAverage ?? '', r.attendanceRate ?? '']);
            continue;
        }
        for (const e of r.entries) {
            rows.push([
                name, r.learner.user.idNumber ?? '', r.grade, r.className, r.term, r.year, r.status,
                e.subjectName, e.capsLevel ?? '', e.percentage ?? '', e.assessmentCount, r.overallAverage ?? '', r.attendanceRate ?? '',
            ]);
        }
    }

    const filename = `reports-${term ?? 'all'}-${year ?? 'all'}.csv`;
    return csvResponse(filename, toCsv(headers, rows));
}
