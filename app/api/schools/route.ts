import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'PROVIDER') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const schools = await prisma.school.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { users: true, classes: true }
                }
            }
        });

        return NextResponse.json(schools);
    } catch (error) {
        console.error('Error fetching schools:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'PROVIDER') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, contactEmail, tier } = body;

        const school = await prisma.school.create({
            data: {
                name,
                contactEmail,
                billing: {
                    create: {
                        tier,
                        status: 'ACTIVE'
                    }
                }
            }
        });

        return NextResponse.json(school);
    } catch (error) {
        console.error('Error creating school:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
