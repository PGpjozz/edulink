import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/api-auth';
import {
    getPayFastPassphrase,
    parsePayFastRawBody,
    validateItnWithPayFast,
    verifyPayFastSignature,
} from '@/lib/payfast';

function checkoutLockKey(type: string, targetId: string): string {
    return `payfast-checkout:${type}:${targetId}`;
}

async function fulfillCheckout(checkoutId: string, pfPaymentId: string) {
    const checkout = await prisma.payFastCheckout.findUnique({ where: { id: checkoutId } });
    if (!checkout || checkout.status === 'COMPLETED') return;

    const fulfilled = await prisma.$transaction(async (tx) => {
        const targetId = checkout.type === 'SCHOOL_SUBSCRIPTION' ? checkout.billingId : checkout.invoiceId;
        if (targetId) {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${checkoutLockKey(checkout.type, targetId)}))`;
        }

        // Conditional update makes fulfillment idempotent: if a concurrent ITN
        // already completed this checkout, skip payment creation entirely.
        const claimed = await tx.payFastCheckout.updateMany({
            where: { id: checkoutId, status: { not: 'COMPLETED' } },
            data: { status: 'COMPLETED', pfPaymentId },
        });
        if (claimed.count === 0) return false;

        if (checkout.type === 'SCHOOL_SUBSCRIPTION' && checkout.billingId) {
            const billing = await tx.billing.findUnique({ where: { id: checkout.billingId } });
            if (!billing) return false;

            const billingClaimed = await tx.billing.updateMany({
                where: { id: checkout.billingId, status: 'PAST_DUE' },
                data: { status: 'ACTIVE' },
            });
            if (billingClaimed.count === 0) return false;

            await tx.school.update({
                where: { id: checkout.schoolId },
                data: {
                    isActive: true,
                    subscriptionStatus: 'ACTIVE',
                    currentPeriodEnd: billing.periodEnd,
                },
            });
        }

        if (checkout.type === 'PARENT_FEE' && checkout.invoiceId) {
            const invoiceClaimed = await tx.feeInvoice.updateMany({
                where: { id: checkout.invoiceId, status: { in: ['PENDING', 'OVERDUE'] } },
                data: { status: 'PAID' },
            });
            if (invoiceClaimed.count === 0) return false;

            await tx.payment.create({
                data: {
                    invoiceId: checkout.invoiceId,
                    amount: checkout.amount,
                    method: 'PAYFAST',
                    reference: pfPaymentId,
                    status: 'COMPLETED',
                },
            });
        }

        return true;
    });

    if (!fulfilled) return;

    await writeAuditLog({
        schoolId: checkout.schoolId,
        userId: checkout.userId,
        action: 'PAYFAST_PAYMENT',
        entity: 'PAYFAST_CHECKOUT',
        entityId: checkout.id,
        details: { type: checkout.type, amount: checkout.amount, pfPaymentId },
    });
}

export async function POST(req: Request) {
    const rawBody = await req.text();
    const { data, paramString: pfParamString } = parsePayFastRawBody(rawBody);

    const signature = data.signature;
    const mPaymentId = data.m_payment_id;
    const paymentStatus = data.payment_status;
    const pfPaymentId = data.pf_payment_id;

    if (!signature || !mPaymentId) {
        return new NextResponse('Bad Request', { status: 400 });
    }

    if (!verifyPayFastSignature(pfParamString, signature, getPayFastPassphrase())) {
        console.error('PayFast ITN signature mismatch');
        return new NextResponse('Invalid signature', { status: 400 });
    }

    const valid = await validateItnWithPayFast(pfParamString);
    if (!valid) {
        return new NextResponse('Validation failed', { status: 400 });
    }

    const checkout = await prisma.payFastCheckout.findUnique({ where: { mPaymentId } });
    if (!checkout) {
        return new NextResponse('Unknown payment', { status: 404 });
    }

    const gross = Number(data.amount_gross);
    if (Number.isFinite(gross) && Math.abs(gross - checkout.amount) > 0.01) {
        console.error('PayFast amount mismatch', gross, checkout.amount);
        return new NextResponse('Amount mismatch', { status: 400 });
    }

    if (paymentStatus === 'COMPLETE') {
        await fulfillCheckout(checkout.id, pfPaymentId ?? '');
    } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
        await prisma.payFastCheckout.update({
            where: { id: checkout.id },
            data: { status: 'FAILED' },
        });
    }

    return new NextResponse('OK', { status: 200 });
}
