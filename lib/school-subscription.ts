import { prisma } from '@/lib/prisma';
import {
    TIER_PLANS,
    calculateSchoolBill,
    tierHasFeature,
    type BillingTier,
    type PlanFeature,
} from '@/lib/provider-pricing';
import { getLearnerCount } from '@/lib/provider-billing';

export type LearnerCapacityResult = {
    allowed: boolean;
    learnerCount: number;
    learnerLimit: number;
    atLimit: boolean;
    overLimit: boolean;
    tier: BillingTier;
    message?: string;
};

/** Check whether a school can add another active learner. */
export async function checkLearnerCapacity(schoolId: string): Promise<LearnerCapacityResult> {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { tier: true },
    });
    if (!school) {
        return {
            allowed: false,
            learnerCount: 0,
            learnerLimit: 0,
            atLimit: true,
            overLimit: true,
            tier: 'SMALL',
            message: 'School not found',
        };
    }

    const tier = school.tier as BillingTier;
    const plan = TIER_PLANS[tier];
    const learnerCount = await getLearnerCount(schoolId);
    const limit = plan.learnerLimit;

    if (limit === Infinity) {
        return {
            allowed: true,
            learnerCount,
            learnerLimit: limit,
            atLimit: false,
            overLimit: false,
            tier,
        };
    }

    const atLimit = learnerCount >= limit;
    const overLimit = learnerCount > limit;

    return {
        allowed: !atLimit,
        learnerCount,
        learnerLimit: limit,
        atLimit,
        overLimit,
        tier,
        message: atLimit
            ? `Learner limit reached (${limit} on ${plan.label} plan). Upgrade your subscription or contact BrightCampus support.`
            : undefined,
    };
}

export async function schoolHasFeature(schoolId: string, feature: PlanFeature): Promise<boolean> {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { tier: true },
    });
    if (!school) return false;
    return tierHasFeature(school.tier as BillingTier, feature);
}

export async function requireSchoolFeature(
    schoolId: string,
    feature: PlanFeature,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const has = await schoolHasFeature(schoolId, feature);
    if (!has) {
        return {
            ok: false,
            message: `This feature requires a higher BrightCampus plan. Upgrade from your subscription page.`,
        };
    }
    return { ok: true };
}

export function estimateNextInvoice(
    school: { tier: BillingTier; monthlyFee: number },
    learnerCount: number,
) {
    return calculateSchoolBill(school, learnerCount);
}
