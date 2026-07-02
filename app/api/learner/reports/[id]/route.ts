import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { resolveLearnerAccess } from '@/lib/parent-access';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const access = await resolveLearnerAccess(auth, searchParams.get('childId'));
    if (!access.ok) return access.response;

    const { id } = await params;
    const report = await prisma.reportCard.findFirst({
        where: {
            id,
            learnerId: access.learnerProfileId,
            schoolId: auth.schoolId as string,
            status: 'PUBLISHED',
        },
        include: {
            entries: { orderBy: { subjectName: 'asc' } },
            learner: { include: { user: { select: { firstName: true, lastName: true } } } },
            school: { select: { name: true } },
        },
    });

    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    // Shape matches the existing ReportCard.tsx renderer.
    return NextResponse.json({
        learner: {
            name: `${report.learner.user.firstName} ${report.learner.user.lastName}`,
            grade: report.grade,
            className: report.className,
            schoolName: report.school.name,
        },
        term: report.termLabel,
        subjects: report.entries.map((e) => ({
            subjectName: e.subjectName,
            subjectCode: e.subjectCode || '',
            average: e.percentage,
            level: e.capsLevel,
            comment: e.teacherComment || e.capsDescriptor || 'No comment provided',
        })),
        stats: {
            attendanceRate: report.attendanceRate ?? 0,
            overallAverage: report.overallAverage ?? 0,
        },
        principalComment: report.principalComment,
        printUrl: `/api/school/reports/${report.id}/print`,
    });
}
