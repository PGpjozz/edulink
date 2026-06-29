import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { readJson } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { sendEmail, passwordResetEmailHtml } from '@/lib/email';

// Dev-friendly reset: sets a one-time temp password. In production, send email with token.
export async function POST(req: Request) {
    const body = await readJson<{ email?: string }>(req);
    if (body instanceof NextResponse) return body;

    const email = body.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, email: true },
    });

    // Always return success to avoid email enumeration
    if (!user) {
        return NextResponse.json({ ok: true, message: 'If that account exists, a temporary password was set.' });
    }

    const tempPassword = crypto.randomBytes(4).toString('hex') + 'A1!';
    const hashed = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed, mustChangePassword: true },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const emailResult = await sendEmail({
        to: user.email!,
        subject: 'Your EduLink temporary password',
        html: passwordResetEmailHtml({ tempPassword, signInUrl: `${baseUrl}/auth/signin` }),
        text: `Temporary password: ${tempPassword}. Sign in at ${baseUrl}/auth/signin`,
    });

    return NextResponse.json({
        ok: true,
        message: emailResult.sent
            ? 'If that account exists, a temporary password was emailed to you.'
            : 'Temporary password generated. You must change it after signing in.',
        ...(process.env.NODE_ENV !== 'production' && !emailResult.sent ? { tempPassword } : {}),
    });
}
