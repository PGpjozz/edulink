import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { readJson } from '@/lib/api-auth';

const CURRENT_VERSION = '2026-01';

export async function GET() {
    const auth = await requireAuth({ allowPasswordChange: true });
    if (auth instanceof NextResponse) return auth;

    const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { privacyConsentAt: true, privacyConsentVersion: true },
    });

    const hasConsent =
        !!user?.privacyConsentAt &&
        user.privacyConsentVersion === CURRENT_VERSION;

    return NextResponse.json({ hasConsent, version: user?.privacyConsentVersion ?? null });
}

export async function POST(req: Request) {
    const auth = await requireAuth({ allowPasswordChange: true });
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<{ version?: string }>(req);
    if (body instanceof NextResponse) return body;

    const version = body.version ?? CURRENT_VERSION;

    await prisma.user.update({
        where: { id: auth.userId },
        data: {
            privacyConsentAt: new Date(),
            privacyConsentVersion: version,
        },
    });

    return NextResponse.json({ ok: true });
}
