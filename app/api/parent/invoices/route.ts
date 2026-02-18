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

        if (!parentProfile) return NextResponse.json([]);

        const invoices = await prisma.feeInvoice.findMany({
            where: {
                schoolId: auth.schoolId as string,
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
