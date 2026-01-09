import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Fetch all classes for the school
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const classes = await prisma.class.findMany({
            where: { schoolId: session.user.schoolId },
            include: {
                teacher: {
                    include: { user: { select: { firstName: true, lastName: true } } }
                },
                _count: { select: { learners: true } }
            }
        });

        return NextResponse.json(classes);
    } catch (error) {
        console.error('Error fetching classes:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

// POST: Create a new class
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId || session.user.role !== 'PRINCIPAL') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, grade } = body;

        const newClass = await prisma.class.create({
            data: {
                name,
                grade,
                schoolId: session.user.schoolId
            }
        });

        return NextResponse.json(newClass);
    } catch (error) {
        console.error('Error creating class:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
