import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardDevRoute } from '@/lib/dev-routes';

export async function GET() {
    const blocked = guardDevRoute('brightcampus-debug-disabled', 'disabled');
    if (blocked) return blocked;

    return NextResponse.json({ error: 'This endpoint has been removed' }, { status: 410 });
}
