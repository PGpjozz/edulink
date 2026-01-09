import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId || !['PRINCIPAL', 'SCHOOL_ADMIN'].includes(session.user.role)) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const invoices = await prisma.feeInvoice.findMany({
            where: { schoolId: session.user.schoolId },
            orderBy: { createdAt: 'desc' }
        });

        const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0);
        const totalOverdue = invoices.filter(i => i.status === 'OVERDUE').reduce((sum, inv) => sum + inv.amount, 0);
        const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

        // Monthly revenue for last 6 months
        const monthlyRevenue = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const month = date.toLocaleString('default', { month: 'short' });

            const monthInvoices = invoices.filter(inv => {
                const invDate = new Date(inv.createdAt);
                return invDate.getMonth() === date.getMonth() && invDate.getFullYear() === date.getFullYear();
            });

            monthlyRevenue.push({
                month,
                invoiced: monthInvoices.reduce((sum, inv) => sum + inv.amount, 0),
                collected: monthInvoices.filter(i => i.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0)
            });
        }

        // Status breakdown
        const statusBreakdown = [
            { name: 'Paid', value: invoices.filter(i => i.status === 'PAID').length },
            { name: 'Pending', value: invoices.filter(i => i.status === 'PENDING').length },
            { name: 'Overdue', value: invoices.filter(i => i.status === 'OVERDUE').length },
            { name: 'Void', value: invoices.filter(i => i.status === 'VOID').length }
        ];

        return NextResponse.json({
            stats: {
                totalInvoiced,
                totalPaid,
                totalOverdue,
                collectionRate,
                invoiceCount: invoices.length
            },
            monthlyRevenue,
            statusBreakdown
        });
    } catch (error) {
        console.error('Error fetching financial dashboard:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
