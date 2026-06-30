import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { canManageSchool } from '@/lib/permissions';
import { canAccessClass } from '@/lib/staff-context';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: classId } = await params;

    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const klass = await prisma.class.findFirst({
            where: { id: classId, schoolId: auth.schoolId as string },
            select: { id: true }
        });

        if (!klass) {
            return new NextResponse('Class not found', { status: 404 });
        }

        if (auth.role === 'LEARNER') {
            const learnerProfile = await prisma.learnerProfile.findUnique({
                where: { userId: auth.userId },
                select: { classId: true }
            });
            if (!learnerProfile || learnerProfile.classId !== classId) {
                return new NextResponse('Forbidden', { status: 403 });
            }
        } else if (auth.role === 'PARENT') {
            const parentProfile = await prisma.parentProfile.findUnique({
                where: { userId: auth.userId },
                select: { learnerIds: true }
            });
            if (!parentProfile?.learnerIds?.length) {
                return new NextResponse('Forbidden', { status: 403 });
            }
            const childInClass = await prisma.learnerProfile.findFirst({
                where: { id: { in: parentProfile.learnerIds }, classId },
                select: { id: true }
            });
            if (!childInClass) {
                return new NextResponse('Forbidden', { status: 403 });
            }
        } else if (!(await canAccessClass(auth, classId))) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const learners = await prisma.learnerProfile.findMany({
            where: { classId },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        idNumber: true
                    }
                }
            }
        });

        const flattened = learners.map(l => ({
            id: l.id,
            firstName: l.user.firstName,
            lastName: l.user.lastName,
            email: l.user.email,
            idNumber: l.user.idNumber
        }));

        return NextResponse.json(flattened);
    } catch (error) {
        console.error('Error fetching class learners:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

// Enroll learners into this class. School admins / principals / owners only.
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: classId } = await params;

    const auth = await requireAuth({ schoolAdmin: true, requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<{ learnerProfileIds?: string[] }>(req);
    if (body instanceof NextResponse) return body;

    const ids = Array.isArray(body.learnerProfileIds) ? body.learnerProfileIds.filter(Boolean) : [];
    if (ids.length === 0) {
        return NextResponse.json({ error: 'No learners provided' }, { status: 400 });
    }

    try {
        const klass = await prisma.class.findFirst({
            where: { id: classId, schoolId: auth.schoolId as string },
            select: { id: true, grade: true },
        });
        if (!klass) return new NextResponse('Class not found', { status: 404 });

        // Only enroll learners from this school whose grade matches the class.
        const eligible = await prisma.learnerProfile.findMany({
            where: { id: { in: ids }, user: { schoolId: auth.schoolId as string }, grade: klass.grade },
            select: { id: true },
        });
        const eligibleIds = eligible.map((l) => l.id);
        const skipped = ids.length - eligibleIds.length;

        if (eligibleIds.length > 0) {
            await prisma.learnerProfile.updateMany({
                where: { id: { in: eligibleIds } },
                data: { classId },
            });
            await writeAuditLog({
                schoolId: auth.schoolId,
                userId: auth.userId,
                action: 'ENROLL_LEARNERS',
                entity: 'CLASS',
                entityId: classId,
                details: { count: eligibleIds.length },
            });
        }

        return NextResponse.json({ enrolled: eligibleIds.length, skipped });
    } catch (error) {
        console.error('Error enrolling learners:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

// Remove a learner from this class (clears their class assignment).
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: classId } = await params;

    const auth = await requireAuth({ schoolAdmin: true, requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<{ learnerProfileId?: string }>(req);
    if (body instanceof NextResponse) return body;
    if (!body.learnerProfileId) {
        return NextResponse.json({ error: 'learnerProfileId required' }, { status: 400 });
    }

    try {
        const result = await prisma.learnerProfile.updateMany({
            where: { id: body.learnerProfileId, classId, user: { schoolId: auth.schoolId as string } },
            data: { classId: null },
        });
        if (result.count === 0) {
            return NextResponse.json({ error: 'Learner not in this class' }, { status: 404 });
        }
        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'UNENROLL_LEARNER',
            entity: 'CLASS',
            entityId: classId,
            details: { learnerProfileId: body.learnerProfileId },
        });
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Error removing learner:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
