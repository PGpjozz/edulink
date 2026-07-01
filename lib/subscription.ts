/** Subscription lifecycle helpers for SaaS billing. */

export const TRIAL_DAYS = 14;
export const DEFAULT_TUITION_FEE = 1500;
/** Legacy schema default before pricing unification — treat as "use tier default" for SaaS. */
export const LEGACY_UNSET_SAAS_FEE = 1000;

export function isUnsetSaasFee(fee: number | null | undefined): boolean {
    const n = Number(fee);
    return !Number.isFinite(n) || n <= 0 || n === LEGACY_UNSET_SAAS_FEE;
}

export function getTuitionFee(school: { tuitionFee?: number | null }): number {
    const fee = Number(school.tuitionFee);
    if (Number.isFinite(fee) && fee > 0) return fee;
    return DEFAULT_TUITION_FEE;
}

export function trialEndDate(from: Date = new Date()): Date {
    const end = new Date(from);
    end.setDate(end.getDate() + TRIAL_DAYS);
    return end;
}

export function calendarBillingPeriod(reference: Date = new Date()) {
    const periodStart = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const periodEnd = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
    return { periodStart, periodEnd };
}

export function formatBillingPeriod(start: Date, end: Date): string {
    const fmt = (d: Date) =>
        d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
}

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
    TRIALING: 'Free trial',
    ACTIVE: 'Active',
    PAST_DUE: 'Payment due',
    SUSPENDED: 'Suspended',
    CANCELLED: 'Cancelled',
};

export function billingStatusLabel(status: string): string {
    if (status === 'ACTIVE') return 'Paid';
    if (status === 'PAST_DUE') return 'Due';
    if (status === 'CANCELLED') return 'Cancelled';
    return status;
}
