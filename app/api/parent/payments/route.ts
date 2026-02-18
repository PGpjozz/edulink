import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['PARENT'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ invoiceId?: string; amount?: number; method?: string }>(req);
        if (body instanceof NextResponse) return body;
        const { invoiceId, amount, method } = body;

        if (!invoiceId) {
            return new NextResponse('Missing invoiceId', { status: 400 });
        }

        const parentProfile = await prisma.parentProfile.findUnique({
            where: { userId: auth.userId },
            select: { learnerIds: true }
        });

        if (!parentProfile?.learnerIds?.length) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const invoice = await prisma.feeInvoice.findUnique({
            where: { id: invoiceId }
        });

        if (!invoice) return new NextResponse('Invoice not found', { status: 404 });

        if (invoice.schoolId !== (auth.schoolId as string) || !parentProfile.learnerIds.includes(invoice.learnerId)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const amountNum = amount === undefined || amount === null ? invoice.amount : Number(amount);
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
            return new NextResponse('Invalid amount', { status: 400 });
        }

        // Simulate payment logic
        const payment = await prisma.payment.create({
            data: {
                invoiceId,
                amount: amountNum,
                method: method || 'CARD',
                status: 'COMPLETED'
            }
        });

        // Update invoice status if fully paid
        const allPayments = await prisma.payment.findMany({ where: { invoiceId } });
        const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

        if (totalPaid >= invoice.amount) {
            await prisma.feeInvoice.update({
                where: { id: invoiceId },
                data: { status: 'PAID' }
            });
        }

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_PAYMENT',
            entity: 'PAYMENT',
            entityId: payment.id,
            details: { invoiceId, amount: payment.amount, method: payment.method }
        });

        return NextResponse.json(payment);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
