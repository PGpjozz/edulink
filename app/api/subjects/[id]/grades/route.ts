import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: subjectId } = await params;

    try {
        // Fetch all assessments for this subject
        const assessments = await prisma.assessment.findMany({
            where: { subjectId },
            orderBy: { date: 'asc' }
        });

        // Fetch all learners for the grade associated with this subject
        const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
        if (!subject) return new NextResponse('Subject not found', { status: 404 });

        const learners = await prisma.learnerProfile.findMany({
            where: {
                class: {
                    grade: subject.grade,
                    schoolId: session.user.schoolId
                }
            },
            include: {
                user: { select: { firstName: true, lastName: true } }
            },
            orderBy: { user: { lastName: 'asc' } }
        });

        // Fetch all grades for these assessments
        const grades = await prisma.grade.findMany({
            where: {
                assessmentId: { in: assessments.map(a => a.id) }
            }
        });

        return NextResponse.json({
            assessments,
            learners,
            grades
        });
    } catch (error) {
        console.error('Error fetching subject gradebook data:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
