import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await requireAuth({ roles: ['PARENT'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const parentProfile = await prisma.parentProfile.findUnique({
            where: { userId: auth.userId }
        });

        if (!parentProfile || !parentProfile.learnerIds.length) {
            return NextResponse.json([]);
        }

        const children = await prisma.learnerProfile.findMany({
            where: {
                id: { in: parentProfile.learnerIds },
                user: { schoolId: auth.schoolId as string }
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
