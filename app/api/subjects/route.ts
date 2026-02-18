import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    // If teacher, fetch assigned subjects (mocking logic: fetch all for now or check TeacherProfile)
    // For simplicity MVP: fetch all subjects for the school
    try {
        const subjects = await prisma.subject.findMany({
            where: { schoolId: auth.schoolId as string },
            include: {
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } }
            }
        });

        return NextResponse.json(subjects);
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireAuth({ roles: ['PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ subjectId?: string; teacherProfileId?: string | null }>(req);
        if (body instanceof NextResponse) return body;
        const { subjectId, teacherProfileId } = body;

        if (!subjectId) {
            return new NextResponse('Missing subjectId', { status: 400 });
        }

        const existingSubject = await prisma.subject.findFirst({
            where: { id: subjectId, schoolId: auth.schoolId as string },
            select: { id: true }
        });

        if (!existingSubject) {
            return new NextResponse('Subject not found', { status: 404 });
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

        const updated = await prisma.subject.update({
            where: { id: subjectId },
            data: {
                teacherId: teacherProfileId || null
            },
            include: {
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } }
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: teacherProfileId ? 'ASSIGN_SUBJECT_TEACHER' : 'UNASSIGN_SUBJECT_TEACHER',
            entity: 'SUBJECT',
            entityId: subjectId,
            details: { teacherProfileId: teacherProfileId || null }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error assigning subject teacher:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ name?: string; code?: string; grade?: string; teacherId?: string | null }>(req);
        if (body instanceof NextResponse) return body;
        const { name, code, grade, teacherId } = body;

        if (!name || !code || !grade) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        if (teacherId) {
            const teacher = await prisma.teacherProfile.findFirst({
                where: { id: teacherId, user: { schoolId: auth.schoolId as string } },
                select: { id: true }
            });
            if (!teacher) {
                return new NextResponse('Invalid teacherId', { status: 400 });
            }
        }

        const subject = await prisma.subject.create({
            data: {
                name,
                code,
                grade,
                schoolId: auth.schoolId as string,
                teacherId: teacherId || undefined
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_SUBJECT',
            entity: 'SUBJECT',
            entityId: subject.id,
            details: { name, code, grade, teacherId: teacherId || null }
        });

        return NextResponse.json(subject);
    } catch (error) {
        console.error('Error creating subject:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
