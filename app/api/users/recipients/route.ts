import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        let users = [];

        if (session.user.role === 'TEACHER' || session.user.role === 'PRINCIPAL') {
            // Staff can message Parents
            users = await prisma.user.findMany({
                where: {
                    schoolId: session.user.schoolId,
                    role: 'PARENT',
                    isActive: true
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    email: true
                }
            });
        } else if (session.user.role === 'PARENT') {
            // Parents can message Staff
            users = await prisma.user.findMany({
                where: {
                    schoolId: session.user.schoolId,
                    role: { in: ['TEACHER', 'PRINCIPAL'] },
                    isActive: true
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    email: true
                }
            });
        }

        return NextResponse.json(users);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
