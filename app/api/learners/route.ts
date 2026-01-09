import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const learners = await prisma.learnerProfile.findMany({
            where: {
                class: {
                    schoolId: session.user.schoolId
                }
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true }
                }
            },
            orderBy: { user: { lastName: 'asc' } }
        });

        return NextResponse.json(learners);
    } catch (error) {
        console.error('Error fetching learners:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
