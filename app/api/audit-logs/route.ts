import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Only Principal or School Admin can view logs
    if (!['PRINCIPAL', 'SCHOOL_ADMIN'].includes(session.user.role)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        const schoolFilter = {
            schoolId: session.user.schoolId,
            OR: [
                { userId: null },
                { user: { role: { not: 'PROVIDER' as any }, schoolId: session.user.schoolId } }
            ]
        };

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where: schoolFilter,
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            role: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset
            }),
            prisma.auditLog.count({
                where: schoolFilter
            })
        ]);

        return NextResponse.json({ logs, total });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
