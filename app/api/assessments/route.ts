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
    const subjectId = searchParams.get('subjectId');

    if (!subjectId) {
        return new NextResponse('Subject ID required', { status: 400 });
    }

    try {
        const assessments = await prisma.assessment.findMany({
            where: {
                subjectId,
                subject: { schoolId: session.user.schoolId } // Security check
            },
            orderBy: { date: 'asc' },
            include: {
                _count: { select: { grades: true } }
            }
        });

        return NextResponse.json(assessments);
    } catch (error) {
        console.error('Error fetching assessments:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Teachers can create assessments
    if (session.user.role !== 'TEACHER' && session.user.role !== 'SCHOOL_ADMIN' && session.user.role !== 'PRINCIPAL') {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        const body = await req.json();
        const { subjectId, title, type, totalMarks, weight, date } = body;

        const assessment = await prisma.assessment.create({
            data: {
                subjectId,
                title,
                type, // TEST, EXAM, ASSIGNMENT
                totalMarks: parseInt(totalMarks),
                weight: parseInt(weight),
                date: new Date(date)
            }
        });

        return NextResponse.json(assessment);
    } catch (error) {
        console.error('Error creating assessment:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
