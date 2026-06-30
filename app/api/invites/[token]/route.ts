import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { readJson } from '@/lib/api-auth';
import { PRIVACY_POLICY_VERSION } from '@/lib/env';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    const invite = await prisma.inviteToken.findUnique({
        where: { token },
        include: { school: { select: { name: true } } },
    });

    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
        return NextResponse.json({ valid: false }, { status: 404 });
    }

    return NextResponse.json({
        valid: true,
        email: invite.email,
        role: invite.role,
        schoolName: invite.school.name,
        firstName: invite.firstName,
        lastName: invite.lastName,
    });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const body = await readJson<{ password?: string; firstName?: string; lastName?: string; privacyConsent?: boolean }>(req);
    if (body instanceof NextResponse) return body;

    if (!body.privacyConsent) {
        return NextResponse.json({ error: 'You must accept the privacy policy to continue' }, { status: 400 });
    }

    if (!body.password || body.password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const invite = await prisma.inviteToken.findUnique({ where: { token } });
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(body.password, 10);
    const firstName = body.firstName?.trim() || invite.firstName || 'Staff';
    const lastName = body.lastName?.trim() || invite.lastName || 'Member';

    const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
            data: {
                email: invite.email,
                password: hashed,
                firstName,
                lastName,
                role: invite.role,
                schoolId: invite.schoolId,
                permissions: invite.permissions,
                isActive: true,
                mustChangePassword: false,
                privacyConsentAt: new Date(),
                privacyConsentVersion: PRIVACY_POLICY_VERSION,
                ...(['TEACHER', 'HOD', 'PRINCIPAL'].includes(invite.role)
                    ? { teacherProfile: { create: {} } }
                    : {}),
                ...(invite.role === 'PARENT' ? { parentProfile: { create: { learnerIds: [] } } } : {}),
            },
        });

        await tx.inviteToken.update({
            where: { id: invite.id },
            data: { usedAt: new Date() },
        });

        return created;
    });

    return NextResponse.json({ ok: true, email: user.email, role: user.role });
}
