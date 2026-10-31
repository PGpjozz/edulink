import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { canManageClasses } from '@/lib/permissions';
import { attachCompulsorySubjectsForClass } from '@/lib/class-subjects';

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
                subject: { select: { id: true, name: true, code: true, grade: true, departmentId: true, offering: true } },
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
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;
    if (!canManageClasses(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await readJson<{
            classId?: string;
            subjectId?: string;
            teacherProfileId?: string | null;
            copyFromClassId?: string;
            syncCompulsory?: boolean;
        }>(req);
        if (body instanceof NextResponse) return body;
        const { classId, subjectId, teacherProfileId, copyFromClassId, syncCompulsory } = body;

        if (classId && syncCompulsory) {
            const klass = await prisma.class.findFirst({
                where: { id: classId, schoolId: auth.schoolId! },
                select: { id: true, grade: true },
            });
            if (!klass) return new NextResponse('Class not found', { status: 404 });
            const linked = await attachCompulsorySubjectsForClass(auth.schoolId!, klass.id, klass.grade);
            return NextResponse.json({ linked });
        }

        if (classId && copyFromClassId) {
            const [source, target] = await Promise.all([
                prisma.class.findFirst({ where: { id: copyFromClassId, schoolId: auth.schoolId! }, select: { id: true, grade: true, name: true } }),
                prisma.class.findFirst({ where: { id: classId, schoolId: auth.schoolId! }, select: { id: true, grade: true, name: true } }),
            ]);
            if (!source || !target) return new NextResponse('Class not found', { status: 404 });
            if (source.id === target.id) return new NextResponse('Choose a different class', { status: 400 });
            if (source.grade !== target.grade) {
                return new NextResponse('Copy from a class in the same grade', { status: 400 });
            }

            const sourceLinks = await prisma.classSubject.findMany({
                where: { classId: source.id },
                select: { subjectId: true, teacherProfileId: true },
            });
            let copied = 0;
            for (const link of sourceLinks) {
                const existing = await prisma.classSubject.findUnique({
                    where: { classId_subjectId: { classId: target.id, subjectId: link.subjectId } },
                    select: { id: true },
                });
                if (existing) continue;
                await prisma.classSubject.create({
                    data: {
                        classId: target.id,
                        subjectId: link.subjectId,
                        teacherProfileId: link.teacherProfileId,
                    },
                });
                copied++;
            }
            return NextResponse.json({ copied, from: source.name });
        }

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
        if (subject.grade !== klass.grade) {
            return new NextResponse('That subject belongs to a different grade', { status: 400 });
        }

        const item = await prisma.classSubject.upsert({
            where: { classId_subjectId: { classId, subjectId } },
            create: { classId, subjectId, teacherProfileId: teacherProfileId || null },
            update: { teacherProfileId: teacherProfileId ?? undefined },
            include: {
                class: { select: { name: true, grade: true } },
                subject: { select: { name: true, code: true, offering: true } },
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
        });

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
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;
    if (!canManageClasses(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await readJson<{ id?: string }>(req);
        if (body instanceof NextResponse) return body;
        if (!body.id) return new NextResponse('Missing id', { status: 400 });

        const existing = await prisma.classSubject.findFirst({
            where: { id: body.id, class: { schoolId: auth.schoolId! } },
            include: { subject: { select: { offering: true, name: true, grade: true } } },
        });
        if (!existing) return new NextResponse('Not found', { status: 404 });
        if (existing.subject.offering === 'COMPULSORY') {
            return new NextResponse(
                `${existing.subject.name} is compulsory for Grade ${existing.subject.grade}, so every class in the grade takes it. Mark it optional on the Subjects page if only some classes should offer it.`,
                { status: 400 },
            );
        }

        await prisma.classSubject.delete({ where: { id: body.id } });
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Error deleting class subject:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
