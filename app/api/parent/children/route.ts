import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'PARENT') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const parentProfile = await prisma.parentProfile.findUnique({
            where: { userId: session.user.id }
        });

        if (!parentProfile || !parentProfile.learnerIds.length) {
            return NextResponse.json([]);
        }

        const children = await prisma.learnerProfile.findMany({
            where: {
                id: { in: parentProfile.learnerIds }
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                },
                class: {
                    select: {
                        name: true,
                        grade: true
                    }
                }
            }
        });

        const formatted = children.map(c => ({
            id: c.userId, // We use userId for navigation to reports/dashboards
            profileId: c.id,
            name: `${c.user.firstName} ${c.user.lastName}`,
            grade: c.class?.grade || 'N/A',
            className: c.class?.name || 'N/A'
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
