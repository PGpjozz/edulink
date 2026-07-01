import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { guardDevRoute } from '@/lib/dev-routes';
import { BRAND, BRAND_DEFAULTS } from '@/lib/branding';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const blocked = guardDevRoute(BRAND_DEFAULTS.setupSecret, searchParams.get('secret'));
    if (blocked) return blocked;

    try {
        const hash = await bcrypt.hash('provider123', 10);

        const existing = await prisma.user.findFirst({
            where: { email: BRAND_DEFAULTS.providerEmail }
        });

        if (existing) {
            await prisma.user.update({
                where: { id: existing.id },
                data: { password: hash, firstName: BRAND.name }
            });
            return NextResponse.json({ status: 'password_updated', email: BRAND_DEFAULTS.providerEmail });
        }

        const user = await prisma.user.create({
            data: {
                email: BRAND_DEFAULTS.providerEmail,
                password: hash,
                role: 'PROVIDER',
                firstName: BRAND.name,
                lastName: 'Provider',
                isActive: true,
            }
        });

        return NextResponse.json({ status: 'created', email: user.email });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
    }
}
