import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAuth, readJson } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    const auth = await requireAuth({ allowPasswordChange: true });
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<{ currentPassword?: string; newPassword?: string }>(req);
    if (body instanceof NextResponse) return body;

    const { currentPassword, newPassword } = body;
    if (!newPassword) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { password: true, mustChangePassword: true },
    });
    if (!user?.password) {
        return NextResponse.json({ error: 'Account has no password set' }, { status: 400 });
    }

    if (!auth.mustChangePassword) {
        if (!currentPassword) {
            return NextResponse.json({ error: 'Current password required' }, { status: 400 });
        }
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        }
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: auth.userId },
        data: { password: hashed, mustChangePassword: false },
    });

    return NextResponse.json({ ok: true });
}
