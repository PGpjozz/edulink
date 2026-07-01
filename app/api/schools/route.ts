import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { getEffectiveMonthlyFee, type BillingTier } from '@/lib/provider-pricing';

export async function GET() {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const schools = await prisma.school.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                owner: { select: { id: true, email: true, firstName: true, lastName: true } },
                billings: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { id: true, status: true, totalAmount: true, createdAt: true },
                },
                _count: {
                    select: {
                        users: true,
                        classes: true,
                    },
                },
            },
        });

        const learnerCounts = await prisma.user.groupBy({
            by: ['schoolId'],
            where: { role: 'LEARNER', isActive: true, schoolId: { not: null } },
            _count: true,
        });
        const learnerMap = new Map(learnerCounts.map((r) => [r.schoolId!, r._count]));

        const enriched = schools.map((school) => ({
            ...school,
            learnerCount: learnerMap.get(school.id) ?? 0,
            latestBilling: school.billings[0] ?? null,
            effectiveMonthlyFee: getEffectiveMonthlyFee({
                tier: school.tier as BillingTier,
                monthlyFee: school.monthlyFee,
            }),
        }));

        return NextResponse.json(enriched);
    } catch (error) {
        console.error('Error fetching schools:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function POST() {
    return NextResponse.json(
        {
            error: 'Quick school creation is disabled. Use the full onboard flow at /dashboard/provider/onboard.',
        },
        { status: 410 },
    );
}
