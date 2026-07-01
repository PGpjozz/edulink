import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isPaymentSimulationAllowed } from '@/lib/env';
import {
    getEffectiveMonthlyFee,
    TIER_PLANS,
    PLAN_FEATURE_LABELS,
    type BillingTier,
} from '@/lib/provider-pricing';
import { getLearnerCount, markSchoolPaid } from '@/lib/provider-billing';
import { estimateNextInvoice } from '@/lib/school-subscription';
import {
    SUBSCRIPTION_STATUS_LABELS,
    billingStatusLabel,
    formatBillingPeriod,
} from '@/lib/subscription';

const SUBSCRIPTION_ROLES = ['SCHOOL_OWNER', 'PRINCIPAL', 'SCHOOL_ADMIN'];

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.schoolId || !SUBSCRIPTION_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const school = await prisma.school.findUnique({
            where: { id: session.user.schoolId },
            include: {
                billings: { orderBy: { createdAt: 'desc' }, take: 24 },
            },
        });

        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        const learnerCount = await getLearnerCount(school.id);
        const tier = school.tier as BillingTier;
        const plan = TIER_PLANS[tier];
        const effectiveMonthlyFee = getEffectiveMonthlyFee({
            tier,
            monthlyFee: school.monthlyFee,
        });
        const estimate = estimateNextInvoice({ tier, monthlyFee: school.monthlyFee }, learnerCount);
        const openBill = school.billings.find((b) => b.status === 'PAST_DUE') ?? null;
        const latestPaid = school.billings.find((b) => b.status === 'ACTIVE') ?? null;

        const trialDaysLeft =
            school.subscriptionStatus === 'TRIALING' && school.trialEndsAt
                ? Math.max(
                      0,
                      Math.ceil(
                          (school.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                      ),
                  )
                : null;

        return NextResponse.json({
            school: {
                id: school.id,
                name: school.name,
                tier: school.tier,
                isActive: school.isActive,
                subscriptionStatus: school.subscriptionStatus,
                trialEndsAt: school.trialEndsAt,
                currentPeriodEnd: school.currentPeriodEnd,
                tuitionFee: school.tuitionFee,
            },
            pricing: {
                effectiveMonthlyFee,
                tierDefaultFee: plan.defaultMonthlyFee,
                learnerLimit: plan.learnerLimit === Infinity ? null : plan.learnerLimit,
                overagePerLearner: plan.overagePerLearner,
                planLabel: plan.label,
                planDescription: plan.description,
                features: plan.features.map((f) => ({
                    key: f,
                    label: PLAN_FEATURE_LABELS[f],
                })),
            },
            usage: {
                learnerCount,
                usagePercent:
                    plan.learnerLimit === Infinity
                        ? 0
                        : Math.min(100, (learnerCount / plan.learnerLimit) * 100),
                atLimit: plan.learnerLimit !== Infinity && learnerCount >= plan.learnerLimit,
            },
            estimate: {
                baseAmount: estimate.baseAmount,
                extraLearners: estimate.extraLearners,
                extraAmount: estimate.extraAmount,
                totalAmount: estimate.totalAmount,
            },
            openBill,
            latestPaid,
            trialDaysLeft,
            statusLabel: SUBSCRIPTION_STATUS_LABELS[school.subscriptionStatus] ?? school.subscriptionStatus,
            billings: school.billings.map((b) => ({
                ...b,
                statusLabel: billingStatusLabel(b.status),
                periodLabel: formatBillingPeriod(b.periodStart, b.periodEnd),
                invoiceUrl: `/api/billing/${b.id}/invoice`,
            })),
            upgradeTiers: (Object.keys(TIER_PLANS) as BillingTier[])
                .filter((t) => t !== tier)
                .map((t) => ({
                    tier: t,
                    label: TIER_PLANS[t].label,
                    defaultMonthlyFee: TIER_PLANS[t].defaultMonthlyFee,
                    learnerLimit: TIER_PLANS[t].learnerLimit === Infinity ? null : TIER_PLANS[t].learnerLimit,
                    features: TIER_PLANS[t].features.map((f) => PLAN_FEATURE_LABELS[f]),
                })),
        });
    } catch (error) {
        console.error('subscription GET', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.schoolId || !SUBSCRIPTION_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPaymentSimulationAllowed()) {
        return NextResponse.json(
            { error: 'Manual payment marking is disabled. Configure PayFast for production billing.' },
            { status: 403 },
        );
    }

    try {
        const { billingId } = await req.json();

        const billing = await prisma.billing.findUnique({ where: { id: billingId } });

        if (!billing || billing.schoolId !== session.user.schoolId) {
            return NextResponse.json({ error: 'Billing record not found' }, { status: 404 });
        }

        const updatedBilling = await prisma.billing.update({
            where: { id: billingId },
            data: { status: 'ACTIVE' },
        });

        await markSchoolPaid(session.user.schoolId, billing.periodEnd);

        await prisma.auditLog.create({
            data: {
                schoolId: session.user.schoolId,
                userId: session.user.id,
                action: 'PAY_SUBSCRIPTION',
                entity: 'BILLING',
                entityId: billingId,
                details: { amount: billing.totalAmount, simulated: true },
            },
        });

        return NextResponse.json(updatedBilling);
    } catch (error) {
        console.error('subscription PATCH', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
