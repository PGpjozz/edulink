import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendEmail, passwordResetEmailHtml } from '@/lib/email';
import { parseBody, serverError } from '@/lib/http';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

const forgotPasswordSchema = z.object({
    email: z.string().trim().email().toLowerCase(),
});

// Dev-friendly reset: sets a one-time temp password. In production, send email with token.
export async function POST(req: Request) {
    // Throttle to slow down enumeration / forced-reset abuse.
    const ip = getClientIp(req);
    const limit = rateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000);
    if (!limit.ok) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
        );
    }

    const body = await parseBody(req, forgotPasswordSchema);
    if (body instanceof NextResponse) return body;

    const email = body.email;

    try {

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
    } catch (e) {
        return serverError('forgot-password', e);
    }
}
