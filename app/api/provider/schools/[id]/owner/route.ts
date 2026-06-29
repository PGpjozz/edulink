import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    const { id: schoolId } = await params;
    const body = await readJson<{
        email?: string;
        firstName?: string;
        lastName?: string;
        password?: string;
        sendWelcomeEmail?: boolean;
    }>(req);
    if (body instanceof NextResponse) return body;

    const email = body.email?.trim().toLowerCase();
    if (!email || !body.password || body.password.length < 8) {
        return NextResponse.json({ error: 'Email and password (min 8 chars) required' }, { status: 400 });
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true, ownerId: true } });
    if (!school) return new NextResponse('School not found', { status: 404 });
    if (school.ownerId) {
        return NextResponse.json({ error: 'School already has an owner' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (existing) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(body.password, 10);
    const owner = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email,
                password: hashed,
                firstName: body.firstName?.trim() || 'School',
                lastName: body.lastName?.trim() || 'Owner',
                role: 'SCHOOL_OWNER',
                schoolId,
                isActive: true,
            },
        });
        await tx.school.update({ where: { id: schoolId }, data: { ownerId: user.id } });
        return user;
    });

    await writeAuditLog({
        schoolId,
        userId: auth.userId,
        action: 'ASSIGN_SCHOOL_OWNER',
        entity: 'USER',
        entityId: owner.id,
        details: { email },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    let emailSent = false;
    if (body.sendWelcomeEmail !== false) {
        const result = await sendEmail({
            to: email,
            subject: `You're the owner of ${school.name} on EduLink`,
            html: `
                <p>Hi ${owner.firstName},</p>
                <p>Your school owner account for <strong>${school.name}</strong> is ready.</p>
                <p>Sign in at <a href="${baseUrl}/auth/signin">${baseUrl}/auth/signin</a> with your email and the password provided by your administrator.</p>
            `,
        });
        emailSent = result.sent;
    }

    return NextResponse.json({
        ok: true,
        owner: { id: owner.id, email: owner.email },
        emailSent,
    });
}
