import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(req: Request) {
    const ip = getClientIp(req);
    const limit = checkRateLimit(`school-public:${ip}`, 60, 60 * 1000);
    if (!limit.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const subdomain = searchParams.get('subdomain')?.trim().toLowerCase();
    if (!subdomain) {
        return NextResponse.json({ error: 'subdomain required' }, { status: 400 });
    }

    const school = await prisma.school.findFirst({
        where: { subdomain, isActive: true },
        select: {
            id: true,
            name: true,
            subdomain: true,
            primaryColor: true,
            gradesOffered: true,
            contactEmail: true,
        },
    });

    if (!school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json(school);
}
