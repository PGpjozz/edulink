import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
    // Dev-only bootstrap endpoint (creates/resets the provider account).
    // Disabled in production unless explicitly enabled; secret comes from env.
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_ENDPOINTS !== 'true') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const expectedSecret = process.env.SETUP_SECRET || 'edulink-setup-2026';
    const { searchParams } = new URL(req.url);
    if (searchParams.get('secret') !== expectedSecret) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const hash = await bcrypt.hash('provider123', 10);

        const existing = await prisma.user.findFirst({
            where: { email: 'provider@edulink.com' }
        });

        if (existing) {
            await prisma.user.update({
                where: { id: existing.id },
                data: { password: hash }
            });
            return NextResponse.json({ status: 'password_updated', email: 'provider@edulink.com' });
        }

        const user = await prisma.user.create({
            data: {
                email: 'provider@edulink.com',
                password: hash,
                role: 'PROVIDER',
                firstName: 'Provider',
                lastName: 'Admin',
                isActive: true,
            }
        });

        return NextResponse.json({ status: 'created', email: user.email });
    } catch (e) {
        console.error('[setup]', e);
        return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
    }
}
