import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { getStaffContext, subjectScopeWhere } from '@/lib/staff-context';
import { assignSubjectToClasses, attachCompulsorySubject } from '@/lib/class-subjects';

export async function GET() {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const ctx = await getStaffContext(auth);
        const subjects = await prisma.subject.findMany({
            where: subjectScopeWhere(auth, ctx),
            include: {
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
                department: { select: { id: true, name: true } },
                classSubjects: { select: { classId: true, class: { select: { id: true, name: true, grade: true } } } },
                _count: { select: { assessments: true, quizzes: true, classSubjects: true } },
            },
            orderBy: [{ grade: 'asc' }, { name: 'asc' }],
        });

        return NextResponse.json(subjects);
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireAuth({ schoolAdmin: true, requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{
            subjectId?: string;
            teacherProfileId?: string | null;
            departmentId?: string | null;
            offering?: string;
            name?: string;
            code?: string;
            grade?: string;
            classIds?: string[];
        }>(req);
        if (body instanceof NextResponse) return body;
        const { subjectId, teacherProfileId, departmentId, offering, name, code, grade, classIds } = body;

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
                where: { id: teacherProfileId, user: { schoolId: auth.schoolId as string } },
                select: { id: true }
            });
            if (!teacher) return new NextResponse('Invalid teacherProfileId', { status: 400 });
        }

        const offeringValue = offering === 'OPTIONAL' || offering === 'COMPULSORY' ? offering : undefined;
        const subjectName = name?.trim();
        const subjectCode = code?.trim();
        const subjectGrade = grade?.trim();

        const updated = await prisma.subject.update({
            where: { id: subjectId },
            data: {
                ...(teacherProfileId !== undefined ? { teacherId: teacherProfileId || null } : {}),
                ...(departmentId !== undefined ? { departmentId: departmentId || null } : {}),
                ...(offeringValue ? { offering: offeringValue } : {}),
                ...(subjectName ? { name: subjectName } : {}),
                ...(subjectCode ? { code: subjectCode } : {}),
                ...(subjectGrade ? { grade: subjectGrade } : {}),
            },
            include: {
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
                department: { select: { id: true, name: true } },
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'UPDATE_SUBJECT',
            entity: 'SUBJECT',
            entityId: subjectId,
            details: { teacherProfileId: teacherProfileId ?? null, departmentId: departmentId ?? null, offering: offeringValue ?? null }
        });

        if (subjectGrade) {
            await prisma.classSubject.deleteMany({
                where: { subjectId, class: { grade: { not: subjectGrade } } },
            });
        }

        if ((offeringValue ?? updated.offering) === 'COMPULSORY') {
            await attachCompulsorySubject(auth.schoolId as string, subjectId);
        } else if (Array.isArray(classIds)) {
            await assignSubjectToClasses(auth.schoolId as string, subjectId, classIds);
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error assigning subject teacher:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ schoolAdmin: true, requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ name?: string; code?: string; grade?: string; teacherId?: string | null; departmentId?: string | null; offering?: string; classIds?: string[] }>(req);
        if (body instanceof NextResponse) return body;
        const { name, code, grade, teacherId, departmentId, offering, classIds } = body;
        const offeringValue = offering === 'OPTIONAL' ? 'OPTIONAL' : 'COMPULSORY';

        const subjectName = name?.trim();
        const subjectCode = code?.trim();
        const subjectGrade = grade?.trim();
        if (!subjectName || !subjectCode || !subjectGrade) {
            return new NextResponse('Name, code, and grade are required', { status: 400 });
        }

        if (teacherId) {
            const teacher = await prisma.teacherProfile.findFirst({
                where: { id: teacherId, user: { schoolId: auth.schoolId as string } },
                select: { id: true }
            });
            if (!teacher) return new NextResponse('Invalid teacherId', { status: 400 });
        }

        const subject = await prisma.subject.create({
            data: {
                name: subjectName,
                code: subjectCode,
                grade: subjectGrade,
                offering: offeringValue,
                schoolId: auth.schoolId as string,
                teacherId: teacherId || undefined,
                departmentId: departmentId || undefined,
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_SUBJECT',
            entity: 'SUBJECT',
            entityId: subject.id,
            details: { name: subjectName, code: subjectCode, grade: subjectGrade, offering: offeringValue, teacherId: teacherId || null, departmentId: departmentId || null }
        });

        if (offeringValue === 'COMPULSORY') {
            await attachCompulsorySubject(auth.schoolId as string, subject.id);
        } else if (Array.isArray(classIds) && classIds.length > 0) {
            await assignSubjectToClasses(auth.schoolId as string, subject.id, classIds);
        }

        return NextResponse.json(subject);
    } catch (error) {
        console.error('Error creating subject:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return new NextResponse('A subject with these details already exists', { status: 409 });
        }
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const auth = await requireAuth({ schoolAdmin: true, requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ subjectId?: string }>(req);
        if (body instanceof NextResponse) return body;
        if (!body.subjectId) return new NextResponse('Missing subjectId', { status: 400 });

        const existing = await prisma.subject.findFirst({
            where: { id: body.subjectId, schoolId: auth.schoolId as string },
            select: { id: true, name: true },
        });
        if (!existing) return new NextResponse('Subject not found', { status: 404 });

        await prisma.subject.delete({ where: { id: existing.id } });
        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'DELETE_SUBJECT',
            entity: 'SUBJECT',
            entityId: existing.id,
            details: { name: existing.name },
        });
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Error deleting subject:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return new NextResponse('This subject is used by assessments or other records, so it cannot be deleted.', { status: 400 });
        }
        return new NextResponse('Internal Error', { status: 500 });
    }
}
