import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('secret') !== 'edulink-setup-2026') {
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
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
