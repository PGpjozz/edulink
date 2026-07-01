import { prisma } from '@/lib/prisma';
import { calculateSchoolBill, type BillingTier } from '@/lib/provider-pricing';
import { writeAuditLog } from '@/lib/api-auth';

export async function getLearnerCount(schoolId: string): Promise<number> {
    return prisma.user.count({
        where: { schoolId, role: 'LEARNER', isActive: true },
    });
}

export async function createBillForSchool(
    schoolId: string,
    providerUserId: string,
    options?: { skipIfBilledThisMonth?: boolean },
) {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, name: true, tier: true, monthlyFee: true, isActive: true },
    });

    if (!school) {
        return { ok: false as const, error: 'School not found' };
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    if (options?.skipIfBilledThisMonth) {
        const existing = await prisma.billing.findFirst({
            where: {
                schoolId,
                periodStart: { gte: monthStart },
            },
        });
        if (existing) {
            return { ok: false as const, error: 'Bill already issued this month', skipped: true };
        }
    }

    const learnerCount = await getLearnerCount(schoolId);
    const bill = calculateSchoolBill(
        { tier: school.tier as BillingTier, monthlyFee: school.monthlyFee },
        learnerCount,
    );

    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const billing = await prisma.billing.create({
        data: {
            schoolId,
            periodStart: now,
            periodEnd,
            baseAmount: bill.baseAmount,
            extraLearners: bill.extraLearners,
            extraAmount: bill.extraAmount,
            totalAmount: bill.totalAmount,
            status: 'PAST_DUE',
        },
    });

    await writeAuditLog({
        schoolId,
        userId: providerUserId,
        action: 'GENERATE_BILL',
        entity: 'BILLING',
        entityId: billing.id,
        details: { totalAmount: bill.totalAmount, learnerCount, automated: Boolean(options?.skipIfBilledThisMonth) },
    });

    return { ok: true as const, billing, school, bill };
}

export async function generateBillsForAllSchools(providerUserId: string) {
    const schools = await prisma.school.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
    });

    const results: { schoolId: string; schoolName: string; status: 'created' | 'skipped' | 'error'; error?: string }[] = [];

    for (const school of schools) {
        const result = await createBillForSchool(school.id, providerUserId, { skipIfBilledThisMonth: true });
        if (result.ok) {
            results.push({ schoolId: school.id, schoolName: school.name, status: 'created' });
        } else if (result.skipped) {
            results.push({ schoolId: school.id, schoolName: school.name, status: 'skipped' });
        } else {
            results.push({ schoolId: school.id, schoolName: school.name, status: 'error', error: result.error });
        }
    }

    return results;
}

export function computeTenantHealth(input: {
    isActive: boolean;
    learnerCount: number;
    staffCount: number;
    hasOwner: boolean;
    latestBillStatus: string | null;
    daysSinceLastBill: number | null;
    subdomain: string | null;
}): { score: number; label: 'Healthy' | 'Attention' | 'At risk'; reasons: string[] } {
    let score = 100;
    const reasons: string[] = [];

    if (!input.isActive) {
        score -= 40;
        reasons.push('School is suspended');
    }
    if (!input.hasOwner) {
        score -= 15;
        reasons.push('No school owner assigned');
    }
    if (input.learnerCount === 0) {
        score -= 10;
        reasons.push('No active learners');
    }
    if (input.latestBillStatus === 'PAST_DUE') {
        score -= 25;
        reasons.push('Subscription payment overdue');
    }
    if (!input.subdomain) {
        score -= 5;
        reasons.push('Subdomain not configured');
    }
    if (input.daysSinceLastBill !== null && input.daysSinceLastBill > 45) {
        score -= 10;
        reasons.push('No recent billing activity');
    }

    score = Math.max(0, Math.min(100, score));
    const label = score >= 75 ? 'Healthy' : score >= 50 ? 'Attention' : 'At risk';
    return { score, label, reasons };
}
