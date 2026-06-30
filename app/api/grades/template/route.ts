import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { buildGradesCsvTemplate } from '@/lib/assessment-utils';

async function authorizeAssessment(assessmentId: string, auth: { schoolId: string | null; userId: string; role: string }) {
    const assessment = await prisma.assessment.findFirst({
        where: { id: assessmentId, subject: { schoolId: auth.schoolId! } },
        select: {
            id: true,
            title: true,
            term: true,
            paper: true,
            totalMarks: true,
            subject: { select: { name: true, teacherId: true } },
        },
    });

    if (!assessment) return null;

    if (auth.role === 'TEACHER') {
        const teacherProfile = await prisma.teacherProfile.findUnique({
            where: { userId: auth.userId },
            select: { id: true },
        });
        if (!teacherProfile || assessment.subject.teacherId !== teacherProfile.id) return null;
    }

    return assessment;
}

export async function GET(req: Request) {
    const auth = await requireAuth({ roles: ['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get('assessmentId');
    const subjectId = searchParams.get('subjectId');

    if (!assessmentId || !subjectId) {
        return NextResponse.json({ error: 'assessmentId and subjectId required' }, { status: 400 });
    }

    try {
        const assessment = await authorizeAssessment(assessmentId, auth);
        if (!assessment) {
            return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
        }

        const learners = await prisma.learnerProfile.findMany({
            where: {
                class: {
                    schoolId: auth.schoolId!,
                    classSubjects: { some: { subjectId } },
                },
            },
            include: {
                user: { select: { firstName: true, lastName: true, idNumber: true } },
            },
            orderBy: { user: { lastName: 'asc' } },
        });

        const grades = await prisma.grade.findMany({
            where: { assessmentId },
            select: { learnerId: true, score: true, comments: true },
        });

        const gradeMap: Record<string, { score?: number; comments?: string }> = {};
        for (const grade of grades) {
            gradeMap[grade.learnerId] = { score: grade.score, comments: grade.comments ?? undefined };
        }

        const csv = buildGradesCsvTemplate(learners, gradeMap);
        const label = [assessment.term, assessment.paper, assessment.title].filter(Boolean).join('_').replace(/[^a-zA-Z0-9]+/g, '_');
        const filename = `marks_template_${label || assessmentId}.csv`;

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Grade template error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
