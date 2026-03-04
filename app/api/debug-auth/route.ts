import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const rows = await prisma.$queryRaw<{ id: string; email: string; role: string; isActive: boolean; hasPassword: boolean }[]>`
            SELECT id, email, role, "isActive",
                (password IS NOT NULL) AS "hasPassword"
            FROM users WHERE email = 'provider@edulink.com'
        `;
        return NextResponse.json({ dbUrl: process.env.DATABASE_URL?.slice(0, 40) + '...', rows });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, dbUrl: process.env.DATABASE_URL?.slice(0, 40) + '...' }, { status: 500 });
    }
}
