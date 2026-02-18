import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

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
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

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
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ schoolId?: string }>(req);
        if (body instanceof NextResponse) return body;
        const { schoolId } = body;

        if (!schoolId) {
            return new NextResponse('Missing schoolId', { status: 400 });
        }

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
        await writeAuditLog({
            schoolId,
            userId: auth.userId,
            action: 'GENERATE_BILL',
            entity: 'BILLING',
            entityId: billing.id,
            details: { totalAmount, learnerCount }
        });

        return NextResponse.json(billing);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
