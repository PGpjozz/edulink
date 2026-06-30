import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { isPayFastConfigured } from '@/lib/payfast';
import { isBlobConfigured } from '@/lib/storage';

// Provider-only: reports which integrations are configured (no secret values).
export async function GET() {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    return NextResponse.json({
        integrations: {
            database: Boolean(process.env.DATABASE_URL),
            authSecret: Boolean(process.env.NEXTAUTH_SECRET),
            email: Boolean(process.env.RESEND_API_KEY),
            payments: isPayFastConfigured(),
            paymentsMode: process.env.PAYFAST_SANDBOX === 'true' ? 'sandbox' : 'live',
            fileStorage: isBlobConfigured(), // false = local-disk dev fallback
        },
    });
}
