import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/api-auth';
import { TIER_PLANS, type BillingTier } from '@/lib/provider-pricing';

const SUBSCRIPTION_ROLES = ['SCHOOL_OWNER', 'PRINCIPAL', 'SCHOOL_ADMIN'];

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || !SUBSCRIPTION_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedTier = body.tier as BillingTier | undefined;
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

    if (!requestedTier || !TIER_PLANS[requestedTier]) {
        return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
        where: { id: session.user.schoolId },
        select: { id: true, name: true, tier: true },
    });

    if (!school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    if (school.tier === requestedTier) {
        return NextResponse.json({ error: 'Already on this plan' }, { status: 400 });
    }

    await writeAuditLog({
        schoolId: school.id,
        userId: session.user.id,
        action: 'UPGRADE_REQUEST',
        entity: 'SCHOOL',
        entityId: school.id,
        details: {
            currentTier: school.tier,
            requestedTier,
            notes,
            requestedBy: session.user.email,
        },
    });

    return NextResponse.json({
        ok: true,
        message: `Upgrade request submitted. BrightCampus will contact you about moving to the ${TIER_PLANS[requestedTier].label} plan.`,
    });
}
