'use client';

type PayFastCheckoutResponse = {
    action: string;
    fields: Record<string, string>;
    mPaymentId: string;
};

type SimulateHandler = () => Promise<void>;

export async function startPayFastCheckout(
    payload: { type: 'SCHOOL_SUBSCRIPTION' | 'PARENT_FEE'; billingId?: string; invoiceId?: string },
    onRedirect: (data: PayFastCheckoutResponse) => void,
    onSimulate?: SimulateHandler
): Promise<{ ok: boolean; error?: string; simulated?: boolean }> {
    const res = await fetch('/api/payfast/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (res.status === 503 && data.useSimulate && onSimulate && process.env.NODE_ENV !== 'production') {
        await onSimulate();
        return { ok: true, simulated: true };
    }

    if (!res.ok) {
        return { ok: false, error: data.error || 'Checkout failed' };
    }

    onRedirect(data as PayFastCheckoutResponse);
    return { ok: true };
}
