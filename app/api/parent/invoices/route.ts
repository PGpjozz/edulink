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

        if (!parentProfile) return NextResponse.json([]);

        const invoices = await prisma.feeInvoice.findMany({
            where: {
                learnerId: { in: parentProfile.learnerIds }
            },
            include: {
                learner: {
                    include: {
                        user: { select: { firstName: true, lastName: true } }
                    }
                },
                payments: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(invoices);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
