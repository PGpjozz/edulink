import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { belongsToSchool } from '@/lib/access-control';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    try {
        const classData = await prisma.class.findUnique({
            where: { id },
            select: { schoolId: true, timetable: true }
        });

        if (!classData || !belongsToSchool(classData.schoolId, session.user.schoolId)) {
            return new NextResponse('Not found', { status: 404 });
        }

        return NextResponse.json(classData?.timetable || {});
    } catch (error) {
        console.error('Error fetching timetable:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);

    // Only Principal or Admin
    if (!session || !session.user.schoolId || !['PRINCIPAL', 'SCHOOL_ADMIN'].includes(session.user.role)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;

    try {
        const body = await req.json(); // Expecting JSON object like { Monday: [...], Tuesday: [...] }

        const classData = await prisma.class.findUnique({
            where: { id },
            select: { schoolId: true }
        });

        if (!classData || !belongsToSchool(classData.schoolId, session.user.schoolId)) {
            return new NextResponse('Not found', { status: 404 });
        }

        const updated = await prisma.class.update({
            where: { id },
            data: {
                timetable: body
            }
        });

        return NextResponse.json(updated.timetable);
    } catch (error) {
        console.error('Error saving timetable:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
