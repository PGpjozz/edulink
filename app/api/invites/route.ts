import { NextResponse } from 'next/server';
import { BRAND } from '@/lib/branding';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { canManageUsers, PERMISSION_KEYS } from '@/lib/permissions';
import type { UserRole } from '@prisma/client';
import { sendEmail, inviteEmailHtml } from '@/lib/email';

export async function GET() {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (!canManageUsers(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invites = await prisma.inviteToken.findMany({
        where: { schoolId: auth.schoolId!, usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    return NextResponse.json(
        invites.map((i) => ({
            ...i,
            acceptUrl: `/auth/invite/${i.token}`,
        }))
    );
}

export async function POST(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (!canManageUsers(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await readJson<{
        email?: string;
        role?: UserRole;
        firstName?: string;
        lastName?: string;
        permissions?: string[];
    }>(req);
    if (body instanceof NextResponse) return body;

    const email = body.email?.trim().toLowerCase();
    if (!email || !body.role) {
        return NextResponse.json({ error: 'Email and role required' }, { status: 400 });
    }

    const blocked: UserRole[] = ['PROVIDER', 'LEARNER'];
    if (blocked.includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role for invite' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const permissions = (body.permissions ?? []).filter((p) =>
        (PERMISSION_KEYS as readonly string[]).includes(p)
    );

    const token = crypto.randomBytes(32).toString('hex');
    const invite = await prisma.inviteToken.create({
        data: {
            email,
            schoolId: auth.schoolId!,
            role: body.role,
            token,
            invitedById: auth.userId,
            firstName: body.firstName?.trim() ?? null,
            lastName: body.lastName?.trim() ?? null,
            permissions,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });

    await writeAuditLog({
        schoolId: auth.schoolId,
        userId: auth.userId,
        action: 'CREATE_INVITE',
        entity: 'INVITE',
        entityId: invite.id,
        details: { email, role: body.role },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const acceptUrl = `${baseUrl}/auth/invite/${token}`;

    const school = await prisma.school.findUnique({
        where: { id: auth.schoolId! },
        select: { name: true },
    });

    const emailResult = await sendEmail({
        to: email,
        subject: `You're invited to ${school?.name ?? BRAND.name}`,
        html: inviteEmailHtml({
            schoolName: school?.name ?? 'your school',
            role: body.role,
            acceptUrl,
            firstName: body.firstName,
        }),
        text: `You've been invited to ${school?.name ?? BRAND.name}. Accept: ${acceptUrl}`,
    });

    return NextResponse.json({
        ...invite,
        acceptUrl,
        emailSent: emailResult.sent,
        ...(process.env.NODE_ENV !== 'production' || !emailResult.sent
            ? { devLink: acceptUrl }
            : {}),
    });
}
