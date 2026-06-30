import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, type AuthContext } from '@/lib/api-auth';
import { canAccessSubject } from '@/lib/staff-context';
import { formatAssessmentTitle } from '@/lib/assessment-utils';

async function getAssessmentForAuth(assessmentId: string, auth: AuthContext) {
    const assessment = await prisma.assessment.findFirst({
        where: { id: assessmentId, subject: { schoolId: auth.schoolId! } },
        include: {
            subject: { select: { id: true, name: true, grade: true, code: true, teacherId: true } },
            _count: { select: { grades: true } },
        },
    });

    if (!assessment) return null;

    if (auth.role === 'TEACHER') {
        const teacherProfile = await prisma.teacherProfile.findUnique({
            where: { userId: auth.userId },
            select: { id: true },
        });
        if (!teacherProfile || assessment.subject.teacherId !== teacherProfile.id) {
            return null;
        }
    } else if (!(await canAccessSubject(auth, assessment.subjectId))) {
        return null;
    }

    return assessment;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ roles: ['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'HOD'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    try {
        const assessment = await getAssessmentForAuth(id, auth);
        if (!assessment) {
            return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...assessment,
            displayTitle: formatAssessmentTitle({
                term: assessment.term,
                paper: assessment.paper,
                title: assessment.title,
                type: assessment.type,
                subjectName: assessment.subject.name,
            }),
        });
    } catch (error) {
        console.error('Error fetching assessment:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
