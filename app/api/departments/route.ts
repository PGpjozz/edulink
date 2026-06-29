import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

export async function GET() {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const departments = await prisma.department.findMany({
            where: { schoolId: auth.schoolId! },
            include: {
                hod: { select: { id: true, firstName: true, lastName: true, email: true } },
                _count: { select: { subjects: true, teachers: true } },
            },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ schoolAdmin: true, requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ name?: string; code?: string; hodUserId?: string | null }>(req);
        if (body instanceof NextResponse) return body;
        const { name, code, hodUserId } = body;
        if (!name) return new NextResponse('Missing name', { status: 400 });

        if (hodUserId) {
            const hod = await prisma.user.findFirst({
                where: { id: hodUserId, schoolId: auth.schoolId!, role: { in: ['HOD', 'TEACHER', 'PRINCIPAL'] } },
            });
            if (!hod) return new NextResponse('Invalid HOD user', { status: 400 });
        }

        const department = await prisma.department.create({
            data: {
                name,
                code: code || null,
                schoolId: auth.schoolId!,
                hodUserId: hodUserId || null,
            },
        });

        if (hodUserId) {
            await prisma.user.update({
                where: { id: hodUserId },
                data: { role: 'HOD' },
            });
            await prisma.teacherProfile.upsert({
                where: { userId: hodUserId },
                create: { userId: hodUserId, departmentId: department.id },
                update: { departmentId: department.id },
            });
        }

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_DEPARTMENT',
            entity: 'DEPARTMENT',
            entityId: department.id,
            details: { name, hodUserId },
        });

        return NextResponse.json(department);
    } catch (error) {
        console.error('Error creating department:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireAuth({ schoolAdmin: true, requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ departmentId?: string; name?: string; code?: string; hodUserId?: string | null }>(req);
        if (body instanceof NextResponse) return body;
        const { departmentId, name, code, hodUserId } = body;
        if (!departmentId) return new NextResponse('Missing departmentId', { status: 400 });

        const existing = await prisma.department.findFirst({
            where: { id: departmentId, schoolId: auth.schoolId! },
        });
        if (!existing) return new NextResponse('Not found', { status: 404 });

        const updated = await prisma.department.update({
            where: { id: departmentId },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(code !== undefined ? { code } : {}),
                ...(hodUserId !== undefined ? { hodUserId: hodUserId || null } : {}),
            },
            include: {
                hod: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
        });

        if (hodUserId) {
            await prisma.user.update({ where: { id: hodUserId }, data: { role: 'HOD' } });
            await prisma.teacherProfile.upsert({
                where: { userId: hodUserId },
                create: { userId: hodUserId, departmentId: departmentId },
                update: { departmentId: departmentId },
            });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating department:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
