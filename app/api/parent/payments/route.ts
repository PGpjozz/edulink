import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PARENT') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { invoiceId, amount, method } = body;

        const invoice = await prisma.feeInvoice.findUnique({
            where: { id: invoiceId }
        });

        if (!invoice) return new NextResponse('Invoice not found', { status: 404 });

        // Simulate payment logic
        const payment = await prisma.payment.create({
            data: {
                invoiceId,
                amount: amount || invoice.amount,
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

        return NextResponse.json(payment);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
