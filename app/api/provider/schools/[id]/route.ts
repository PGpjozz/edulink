import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import {
    computeTenantHealth,
    getLearnerCount,
} from '@/lib/provider-billing';
import {
    getEffectiveMonthlyFee,
    getTierDefaultFee,
    TIER_PLANS,
    type BillingTier,
} from '@/lib/provider-pricing';
import { BRAND_DEFAULTS } from '@/lib/branding';

type SchoolPatch = {
    name?: string;
    contactEmail?: string;
    tier?: BillingTier;
    monthlyFee?: number;
    subdomain?: string | null;
    isActive?: boolean;
    gradesOffered?: string[];
};

function slugifySubdomain(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    try {
        const school = await prisma.school.findUnique({
            where: { id },
            include: {
                owner: { select: { id: true, email: true, firstName: true, lastName: true } },
                billings: { orderBy: { createdAt: 'desc' }, take: 6 },
                _count: {
                    select: {
                        users: true,
                        classes: true,
                    },
                },
            },
        });

        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        const learnerCount = await getLearnerCount(id);
        const staffCount = await prisma.user.count({
            where: {
                schoolId: id,
                role: { in: ['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'HOD', 'SCHOOL_OWNER'] },
                isActive: true,
            },
        });

        const principal = await prisma.user.findFirst({
            where: { schoolId: id, role: 'PRINCIPAL', isActive: true },
            select: { id: true, email: true, firstName: true, lastName: true },
            orderBy: { createdAt: 'asc' },
        });

        const latestBill = school.billings[0] ?? null;
        const daysSinceLastBill = latestBill
            ? Math.floor((Date.now() - latestBill.createdAt.getTime()) / (1000 * 60 * 60 * 24))
            : null;

        const health = computeTenantHealth({
            isActive: school.isActive,
            learnerCount,
            staffCount,
            hasOwner: Boolean(school.ownerId),
            latestBillStatus: latestBill?.status ?? null,
            daysSinceLastBill,
            subdomain: school.subdomain,
        });

        const applyUrl = school.subdomain
            ? `https://${school.subdomain}.${BRAND_DEFAULTS.tenantRootDomain}/apply`
            : null;

        return NextResponse.json({
            school: {
                ...school,
                effectiveMonthlyFee: getEffectiveMonthlyFee({
                    tier: school.tier as BillingTier,
                    monthlyFee: school.monthlyFee,
                }),
                tierDefaultFee: getTierDefaultFee(school.tier as BillingTier),
                tierPlan: TIER_PLANS[school.tier as BillingTier],
                learnerCount,
                staffCount,
                principal,
                applyUrl,
                health,
            },
        });
    } catch (error) {
        console.error('school GET', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await readJson<SchoolPatch>(req);
    if (body instanceof NextResponse) return body;

    try {
        const existing = await prisma.school.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        const data: SchoolPatch & { subdomain?: string | null } = {};

        if (body.name !== undefined) data.name = body.name.trim();
        if (body.contactEmail !== undefined) data.contactEmail = body.contactEmail.trim();
        if (body.tier !== undefined) data.tier = body.tier;
        if (body.monthlyFee !== undefined) {
            const fee = Number(body.monthlyFee);
            if (!Number.isFinite(fee) || fee < 0) {
                return NextResponse.json({ error: 'Invalid monthlyFee' }, { status: 400 });
            }
            data.monthlyFee = fee;
        }
        if (body.isActive !== undefined) data.isActive = body.isActive;
        if (body.gradesOffered !== undefined) data.gradesOffered = body.gradesOffered;

        if (body.subdomain !== undefined) {
            if (body.subdomain === null || body.subdomain === '') {
                data.subdomain = null;
            } else {
                const subdomain = slugifySubdomain(body.subdomain);
                if (!subdomain) {
                    return NextResponse.json({ error: 'Invalid subdomain' }, { status: 400 });
                }
                const clash = await prisma.school.findFirst({
                    where: { subdomain, NOT: { id } },
                });
                if (clash) {
                    return NextResponse.json({ error: 'Subdomain already in use' }, { status: 400 });
                }
                data.subdomain = subdomain;
            }
        }

        const updated = await prisma.school.update({
            where: { id },
            data,
        });

        await writeAuditLog({
            schoolId: id,
            userId: auth.userId,
            action: body.isActive === false ? 'SUSPEND_SCHOOL' : body.isActive === true ? 'REACTIVATE_SCHOOL' : 'UPDATE_SCHOOL',
            entity: 'SCHOOL',
            entityId: id,
            details: data,
        });

        return NextResponse.json({ school: updated });
    } catch (error) {
        console.error('school PATCH', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
