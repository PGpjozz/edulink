import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

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
