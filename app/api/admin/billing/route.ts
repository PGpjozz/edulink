import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { createBillForSchool } from '@/lib/provider-billing';

export async function GET(req: Request) {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        const billingHistory = await prisma.billing.findMany({
            where: status ? { status: status as 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' } : undefined,
            include: { school: { select: { id: true, name: true, tier: true } } },
            orderBy: { createdAt: 'desc' },
            take: 500,
        });
        return NextResponse.json(billingHistory);
    } catch (error) {
        console.error('billing GET', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ schoolId?: string }>(req);
        if (body instanceof NextResponse) return body;
        const { schoolId } = body;

        if (!schoolId) {
            return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 });
        }

        const result = await createBillForSchool(schoolId, auth.userId);
        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 404 });
        }

        return NextResponse.json(result.billing);
    } catch (error) {
        console.error('billing POST', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
