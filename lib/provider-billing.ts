import { prisma } from '@/lib/prisma';
import { calculateSchoolBill, type BillingTier } from '@/lib/provider-pricing';
import { writeAuditLog } from '@/lib/api-auth';
import { calendarBillingPeriod } from '@/lib/subscription';
import { sendEmail, subscriptionInvoiceEmailHtml } from '@/lib/email';
import { BRAND } from '@/lib/branding';

export async function getLearnerCount(schoolId: string): Promise<number> {
    return prisma.user.count({
        where: { schoolId, role: 'LEARNER', isActive: true },
    });
}

export async function markSchoolPastDue(schoolId: string, periodEnd: Date) {
    await prisma.school.update({
        where: { id: schoolId },
        data: {
            subscriptionStatus: 'PAST_DUE',
            currentPeriodEnd: periodEnd,
        },
    });
}

export async function markSchoolPaid(schoolId: string, periodEnd: Date) {
    await prisma.school.update({
        where: { id: schoolId },
        data: {
            subscriptionStatus: 'ACTIVE',
            isActive: true,
            currentPeriodEnd: periodEnd,
        },
    });
}

export async function suspendSchoolForOverdue(schoolId: string) {
    await prisma.school.update({
        where: { id: schoolId },
        data: {
            subscriptionStatus: 'SUSPENDED',
            isActive: false,
        },
    });
}

export async function createBillForSchool(
    schoolId: string,
    providerUserId: string,
    options?: { skipIfBilledThisMonth?: boolean; sendInvoiceEmail?: boolean },
) {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: {
            id: true,
            name: true,
            tier: true,
            monthlyFee: true,
            isActive: true,
            contactEmail: true,
            subscriptionStatus: true,
            owner: { select: { email: true, firstName: true } },
        },
    });

    if (!school) {
        return { ok: false as const, error: 'School not found' };
    }

    const { periodStart, periodEnd } = calendarBillingPeriod();

    if (options?.skipIfBilledThisMonth !== false) {
        const existing = await prisma.billing.findFirst({
            where: {
                schoolId,
                periodStart: { gte: periodStart },
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

    const billing = await prisma.billing.create({
        data: {
            schoolId,
            periodStart,
            periodEnd,
            baseAmount: bill.baseAmount,
            extraLearners: bill.extraLearners,
            extraAmount: bill.extraAmount,
            totalAmount: bill.totalAmount,
            status: 'PAST_DUE',
        },
    });

    if (school.subscriptionStatus !== 'TRIALING') {
        await markSchoolPastDue(schoolId, periodEnd);
    }

    await writeAuditLog({
        schoolId,
        userId: providerUserId,
        action: 'GENERATE_BILL',
        entity: 'BILLING',
        entityId: billing.id,
        details: {
            totalAmount: bill.totalAmount,
            learnerCount,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
        },
    });

    if (options?.sendInvoiceEmail !== false) {
        const to = school.owner?.email ?? school.contactEmail;
        if (to) {
            const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
            await sendEmail({
                to,
                subject: `${BRAND.name} invoice — ${school.name}`,
                html: subscriptionInvoiceEmailHtml({
                    schoolName: school.name,
                    contactName: school.owner?.firstName ?? 'there',
                    periodStart,
                    periodEnd,
                    baseAmount: bill.baseAmount,
                    extraLearners: bill.extraLearners,
                    extraAmount: bill.extraAmount,
                    totalAmount: bill.totalAmount,
                    payUrl: `${baseUrl}/dashboard/principal/subscription`,
                    invoiceUrl: `${baseUrl}/api/billing/${billing.id}/invoice`,
                }),
            });
        }
    }

    return { ok: true as const, billing, school, bill };
}

export async function generateBillsForAllSchools(providerUserId: string) {
    const schools = await prisma.school.findMany({
        where: {
            isActive: true,
            subscriptionStatus: { in: ['ACTIVE', 'PAST_DUE', 'TRIALING'] },
        },
        select: { id: true, name: true, trialEndsAt: true, subscriptionStatus: true },
    });

    const results: {
        schoolId: string;
        schoolName: string;
        status: 'created' | 'skipped' | 'error';
        error?: string;
    }[] = [];

    const now = new Date();

    for (const school of schools) {
        if (
            school.subscriptionStatus === 'TRIALING' &&
            school.trialEndsAt &&
            school.trialEndsAt > now
        ) {
            results.push({ schoolId: school.id, schoolName: school.name, status: 'skipped' });
            continue;
        }

        const result = await createBillForSchool(school.id, providerUserId, {
            skipIfBilledThisMonth: true,
        });
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

/** Suspend schools with invoices overdue 30+ days. */
export async function processOverdueSuspensions(providerUserId: string) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const overdue = await prisma.billing.findMany({
        where: { status: 'PAST_DUE', createdAt: { lte: cutoff } },
        include: { school: { select: { id: true, name: true, isActive: true } } },
    });

    const suspended: string[] = [];

    for (const bill of overdue) {
        if (!bill.school.isActive) continue;
        await suspendSchoolForOverdue(bill.schoolId);
        await writeAuditLog({
            schoolId: bill.schoolId,
            userId: providerUserId,
            action: 'SUSPEND_SCHOOL_OVERDUE',
            entity: 'SCHOOL',
            entityId: bill.schoolId,
            details: { billingId: bill.id, schoolName: bill.school.name },
        });
        suspended.push(bill.school.name);
    }

    return suspended;
}

export function computeTenantHealth(input: {
    isActive: boolean;
    learnerCount: number;
    staffCount: number;
    hasOwner: boolean;
    latestBillStatus: string | null;
    subscriptionStatus: string | null;
    daysSinceLastBill: number | null;
    subdomain: string | null;
}): { score: number; label: 'Healthy' | 'Attention' | 'At risk'; reasons: string[] } {
    let score = 100;
    const reasons: string[] = [];

    if (!input.isActive || input.subscriptionStatus === 'SUSPENDED') {
        score -= 40;
        reasons.push('School is suspended');
    }
    if (input.subscriptionStatus === 'PAST_DUE') {
        score -= 20;
        reasons.push('Subscription payment overdue');
    }
    if (input.subscriptionStatus === 'TRIALING') {
        reasons.push('On free trial');
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
        score -= 15;
        reasons.push('Unpaid invoice');
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
