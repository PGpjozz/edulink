import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { readJson } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { verifyPasswordResetToken } from '@/lib/password-reset-token';
import { validatePassword } from '@/lib/password';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
    const ip = getClientIp(req);
    const limit = checkRateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await readJson<{ token?: string; password?: string }>(req);
    if (body instanceof NextResponse) return body;

    const { token, password } = body;
    if (!token || !password) {
        return NextResponse.json({ error: 'Token and password required' }, { status: 400 });
    }

    const policyError = validatePassword(password);
    if (policyError) {
        return NextResponse.json({ error: policyError }, { status: 400 });
    }

    const verified = verifyPasswordResetToken(token);
    if (!verified) {
        return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
        where: { id: verified.userId },
        data: { password: hashed, mustChangePassword: false },
    });

    return NextResponse.json({ ok: true });
}
