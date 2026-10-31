import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { canManageUsers } from '@/lib/permissions';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;
    if (!canManageUsers(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const body = await readJson<{
            firstName?: string;
            lastName?: string;
            email?: string | null;
            isActive?: boolean;
            classId?: string | null;
            alsoTeaches?: boolean;
        }>(req);
        if (body instanceof NextResponse) return body;

        const user = await prisma.user.findFirst({
            where: { id, schoolId: auth.schoolId as string },
            select: {
                id: true,
                role: true,
                learnerProfile: { select: { id: true } },
                teacherProfile: {
                    select: {
                        id: true,
                        _count: { select: { managedClasses: true, assignedSubjects: true, classSubjects: true } },
                    },
                },
            },
        });
        if (!user) return new NextResponse('User not found', { status: 404 });
        if (user.id === auth.userId && body.isActive === false) {
            return new NextResponse('You cannot deactivate your own account', { status: 400 });
        }

        const firstName = body.firstName?.trim();
        const lastName = body.lastName?.trim();
        const email = typeof body.email === 'string' ? body.email.trim() : undefined;
        const canAlsoTeach = ['PRINCIPAL', 'SCHOOL_ADMIN', 'SCHOOL_OWNER', 'HOD'].includes(user.role);

        if (typeof body.alsoTeaches === 'boolean' && canAlsoTeach) {
            if (body.alsoTeaches) {
                await prisma.teacherProfile.upsert({
                    where: { userId: user.id },
                    create: { userId: user.id },
                    update: {},
                });
            } else if (user.teacherProfile) {
                const counts = user.teacherProfile._count;
                if (counts.managedClasses + counts.assignedSubjects + counts.classSubjects > 0) {
                    return new NextResponse('Remove this person’s classes and subjects before turning teaching off', { status: 400 });
                }
                await prisma.teacherProfile.delete({ where: { id: user.teacherProfile.id } });
            }
        }

        if (user.role === 'LEARNER' && body.classId !== undefined && user.learnerProfile) {
            if (!body.classId) {
                await prisma.learnerProfile.update({
                    where: { id: user.learnerProfile.id },
                    data: { classId: null },
                });
            } else {
                const klass = await prisma.class.findFirst({
                    where: { id: body.classId, schoolId: auth.schoolId as string },
                    select: { id: true, grade: true },
                });
                if (!klass) return new NextResponse('Class not found', { status: 400 });
                await prisma.learnerProfile.update({
                    where: { id: user.learnerProfile.id },
                    data: { classId: klass.id, grade: klass.grade },
                });
            }
        }

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
                ...(firstName ? { firstName } : {}),
                ...(lastName ? { lastName } : {}),
                ...(user.role !== 'LEARNER' && email !== undefined ? { email: email || null } : {}),
                ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
            },
            select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'UPDATE_USER',
            entity: 'USER',
            entityId: user.id,
            details: { role: user.role, isActive: updated.isActive },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating user:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
