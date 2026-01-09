import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'PROVIDER') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const logs = await prisma.auditLog.findMany({
            include: {
                user: { select: { firstName: true, lastName: true, role: true } },
                school: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit to latest 100 for performance
        });
        return NextResponse.json(logs);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
