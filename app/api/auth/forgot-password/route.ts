import { NextResponse } from 'next/server';
import { readJson } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { sendEmail, passwordResetEmailHtml } from '@/lib/email';
import { createPasswordResetToken } from '@/lib/password-reset-token';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
    const ip = getClientIp(req);
    const limit = checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Try again later.' },
            { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
        );
    }

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

    if (!user) {
        return NextResponse.json({ ok: true, message: 'If that account exists, a reset link was sent.' });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const token = createPasswordResetToken(user.id);
    const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

    const emailResult = await sendEmail({
        to: user.email!,
        subject: 'Reset your EduLink password',
        html: passwordResetEmailHtml({ resetUrl }),
        text: `Reset your password: ${resetUrl}`,
    });

    return NextResponse.json({
        ok: true,
        message: emailResult.sent
            ? 'If that account exists, a reset link was emailed to you.'
            : 'If that account exists, use the reset link below (email not configured).',
        ...(process.env.NODE_ENV !== 'production' && !emailResult.sent ? { resetUrl } : {}),
    });
}
