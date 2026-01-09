import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    try {
        const resources = await prisma.resource.findMany({
            where: { subjectId: params.id },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(resources);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TEACHER' && session.user.role !== 'PRINCIPAL') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, fileUrl, fileType, fileSize } = body;

        if (!title || !fileUrl) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const resource = await prisma.resource.create({
            data: {
                subjectId: params.id,
                title,
                fileUrl,
                fileType: fileType || 'OTHER',
                fileSize
            }
        });

        return NextResponse.json(resource);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
