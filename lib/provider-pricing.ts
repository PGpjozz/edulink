export type BillingTier = 'SMALL' | 'MEDIUM' | 'LARGE';

export type PlanFeature =
    | 'admissions'
    | 'finance'
    | 'sms_alerts'
    | 'ai_assistant'
    | 'advanced_analytics'
    | 'api_access';

export const TIER_PLANS: Record<
    BillingTier,
    {
        label: string;
        description: string;
        defaultMonthlyFee: number;
        learnerLimit: number;
        overagePerLearner: number;
        features: PlanFeature[];
    }
> = {
    SMALL: {
        label: 'Small',
        description: 'Up to 200 learners',
        defaultMonthlyFee: 2500,
        learnerLimit: 200,
        overagePerLearner: 15,
        features: ['admissions'],
    },
    MEDIUM: {
        label: 'Medium',
        description: 'Up to 500 learners',
        defaultMonthlyFee: 5500,
        learnerLimit: 500,
        overagePerLearner: 12,
        features: ['admissions', 'finance', 'sms_alerts', 'advanced_analytics'],
    },
    LARGE: {
        label: 'Large',
        description: 'Unlimited learners',
        defaultMonthlyFee: 12000,
        learnerLimit: Infinity,
        overagePerLearner: 0,
        features: ['admissions', 'finance', 'sms_alerts', 'ai_assistant', 'advanced_analytics', 'api_access'],
    },
};

export function getTierDefaultFee(tier: BillingTier): number {
    return TIER_PLANS[tier].defaultMonthlyFee;
}

export function getEffectiveMonthlyFee(school: { tier: BillingTier; monthlyFee: number }): number {
    const custom = Number(school.monthlyFee);
    if (Number.isFinite(custom) && custom > 0) return custom;
    return getTierDefaultFee(school.tier);
}

export type BillCalculation = {
    baseAmount: number;
    extraLearners: number;
    extraAmount: number;
    totalAmount: number;
    learnerCount: number;
    learnerLimit: number;
};

export function calculateSchoolBill(
    school: { tier: BillingTier; monthlyFee: number },
    learnerCount: number,
): BillCalculation {
    const plan = TIER_PLANS[school.tier];
    const baseAmount = getEffectiveMonthlyFee(school);
    const limit = plan.learnerLimit;
    const extraLearners = limit === Infinity ? 0 : Math.max(0, learnerCount - limit);
    const extraAmount = extraLearners * plan.overagePerLearner;
    return {
        baseAmount,
        extraLearners,
        extraAmount,
        totalAmount: baseAmount + extraAmount,
        learnerCount,
        learnerLimit: limit === Infinity ? learnerCount : limit,
    };
}

export function tierHasFeature(tier: BillingTier, feature: PlanFeature): boolean {
    return TIER_PLANS[tier].features.includes(feature);
}

export const PLAN_FEATURE_LABELS: Record<PlanFeature, string> = {
    admissions: 'Online admissions',
    finance: 'Fee management & invoicing',
    sms_alerts: 'SMS absence alerts',
    ai_assistant: 'AI teaching assistant',
    advanced_analytics: 'Advanced analytics',
    api_access: 'API access',
};
