import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardDevRoute } from '@/lib/dev-routes';
import { BRAND_DEFAULTS } from '@/lib/branding';
import { generateBillsForAllSchools, processOverdueSuspensions } from '@/lib/provider-billing';

/** Cron-friendly monthly billing — POST ?secret=brightcampus-billing-cron-2026 or authenticated provider session */
export async function POST(req: Request) {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    let providerUserId: string;
    let automated = false;

    if (secret) {
        const blocked = guardDevRoute(BRAND_DEFAULTS.billingCronSecret, secret);
        if (blocked) return blocked;

        const provider = await prisma.user.findFirst({
            where: { role: 'PROVIDER', isActive: true },
            select: { id: true },
        });
        if (!provider) {
            return NextResponse.json({ error: 'No provider user found' }, { status: 500 });
        }
        providerUserId = provider.id;
        automated = true;
    } else {
        const { requireAuth } = await import('@/lib/api-auth');
        const auth = await requireAuth({ roles: ['PROVIDER'] });
        if (auth instanceof NextResponse) return auth;
        providerUserId = auth.userId;
    }

    try {
        const results = await generateBillsForAllSchools(providerUserId);
        const suspended = await processOverdueSuspensions(providerUserId);
        return NextResponse.json({
            ok: true,
            automated,
            summary: {
                created: results.filter((r) => r.status === 'created').length,
                skipped: results.filter((r) => r.status === 'skipped').length,
                errors: results.filter((r) => r.status === 'error').length,
                suspended: suspended.length,
            },
            results,
            suspendedSchools: suspended,
        });
    } catch (error) {
        console.error('cron billing', error);
        return NextResponse.json({ error: 'Billing job failed' }, { status: 500 });
    }
}
