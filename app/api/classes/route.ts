import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { getStaffContext, classScopeWhere } from '@/lib/staff-context';
import { canManageClasses } from '@/lib/permissions';
import { attachCompulsorySubjectsForClass } from '@/lib/class-subjects';

export async function GET() {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const ctx = await getStaffContext(auth);
        const classes = await prisma.class.findMany({
            where: classScopeWhere(auth, ctx),
            include: {
                teacher: {
                    include: { user: { select: { firstName: true, lastName: true } } }
                },
                classSubjects: {
                    include: {
                        subject: { select: { id: true, name: true, code: true } },
                        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
                    },
                },
                _count: { select: { learners: true } }
            },
            orderBy: [{ grade: 'asc' }, { name: 'asc' }],
        });

        return NextResponse.json(classes);
    } catch (error) {
        console.error('Error fetching classes:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;
    if (!canManageClasses(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await readJson<{ classId?: string; name?: string; grade?: string; teacherProfileId?: string | null }>(req);
        if (body instanceof NextResponse) return body;
        const { classId, name, grade, teacherProfileId } = body;

        if (!classId) return new NextResponse('Missing classId', { status: 400 });

        const existingClass = await prisma.class.findFirst({
            where: { id: classId, schoolId: auth.schoolId as string },
            select: { id: true, grade: true }
        });
        if (!existingClass) return new NextResponse('Class not found', { status: 404 });

        const nextName = typeof name === 'string' ? name.trim() : undefined;
        const nextGrade = typeof grade === 'string' ? grade.trim() : undefined;
        if (nextName !== undefined && !nextName) return new NextResponse('Class name is required', { status: 400 });
        if (nextGrade !== undefined && !nextGrade) return new NextResponse('Grade is required', { status: 400 });

        if (teacherProfileId) {
            const teacher = await prisma.teacherProfile.findFirst({
                where: { id: teacherProfileId, user: { schoolId: auth.schoolId as string } },
                select: { id: true }
            });
            if (!teacher) return new NextResponse('Invalid teacherProfileId', { status: 400 });
        }

        const updated = await prisma.class.update({
            where: { id: classId },
            data: {
                ...(nextName !== undefined ? { name: nextName } : {}),
                ...(nextGrade !== undefined ? { grade: nextGrade } : {}),
                ...(teacherProfileId !== undefined ? { teacherProfileId: teacherProfileId || null } : {}),
            },
            include: {
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
                _count: { select: { learners: true } }
            }
        });

        if (nextGrade && nextGrade !== existingClass.grade) {
            await prisma.learnerProfile.updateMany({
                where: { classId },
                data: { grade: nextGrade },
            });
            await prisma.classSubject.deleteMany({
                where: { classId, subject: { grade: { not: nextGrade } } },
            });
            await attachCompulsorySubjectsForClass(auth.schoolId as string, classId, nextGrade);
        }

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'UPDATE_CLASS',
            entity: 'CLASS',
            entityId: classId,
            details: { name: nextName, grade: nextGrade, teacherProfileId: teacherProfileId ?? undefined }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error assigning class teacher:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;
    if (!canManageClasses(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await readJson<{ name?: string; grade?: string }>(req);
        if (body instanceof NextResponse) return body;
        const { name, grade } = body;

        if (!name || !grade) return new NextResponse('Missing required fields', { status: 400 });

        const newClass = await prisma.class.create({
            data: { name, grade, schoolId: auth.schoolId as string }
        });

        await attachCompulsorySubjectsForClass(auth.schoolId as string, newClass.id, grade);

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
