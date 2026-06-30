import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { canManageAnnouncements } from '@/lib/permissions';
import { createNotifications, getAnnouncementRecipientIds } from '@/lib/notifications';
import { Prisma, type AnnouncementAudience } from '@prisma/client';

async function audienceWhere(auth: { userId: string; role: string; schoolId: string | null }): Promise<Prisma.AnnouncementWhereInput | null> {
    if (!auth.schoolId) return null;

    if (['SCHOOL_OWNER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'HOD', 'TEACHER'].includes(auth.role)) {
        return { schoolId: auth.schoolId };
    }

    if (auth.role === 'LEARNER') {
        const learner = await prisma.learnerProfile.findUnique({
            where: { userId: auth.userId },
            select: { grade: true, classId: true },
        });
        if (!learner) return { schoolId: auth.schoolId, id: { in: [] as string[] } };
        return {
            schoolId: auth.schoolId,
            OR: [
                { audience: 'SCHOOL' },
                { audience: 'LEARNERS' },
                { audience: 'GRADE', grade: learner.grade },
                ...(learner.classId ? [{ audience: 'CLASS' as const, classId: learner.classId }] : []),
            ],
        };
    }

    if (auth.role === 'PARENT') {
        const parent = await prisma.parentProfile.findUnique({
            where: { userId: auth.userId },
            select: { learnerIds: true },
        });
        const learners = await prisma.learnerProfile.findMany({
            where: { id: { in: parent?.learnerIds ?? [] } },
            select: { grade: true, classId: true },
        });
        const grades = [...new Set(learners.map((l) => l.grade))];
        const classIds = learners.map((l) => l.classId).filter(Boolean) as string[];
        return {
            schoolId: auth.schoolId,
            OR: [
                { audience: 'SCHOOL' },
                { audience: 'PARENTS' },
                ...(grades.length ? [{ audience: 'GRADE' as const, grade: { in: grades } }] : []),
                ...(classIds.length ? [{ audience: 'CLASS' as const, classId: { in: classIds } }] : []),
            ],
        };
    }

    return { schoolId: auth.schoolId, id: { in: [] as string[] } };
}

export async function GET() {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const where = await audienceWhere(auth);
    if (!where) return NextResponse.json([]);

    const now = new Date();
    const items = await prisma.announcement.findMany({
        where: {
            AND: [
                where,
                { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            ],
        },
        include: {
            author: { select: { firstName: true, lastName: true, role: true } },
            class: { select: { name: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 50,
    });

    return NextResponse.json(items);
}

export async function POST(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (!canManageAnnouncements(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await readJson<{
        title?: string;
        content?: string;
        audience?: AnnouncementAudience;
        grade?: string;
        classId?: string;
        expiresAt?: string;
    }>(req);
    if (body instanceof NextResponse) return body;

    if (!body.title?.trim() || !body.content?.trim()) {
        return NextResponse.json({ error: 'Title and content required' }, { status: 400 });
    }

    const audience = body.audience ?? 'SCHOOL';
    if (audience === 'GRADE' && !body.grade) {
        return NextResponse.json({ error: 'Grade required' }, { status: 400 });
    }
    if (audience === 'CLASS' && !body.classId) {
        return NextResponse.json({ error: 'Class required' }, { status: 400 });
    }

    const item = await prisma.announcement.create({
        data: {
            schoolId: auth.schoolId!,
            authorId: auth.userId,
            title: body.title.trim(),
            content: body.content.trim(),
            audience,
            grade: body.grade ?? null,
            classId: body.classId ?? null,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        },
    });

    await writeAuditLog({
        schoolId: auth.schoolId,
        userId: auth.userId,
        action: 'CREATE_ANNOUNCEMENT',
        entity: 'ANNOUNCEMENT',
        entityId: item.id,
        details: { title: item.title, audience },
    });

    const recipientIds = (await getAnnouncementRecipientIds(
        auth.schoolId!,
        audience,
        body.grade,
        body.classId,
    )).filter((id) => id !== auth.userId);

    if (recipientIds.length > 0) {
        await createNotifications(
            recipientIds.map((userId) => ({
                userId,
                title: 'New announcement',
                message: item.title,
                type: 'SYSTEM' as const,
                link: '/dashboard/announcements',
            })),
        );
    }

    return NextResponse.json(item);
}
