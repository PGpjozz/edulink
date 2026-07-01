import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { isMessagingRole } from '@/lib/messaging';

export async function GET() {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (!isMessagingRole(auth.role)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        let users: { id: string; firstName: string; lastName: string; role: string; email: string | null }[] = [];

        if (['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'HOD'].includes(auth.role)) {
            users = await prisma.user.findMany({
                where: {
                    schoolId: auth.schoolId as string,
                    role: { in: ['PARENT', 'LEARNER'] },
                    isActive: true,
                },
                select: { id: true, firstName: true, lastName: true, role: true, email: true },
                orderBy: { lastName: 'asc' },
            });
        } else if (auth.role === 'PARENT') {
            users = await prisma.user.findMany({
                where: {
                    schoolId: auth.schoolId as string,
                    role: { in: ['TEACHER', 'PRINCIPAL', 'HOD', 'SCHOOL_ADMIN'] },
                    isActive: true,
                },
                select: { id: true, firstName: true, lastName: true, role: true, email: true },
                orderBy: { lastName: 'asc' },
            });
        } else if (auth.role === 'LEARNER') {
            users = await prisma.user.findMany({
                where: {
                    schoolId: auth.schoolId as string,
                    role: { in: ['TEACHER', 'HOD', 'PRINCIPAL', 'SCHOOL_ADMIN'] },
                    isActive: true,
                },
                select: { id: true, firstName: true, lastName: true, role: true, email: true },
                orderBy: { lastName: 'asc' },
            });
        }

        return NextResponse.json(users);
    } catch {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
