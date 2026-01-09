import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'PRINCIPAL' && session.user.role !== 'PROVIDER')) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const invoices = await prisma.feeInvoice.findMany({
            where: {
                schoolId: session.user.schoolId || ''
            },
            include: {
                learner: {
                    include: {
                        user: { select: { firstName: true, lastName: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(invoices);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
