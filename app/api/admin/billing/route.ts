import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const TIER_PRICES = {
    SMALL: 500,
    MEDIUM: 1500,
    LARGE: 5000
};

const TIER_LIMITS = {
    SMALL: 100,
    MEDIUM: 500,
    LARGE: Infinity
};

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'PROVIDER') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const billingHistory = await prisma.billing.findMany({
            include: { school: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(billingHistory);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'PROVIDER') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { schoolId } = body;

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            include: { _count: { select: { users: { where: { role: 'LEARNER' } } } } }
        });

        if (!school) return new NextResponse('School not found', { status: 404 });

        const learnerCount = school._count.users;
        const basePrice = TIER_PRICES[school.tier];
        const limit = TIER_LIMITS[school.tier];
        const extraLearners = Math.max(0, learnerCount - limit);
        const extraAmount = extraLearners * 10;
        const totalAmount = basePrice + extraAmount;

        const billing = await prisma.billing.create({
            data: {
                schoolId,
                periodStart: new Date(), // Simulating monthly bill from now
                periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)),
                baseAmount: basePrice,
                extraLearners,
                extraAmount,
                totalAmount,
                status: 'ACTIVE'
            }
        });

        // Create Audit Log
        await prisma.auditLog.create({
            data: {
                schoolId,
                userId: session.user.id,
                action: 'GENERATE_BILL',
                entity: 'BILLING',
                entityId: billing.id,
                details: { totalAmount, learnerCount }
            }
        });

        return NextResponse.json(billing);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
