import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

// GET: Fetch all classes for the school
export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const classes = await prisma.class.findMany({
            where: { schoolId: auth.schoolId as string },
            include: {
                teacher: {
                    include: { user: { select: { firstName: true, lastName: true } } }
                },
                _count: { select: { learners: true } }
            }
        });

        return NextResponse.json(classes);
    } catch (error) {
        console.error('Error fetching classes:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

// PATCH: Assign/unassign class teacher
export async function PATCH(req: Request) {
    const auth = await requireAuth({ roles: ['PRINCIPAL'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ classId?: string; teacherProfileId?: string | null }>(req);
        if (body instanceof NextResponse) return body;
        const { classId, teacherProfileId } = body;

        if (!classId) {
            return new NextResponse('Missing classId', { status: 400 });
        }

        const existingClass = await prisma.class.findFirst({
            where: { id: classId, schoolId: auth.schoolId as string },
            select: { id: true }
        });

        if (!existingClass) {
            return new NextResponse('Class not found', { status: 404 });
        }

        if (teacherProfileId) {
            const teacher = await prisma.teacherProfile.findFirst({
                where: {
                    id: teacherProfileId,
                    user: { schoolId: auth.schoolId as string }
                },
                select: { id: true }
            });

            if (!teacher) {
                return new NextResponse('Invalid teacherProfileId', { status: 400 });
            }
        }

        const updated = await prisma.class.update({
            where: { id: classId },
            data: {
                teacherProfileId: teacherProfileId || null
            },
            include: {
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
                _count: { select: { learners: true } }
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: teacherProfileId ? 'ASSIGN_CLASS_TEACHER' : 'UNASSIGN_CLASS_TEACHER',
            entity: 'CLASS',
            entityId: classId,
            details: { teacherProfileId: teacherProfileId || null }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error assigning class teacher:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

// POST: Create a new class
export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['PRINCIPAL'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ name?: string; grade?: string }>(req);
        if (body instanceof NextResponse) return body;
        const { name, grade } = body;

        if (!name || !grade) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const newClass = await prisma.class.create({
            data: {
                name,
                grade,
                schoolId: auth.schoolId as string
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_CLASS',
            entity: 'CLASS',
            entityId: newClass.id,
            details: { name, grade }
        });

        return NextResponse.json(newClass);
    } catch (error) {
        console.error('Error creating class:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
