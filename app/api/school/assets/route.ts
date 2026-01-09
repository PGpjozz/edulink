import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bookableOnly = searchParams.get('bookableOnly') === 'true';

    try {
        const query: any = {
            schoolId: session.user.schoolId as string
        };

        if (bookableOnly) {
            query.isBookable = true;
            query.status = 'AVAILABLE';
        }
        const assets = await prisma.asset.findMany({
            where: { schoolId: session.user.schoolId as string },
            include: {
                assignedTo: {
                    select: {
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(assets);
    } catch (error) {
        console.error('Error fetching assets:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PRINCIPAL') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name, category, identifier } = await req.json();

        const asset = await prisma.asset.create({
            data: {
                name,
                category,
                identifier,
                schoolId: session.user.schoolId as string,
                status: 'AVAILABLE'
            }
        });

        return NextResponse.json(asset);
    } catch (error) {
        console.error('Error creating asset:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PRINCIPAL') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, status, assignedToId } = await req.json();

        const asset = await prisma.asset.update({
            where: { id },
            data: {
                status,
                assignedToId: status === 'AVAILABLE' ? null : assignedToId,
            }
        });

        return NextResponse.json(asset);
    } catch (error) {
        console.error('Error updating asset:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PRINCIPAL') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        await prisma.asset.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting asset:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
