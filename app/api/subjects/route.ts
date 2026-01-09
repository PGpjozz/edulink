import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // If teacher, fetch assigned subjects (mocking logic: fetch all for now or check TeacherProfile)
    // For simplicity MVP: fetch all subjects for the school
    try {
        const subjects = await prisma.subject.findMany({
            where: { schoolId: session.user.schoolId },
            include: {
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } }
            }
        });

        return NextResponse.json(subjects);
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    if (session.user.role !== 'PRINCIPAL' && session.user.role !== 'SCHOOL_ADMIN') {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, code, grade, teacherId } = body;

        const subject = await prisma.subject.create({
            data: {
                name,
                code,
                grade,
                schoolId: session.user.schoolId,
                teacherId: teacherId || undefined
            }
        });

        return NextResponse.json(subject);
    } catch (error) {
        console.error('Error creating subject:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
