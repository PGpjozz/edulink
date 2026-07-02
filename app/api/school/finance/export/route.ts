import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { canManageFinance } from '@/lib/permissions';
import { toCsv, csvResponse } from '@/lib/csv';

/** CSV of school fee invoices with payment totals. */
export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;
    if (!canManageFinance(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invoices = await prisma.feeInvoice.findMany({
        where: { schoolId: auth.schoolId as string },
        include: {
            learner: { include: { user: { select: { firstName: true, lastName: true, idNumber: true } } } },
            payments: { where: { status: 'COMPLETED' }, select: { amount: true } },
        },
        orderBy: { dueDate: 'desc' },
    });

    const headers = ['Invoice', 'Learner', 'ID Number', 'Title', 'Amount (ZAR)', 'Paid (ZAR)', 'Balance (ZAR)', 'Status', 'Due Date'];
    const rows = invoices.map((inv) => {
        const paid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
        return [
            inv.id.slice(0, 8).toUpperCase(),
            `${inv.learner.user.firstName} ${inv.learner.user.lastName}`,
            inv.learner.user.idNumber ?? '',
            inv.title,
            inv.amount.toFixed(2),
            paid.toFixed(2),
            (inv.amount - paid).toFixed(2),
            inv.status,
            inv.dueDate.toISOString().slice(0, 10),
        ];
    });

    return csvResponse('finance-invoices.csv', toCsv(headers, rows));
}
