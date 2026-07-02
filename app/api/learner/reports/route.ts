import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { resolveLearnerAccess } from '@/lib/parent-access';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const access = await resolveLearnerAccess(auth, searchParams.get('childId'));
    if (!access.ok) return access.response;

    const reports = await prisma.reportCard.findMany({
        where: {
            learnerId: access.learnerProfileId,
            schoolId: auth.schoolId as string,
            status: 'PUBLISHED',
        },
        orderBy: [{ year: 'desc' }, { term: 'desc' }],
        select: {
            id: true,
            term: true,
            year: true,
            termLabel: true,
            grade: true,
            className: true,
            overallAverage: true,
            attendanceRate: true,
            publishedAt: true,
        },
    });

    return NextResponse.json(reports);
}
