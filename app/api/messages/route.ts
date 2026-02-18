import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    try {
        const query: any = {
            schoolId: auth.schoolId as string
        };

        if (userId) {
            const otherUser = await prisma.user.findFirst({
                where: { id: userId, schoolId: auth.schoolId as string, isActive: true },
                select: { id: true, role: true }
            });

            if (!otherUser) {
                return new NextResponse('User not found', { status: 404 });
            }

            const senderRole = auth.role;
            const recipientRole = otherUser.role;
            const allowed =
                ((senderRole === 'TEACHER' || senderRole === 'PRINCIPAL' || senderRole === 'SCHOOL_ADMIN') && recipientRole === 'PARENT') ||
                (senderRole === 'PARENT' && (recipientRole === 'TEACHER' || recipientRole === 'PRINCIPAL' || recipientRole === 'SCHOOL_ADMIN'));

            if (!allowed) {
                return new NextResponse('Forbidden', { status: 403 });
            }

            query.OR = [
                { senderId: auth.userId, recipientId: userId },
                { senderId: userId, recipientId: auth.userId }
            ];
        } else {
            query.OR = [
                { recipientId: auth.userId },
                { senderId: auth.userId }
            ];
        }

        const messages = await prisma.message.findMany({
            where: query,
            include: {
                sender: { select: { id: true, firstName: true, lastName: true, role: true } },
                recipient: { select: { id: true, firstName: true, lastName: true, role: true } }
            },
            orderBy: { createdAt: userId ? 'asc' : 'desc' }
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error('Messaging GET Error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ recipientId?: string; subject?: string; content?: string }>(req);
        if (body instanceof NextResponse) return body;
        const { recipientId, subject, content } = body;

        if (!recipientId || !subject || !content) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        if (recipientId === auth.userId) {
            return new NextResponse('Cannot message self', { status: 400 });
        }

        const recipient = await prisma.user.findFirst({
            where: {
                id: recipientId,
                schoolId: auth.schoolId as string,
                isActive: true
            },
            select: { id: true, role: true }
        });

        if (!recipient) {
            return new NextResponse('Recipient not found', { status: 404 });
        }

        const senderRole = auth.role;
        const recipientRole = recipient.role;

        const allowed =
            ((senderRole === 'TEACHER' || senderRole === 'PRINCIPAL' || senderRole === 'SCHOOL_ADMIN') && recipientRole === 'PARENT') ||
            (senderRole === 'PARENT' && (recipientRole === 'TEACHER' || recipientRole === 'PRINCIPAL' || recipientRole === 'SCHOOL_ADMIN'));

        if (!allowed) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const message = await prisma.message.create({
            data: {
                senderId: auth.userId,
                recipientId,
                schoolId: auth.schoolId as string,
                subject,
                content
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'SEND_MESSAGE',
            entity: 'MESSAGE',
            entityId: message.id,
            details: { recipientId }
        });

        return NextResponse.json(message);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
