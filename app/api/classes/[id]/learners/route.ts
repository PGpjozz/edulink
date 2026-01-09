import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    const { id: classId } = await params;

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const learners = await prisma.learnerProfile.findMany({
            where: { classId },
            include: {
                user: {
                    select: {
                        name: true,
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
