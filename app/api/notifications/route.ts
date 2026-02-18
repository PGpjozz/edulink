import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson } from '@/lib/api-auth';

export async function GET() {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: auth.userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ id?: string; isRead?: boolean }>(req);
        if (body instanceof NextResponse) return body;
        const { id, isRead } = body;

        if (!id || typeof isRead !== 'boolean') {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const existing = await prisma.notification.findFirst({
            where: { id, userId: auth.userId },
            select: { id: true }
        });

        if (!existing) {
            return new NextResponse('Notification not found', { status: 404 });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { isRead }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating notification:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
