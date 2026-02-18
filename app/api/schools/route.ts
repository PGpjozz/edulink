import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

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
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ name?: string; contactEmail?: string; tier?: string }>(req);
        if (body instanceof NextResponse) return body;
        const { name, contactEmail, tier } = body;

        if (!name || !contactEmail || !tier) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const school = await prisma.school.create({
            data: {
                name,
                contactEmail,
                tier,
            }
        });

        await writeAuditLog({
            schoolId: school.id,
            userId: auth.userId,
            action: 'CREATE_SCHOOL',
            entity: 'SCHOOL',
            entityId: school.id,
            details: { name, tier, contactEmail }
        });

        return NextResponse.json(school);
    } catch (error) {
        console.error('Error creating school:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
