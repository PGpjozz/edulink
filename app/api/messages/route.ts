import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    try {
        const query: any = {
            schoolId: session.user.schoolId
        };

        if (userId) {
            query.OR = [
                { senderId: session.user.id, recipientId: userId },
                { senderId: userId, recipientId: session.user.id }
            ];
        } else {
            query.OR = [
                { recipientId: session.user.id },
                { senderId: session.user.id }
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
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { recipientId, subject, content } = body;

        if (!recipientId || !subject || !content) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const message = await prisma.message.create({
            data: {
                senderId: session.user.id,
                recipientId,
                schoolId: session.user.schoolId,
                subject,
                content
            }
        });

        return NextResponse.json(message);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
