import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { generateBillsForAllSchools } from '@/lib/provider-billing';

export async function POST() {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const results = await generateBillsForAllSchools(auth.userId);
        const created = results.filter((r) => r.status === 'created').length;
        const skipped = results.filter((r) => r.status === 'skipped').length;
        const errors = results.filter((r) => r.status === 'error');

        return NextResponse.json({
            ok: true,
            summary: { created, skipped, errors: errors.length },
            results,
        });
    } catch (error) {
        console.error('generate-all billing', error);
        return NextResponse.json({ error: 'Failed to generate bills' }, { status: 500 });
    }
}
