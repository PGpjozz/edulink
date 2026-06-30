import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, writeAuditLog } from '@/lib/api-auth';
import { parseBody, serverError } from '@/lib/http';
import { canManageHomework } from '@/lib/permissions';
import { getStaffContext } from '@/lib/staff-context';

const createHomeworkSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional(),
    dueDate: z.string().datetime().or(z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date')),
    subjectId: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
    // Accept absolute URLs (Vercel Blob) or root-relative paths (local /api/files/... uploads).
    fileUrl: z
        .string()
        .trim()
        .max(2000)
        .refine((v) => /^https?:\/\//.test(v) || v.startsWith('/'), 'Invalid file URL')
        .optional(),
});

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const learnerId = searchParams.get('learnerId');

    try {
        if (auth.role === 'LEARNER') {
            const learner = await prisma.learnerProfile.findUnique({
                where: { userId: auth.userId },
                select: { id: true, classId: true, grade: true },
            });
            if (!learner) return NextResponse.json([]);

            const items = await prisma.homework.findMany({
                where: {
                    schoolId: auth.schoolId!,
                    OR: [
                        { classId: learner.classId },
                        { classId: null },
                    ],
                },
                include: {
                    subject: { select: { name: true } },
                    class: { select: { name: true } },
                    teacher: { select: { firstName: true, lastName: true } },
                    submissions: { where: { learnerId: learner.id }, take: 1 },
                },
                orderBy: { dueDate: 'asc' },
            });
            return NextResponse.json(items);
        }

        if (auth.role === 'PARENT') {
            const parent = await prisma.parentProfile.findUnique({
                where: { userId: auth.userId },
                select: { learnerIds: true },
            });
            const targetLearnerId = learnerId && parent?.learnerIds.includes(learnerId) ? learnerId : parent?.learnerIds[0];
            if (!targetLearnerId) return NextResponse.json([]);

            const learner = await prisma.learnerProfile.findUnique({
                where: { id: targetLearnerId },
                select: { id: true, classId: true, grade: true },
            });
            if (!learner) return NextResponse.json([]);

            const items = await prisma.homework.findMany({
                where: {
                    schoolId: auth.schoolId!,
                    OR: [{ classId: learner.classId }, { classId: null }],
                },
                include: {
                    subject: { select: { name: true } },
                    submissions: { where: { learnerId: learner.id }, take: 1 },
                },
                orderBy: { dueDate: 'desc' },
            });
            return NextResponse.json(items);
        }

        const ctx = await getStaffContext(auth);
        const where: Record<string, unknown> = { schoolId: auth.schoolId! };
        if (classId) where.classId = classId;
        else if (!['SCHOOL_OWNER', 'PRINCIPAL', 'SCHOOL_ADMIN'].includes(auth.role) && ctx.classIds.length > 0) {
            where.OR = [{ classId: { in: ctx.classIds } }, { teacherId: auth.userId }];
        }

        const items = await prisma.homework.findMany({
            where,
            include: {
                subject: { select: { name: true } },
                class: { select: { name: true, grade: true } },
                _count: { select: { submissions: true } },
            },
            orderBy: { dueDate: 'asc' },
        });

        return NextResponse.json(items);
    } catch (e) {
        console.error(e);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (!canManageHomework(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await parseBody(req, createHomeworkSchema);
    if (body instanceof NextResponse) return body;

    try {
        const item = await prisma.homework.create({
            data: {
                schoolId: auth.schoolId!,
                teacherId: auth.userId,
                title: body.title,
                description: body.description ?? null,
                dueDate: new Date(body.dueDate),
                subjectId: body.subjectId ?? null,
                classId: body.classId ?? null,
                fileUrl: body.fileUrl ?? null,
            },
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_HOMEWORK',
            entity: 'HOMEWORK',
            entityId: item.id,
            details: { title: item.title },
        });

        return NextResponse.json(item);
    } catch (e) {
        return serverError('homework-create', e);
    }
}
