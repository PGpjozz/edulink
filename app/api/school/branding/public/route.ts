import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Public branding for sign-in and landing — no auth required. */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const subdomain = searchParams.get('subdomain')?.trim().toLowerCase();

    if (!subdomain) {
        return NextResponse.json({ name: null, logoUrl: null, primaryColor: null });
    }

    try {
        const school = await prisma.school.findFirst({
            where: { subdomain },
            select: { name: true, logoUrl: true, primaryColor: true },
        });

        if (!school) {
            return NextResponse.json({ name: null, logoUrl: null, primaryColor: null });
        }

        return NextResponse.json({
            name: school.name,
            logoUrl: school.logoUrl,
            primaryColor: school.primaryColor,
        });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch branding' }, { status: 500 });
    }
}
