import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'PRINCIPAL' && session.user.role !== 'SCHOOL_ADMIN')) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const school = await prisma.school.findUnique({
            where: { id: session.user.schoolId || '' },
            include: {
                billings: {
                    orderBy: { createdAt: 'desc' }
                },
                _count: {
                    select: {
                        users: { where: { role: 'LEARNER' } }
                    }
                }
            }
        });

        if (!school) return new NextResponse('School not found', { status: 404 });

        return NextResponse.json(school);
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'PRINCIPAL' && session.user.role !== 'SCHOOL_ADMIN')) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { billingId } = await req.json();

        const billing = await prisma.billing.findUnique({
            where: { id: billingId }
        });

        if (!billing || billing.schoolId !== session.user.schoolId) {
            return new NextResponse('Billing record not found', { status: 404 });
        }

        const updatedBilling = await prisma.billing.update({
            where: { id: billingId },
            data: { status: 'ACTIVE' } // In a real app, this would be 'PAID' or similar
        });

        // Create Audit Log
        await prisma.auditLog.create({
            data: {
                schoolId: session.user.schoolId,
                userId: session.user.id,
                action: 'PAY_SUBSCRIPTION',
                entity: 'BILLING',
                entityId: billingId,
                details: { amount: billing.totalAmount }
            }
        });

        return NextResponse.json(updatedBilling);
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
