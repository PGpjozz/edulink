import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.schoolId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const school = await prisma.school.findUnique({
            where: { id: session.user.schoolId },
            select: {
                logoUrl: true,
                primaryColor: true,
                name: true
            }
        });
        return NextResponse.json(school);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch branding' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.schoolId || session.user.role !== 'PRINCIPAL') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { logoUrl, primaryColor } = body;

        const [updatedSchool] = await prisma.$transaction([
            prisma.school.update({
                where: { id: session.user.schoolId },
                data: {
                    logoUrl,
                    primaryColor
                }
            }),
            prisma.auditLog.create({
                data: {
                    schoolId: session.user.schoolId,
                    userId: session.user.id,
                    action: 'Update School Branding',
                    entity: 'School',
                    entityId: session.user.schoolId,
                    details: { logoUrl, primaryColor }
                }
            })
        ]);

        return NextResponse.json(updatedSchool);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 });
    }
}
