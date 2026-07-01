import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    const now = new Date();

    const overdue = await prisma.billing.findMany({
        where: { status: 'PAST_DUE' },
        include: {
            school: {
                select: {
                    id: true,
                    name: true,
                    contactEmail: true,
                    isActive: true,
                    owner: { select: { email: true, firstName: true } },
                },
            },
        },
        orderBy: { createdAt: 'asc' },
    });

    const buckets = {
        overdue7: [] as typeof overdue,
        overdue14: [] as typeof overdue,
        overdue30: [] as typeof overdue,
    };

    for (const bill of overdue) {
        const days = Math.floor((now.getTime() - bill.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 30) buckets.overdue30.push(bill);
        else if (days >= 14) buckets.overdue14.push(bill);
        else if (days >= 7) buckets.overdue7.push(bill);
    }

    return NextResponse.json({
        totalOverdue: overdue.length,
        totalAmount: overdue.reduce((s, b) => s + b.totalAmount, 0),
        buckets: {
            overdue7: buckets.overdue7.map(formatDunningRow),
            overdue14: buckets.overdue14.map(formatDunningRow),
            overdue30: buckets.overdue30.map(formatDunningRow),
        },
        all: overdue.map(formatDunningRow),
    });
}

function formatDunningRow(bill: {
    id: string;
    schoolId: string;
    totalAmount: number;
    createdAt: Date;
    school: {
        id: string;
        name: string;
        contactEmail: string | null;
        isActive: boolean;
        owner: { email: string | null; firstName: string } | null;
    };
}) {
    const daysOverdue = Math.floor((Date.now() - bill.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return {
        billingId: bill.id,
        schoolId: bill.schoolId,
        schoolName: bill.school.name,
        isActive: bill.school.isActive,
        totalAmount: bill.totalAmount,
        daysOverdue,
        contactEmail: bill.school.owner?.email ?? bill.school.contactEmail,
        contactName: bill.school.owner?.firstName ?? 'Administrator',
        createdAt: bill.createdAt,
    };
}
