import { BRAND } from '@/lib/branding';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson } from '@/lib/api-auth';
import {
    formatPayFastAmount,
    generatePayFastSignature,
    getPayFastPassphrase,
    isPayFastConfigured,
    PAYFAST_PROCESS_URL,
} from '@/lib/payfast';
import { canManageSchool } from '@/lib/permissions';
import { isPaymentSimulationAllowed } from '@/lib/env';

type CheckoutBody = {
    type?: 'SCHOOL_SUBSCRIPTION' | 'PARENT_FEE';
    billingId?: string;
    invoiceId?: string;
};

function checkoutLockKey(type: CheckoutBody['type'], targetId: string): string {
    return `payfast-checkout:${type}:${targetId}`;
}

export async function POST(req: Request) {
    if (!isPayFastConfigured()) {
        return NextResponse.json(
            {
                error: 'PayFast is not configured',
                ...(isPaymentSimulationAllowed() ? { useSimulate: true } : {}),
            },
            { status: 503 }
        );
    }

    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<CheckoutBody>(req);
    if (body instanceof NextResponse) return body;

    const type = body.type;
    if (!type) {
        return NextResponse.json({ error: 'type required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { firstName: true, lastName: true, email: true },
    });
    if (!user?.email) {
        return NextResponse.json({ error: 'User email required for PayFast' }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const mPaymentId = crypto.randomUUID();
    let amount = 0;
    let itemName = `${BRAND.name} payment`;
    let billingId: string | undefined;
    let invoiceId: string | undefined;

    if (type === 'SCHOOL_SUBSCRIPTION') {
        if (!canManageSchool(auth.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!body.billingId) {
            return NextResponse.json({ error: 'billingId required' }, { status: 400 });
        }
        const billing = await prisma.billing.findFirst({
            where: { id: body.billingId, schoolId: auth.schoolId! },
            include: { school: { select: { name: true } } },
        });
        if (!billing) return new NextResponse('Billing not found', { status: 404 });
        if (billing.status === 'ACTIVE') {
            return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
        }
        amount = billing.totalAmount;
        itemName = `${BRAND.name} subscription — ${billing.school.name}`;
        billingId = billing.id;
    } else if (type === 'PARENT_FEE') {
        if (auth.role !== 'PARENT') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!body.invoiceId) {
            return NextResponse.json({ error: 'invoiceId required' }, { status: 400 });
        }
        const parent = await prisma.parentProfile.findUnique({
            where: { userId: auth.userId },
            select: { learnerIds: true },
        });
        const invoice = await prisma.feeInvoice.findFirst({
            where: { id: body.invoiceId, schoolId: auth.schoolId! },
            include: { learner: { include: { user: { select: { firstName: true, lastName: true } } } } },
        });
        if (!invoice) return new NextResponse('Invoice not found', { status: 404 });
        if (!parent?.learnerIds.includes(invoice.learnerId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (invoice.status === 'PAID') {
            return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
        }
        amount = invoice.amount;
        itemName = invoice.title;
        invoiceId = invoice.id;
    } else {
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const checkout = await prisma.$transaction(async (tx) => {
        const targetId = type === 'SCHOOL_SUBSCRIPTION' ? billingId : invoiceId;
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${checkoutLockKey(type, targetId!)}))`;

        const existingPending = await tx.payFastCheckout.findFirst({
            where:
                type === 'SCHOOL_SUBSCRIPTION'
                    ? { billingId, status: 'PENDING' }
                    : { invoiceId, status: 'PENDING' },
            select: { id: true },
        });
        if (existingPending) {
            return { alreadyPending: true };
        }

        await tx.payFastCheckout.create({
            data: {
                mPaymentId,
                type,
                schoolId: auth.schoolId!,
                userId: auth.userId,
                amount,
                billingId,
                invoiceId,
                status: 'PENDING',
            },
        });

        return { alreadyPending: false };
    });

    if (checkout.alreadyPending) {
        return NextResponse.json({ error: 'Payment already in progress' }, { status: 409 });
    }

    const fields: Record<string, string> = {
        merchant_id: process.env.PAYFAST_MERCHANT_ID!,
        merchant_key: process.env.PAYFAST_MERCHANT_KEY!,
        return_url: `${baseUrl}/dashboard/payment/return?ref=${mPaymentId}`,
        cancel_url: `${baseUrl}/dashboard/payment/cancel?ref=${mPaymentId}`,
        notify_url: `${baseUrl}/api/payfast/itn`,
        name_first: user.firstName,
        name_last: user.lastName,
        email_address: user.email,
        m_payment_id: mPaymentId,
        amount: formatPayFastAmount(amount),
        item_name: itemName,
    };

    const signature = generatePayFastSignature(fields, getPayFastPassphrase());
    fields.signature = signature;

    return NextResponse.json({
        action: PAYFAST_PROCESS_URL,
        fields,
        mPaymentId,
    });
}
