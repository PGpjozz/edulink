import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { guardDevRoute } from '@/lib/dev-routes';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const blocked = guardDevRoute('edulink-setup-2026', searchParams.get('secret'));
    if (blocked) return blocked;

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
