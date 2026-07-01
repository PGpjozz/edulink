import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { prismaErrorResponse } from '@/lib/prisma-errors';
import { getEffectiveMonthlyFee, TIER_PLANS, type BillingTier } from '@/lib/provider-pricing';

export async function GET() {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalSchools,
            activeSchools,
            suspendedSchools,
            totalLearners,
            totalStaff,
            overdueBills,
            paidBillsThisMonth,
            billsIssuedThisMonth,
            schoolsWithoutOwner,
            recentSchools,
        ] = await Promise.all([
            prisma.school.count(),
            prisma.school.count({ where: { isActive: true } }),
            prisma.school.count({ where: { isActive: false } }),
            prisma.user.count({ where: { role: 'LEARNER', isActive: true } }),
            prisma.user.count({
                where: {
                    role: { in: ['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'HOD', 'SCHOOL_OWNER'] },
                    isActive: true,
                },
            }),
            prisma.billing.findMany({
                where: { status: 'PAST_DUE' },
                include: { school: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
            prisma.billing.aggregate({
                where: { status: 'ACTIVE', updatedAt: { gte: monthStart } },
                _sum: { totalAmount: true },
                _count: true,
            }),
            prisma.billing.count({ where: { createdAt: { gte: monthStart } } }),
            prisma.school.count({ where: { ownerId: null, isActive: true } }),
            prisma.school.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true, name: true, tier: true, isActive: true, createdAt: true },
            }),
        ]);

        const mrr = await prisma.school.findMany({
            where: { isActive: true },
            select: { tier: true, monthlyFee: true },
        });
        const estimatedMrr = mrr.reduce(
            (sum, s) => sum + getEffectiveMonthlyFee({ tier: s.tier as BillingTier, monthlyFee: s.monthlyFee }),
            0,
        );

        const overdueRevenue = overdueBills.reduce((sum, b) => sum + b.totalAmount, 0);

        return NextResponse.json({
            kpis: {
                totalSchools,
                activeSchools,
                suspendedSchools,
                totalLearners,
                totalStaff,
                estimatedMrr,
                overdueRevenue,
                overdueCount: overdueBills.length,
                paidRevenueThisMonth: paidBillsThisMonth._sum.totalAmount ?? 0,
                paidBillsThisMonth: paidBillsThisMonth._count,
                billsIssuedThisMonth,
                schoolsWithoutOwner,
            },
            overdueBills: overdueBills.map((b) => ({
                id: b.id,
                schoolId: b.schoolId,
                schoolName: b.school.name,
                totalAmount: b.totalAmount,
                createdAt: b.createdAt,
                daysOverdue: Math.floor((now.getTime() - b.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
            })),
            recentSchools,
            tierPlans: TIER_PLANS,
        });
    } catch (error) {
        return prismaErrorResponse(error, 'provider overview');
    }
}
