import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: classId } = await params;

    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const klass = await prisma.class.findFirst({
            where: { id: classId, schoolId: auth.schoolId as string },
            select: { id: true }
        });

        if (!klass) {
            return new NextResponse('Class not found', { status: 404 });
        }

        if (!['PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER', 'LEARNER', 'PARENT'].includes(auth.role)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (auth.role === 'LEARNER') {
            const learnerProfile = await prisma.learnerProfile.findUnique({
                where: { userId: auth.userId },
                select: { classId: true }
            });

            if (!learnerProfile || learnerProfile.classId !== classId) {
                return new NextResponse('Forbidden', { status: 403 });
            }
        }

        if (auth.role === 'PARENT') {
            const parentProfile = await prisma.parentProfile.findUnique({
                where: { userId: auth.userId },
                select: { learnerIds: true }
            });

            if (!parentProfile?.learnerIds?.length) {
                return new NextResponse('Forbidden', { status: 403 });
            }

            const childInClass = await prisma.learnerProfile.findFirst({
                where: {
                    id: { in: parentProfile.learnerIds },
                    classId
                },
                select: { id: true }
            });

            if (!childInClass) {
                return new NextResponse('Forbidden', { status: 403 });
            }
        }

        const learners = await prisma.learnerProfile.findMany({
            where: { classId },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        idNumber: true
                    }
                }
            }
        });

        // Flatten for easier frontend usage
        const flattened = learners.map(l => ({
            id: l.id,
            firstName: l.user.firstName,
            lastName: l.user.lastName,
            email: l.user.email,
            idNumber: l.user.idNumber
        }));

        return NextResponse.json(flattened);
    } catch (error) {
        console.error('Error fetching class learners:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
