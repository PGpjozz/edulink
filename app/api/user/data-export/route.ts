import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

/** POPIA data subject access request — export account data as JSON. */
export async function GET() {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            idNumber: true,
            phoneNumber: true,
            role: true,
            createdAt: true,
            privacyConsentAt: true,
            privacyConsentVersion: true,
            learnerProfile: { select: { grade: true, class: { select: { name: true } } } },
            parentProfile: { select: { learnerIds: true } },
            notifications: {
                take: 50,
                orderBy: { createdAt: 'desc' },
                select: { title: true, message: true, createdAt: true, type: true },
            },
        },
    });

    if (!user) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
        exportedAt: new Date().toISOString(),
        user,
    });
}
