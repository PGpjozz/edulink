import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');
    if (!ref) {
        return NextResponse.json({ error: 'ref required' }, { status: 400 });
    }

    const checkout = await prisma.payFastCheckout.findFirst({
        where: { mPaymentId: ref, userId: auth.userId },
        select: { status: true, type: true, amount: true },
    });

    if (!checkout) {
        return new NextResponse('Not found', { status: 404 });
    }

    return NextResponse.json(checkout);
}
