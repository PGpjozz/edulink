import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { canAccessSubject, getLearnersForSubject } from '@/lib/staff-context';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { id: subjectId } = await params;

    if (!(await canAccessSubject(auth, subjectId))) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        const assessments = await prisma.assessment.findMany({
            where: { subjectId },
            orderBy: { date: 'asc' }
        });

        const learners = await getLearnersForSubject(auth, subjectId);

        const grades = await prisma.grade.findMany({
            where: { assessmentId: { in: assessments.map((a) => a.id) } },
        });

        return NextResponse.json({ assessments, learners, grades });
    } catch (error) {
        console.error('Error fetching subject gradebook data:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
