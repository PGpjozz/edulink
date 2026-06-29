import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        let users: any[] = [];

        if (['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'HOD'].includes(auth.role)) {
            // Staff can message Parents
            users = await prisma.user.findMany({
                where: {
                    schoolId: auth.schoolId as string,
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
        } else if (auth.role === 'PARENT') {
            // Parents can message Staff
            users = await prisma.user.findMany({
                where: {
                    schoolId: auth.schoolId as string,
                    role: { in: ['TEACHER', 'PRINCIPAL', 'HOD', 'SCHOOL_ADMIN'] },
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
