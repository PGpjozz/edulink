import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    try {
        const where = {
            class: { schoolId: auth.schoolId! },
            ...(classId ? { classId } : {}),
        };

        const items = await prisma.classSubject.findMany({
            where,
            include: {
                class: { select: { id: true, name: true, grade: true } },
                subject: { select: { id: true, name: true, code: true, grade: true, departmentId: true } },
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
            orderBy: [{ class: { grade: 'asc' } }, { subject: { name: 'asc' } }],
        });

        return NextResponse.json(items);
    } catch (error) {
        console.error('Error fetching class subjects:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ schoolAdmin: true, requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ classId?: string; subjectId?: string; teacherProfileId?: string | null }>(req);
        if (body instanceof NextResponse) return body;
        const { classId, subjectId, teacherProfileId } = body;

        if (!classId || !subjectId) {
            return new NextResponse('Missing classId or subjectId', { status: 400 });
        }

        const klass = await prisma.class.findFirst({
            where: { id: classId, schoolId: auth.schoolId! },
        });
        const subject = await prisma.subject.findFirst({
            where: { id: subjectId, schoolId: auth.schoolId! },
        });
        if (!klass || !subject) return new NextResponse('Invalid class or subject', { status: 400 });

        const item = await prisma.classSubject.upsert({
            where: { classId_subjectId: { classId, subjectId } },
            create: { classId, subjectId, teacherProfileId: teacherProfileId || null },
            update: { teacherProfileId: teacherProfileId ?? undefined },
            include: {
                class: { select: { name: true, grade: true } },
                subject: { select: { name: true, code: true } },
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
        });

        if (teacherProfileId) {
            await prisma.subject.update({
                where: { id: subjectId },
                data: { teacherId: teacherProfileId },
            });
        }

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'UPSERT_CLASS_SUBJECT',
            entity: 'CLASS_SUBJECT',
            entityId: item.id,
            details: { classId, subjectId, teacherProfileId },
        });

        return NextResponse.json(item);
    } catch (error) {
        console.error('Error creating class subject:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const auth = await requireAuth({ schoolAdmin: true, requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ id?: string }>(req);
        if (body instanceof NextResponse) return body;
        if (!body.id) return new NextResponse('Missing id', { status: 400 });

        const existing = await prisma.classSubject.findFirst({
            where: { id: body.id, class: { schoolId: auth.schoolId! } },
        });
        if (!existing) return new NextResponse('Not found', { status: 404 });

        await prisma.classSubject.delete({ where: { id: body.id } });
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Error deleting class subject:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
