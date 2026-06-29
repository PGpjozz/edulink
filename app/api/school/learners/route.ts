import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { getStaffContext } from '@/lib/staff-context';
import { canManageSchool } from '@/lib/permissions';

/** Scoped learner list for teachers, HODs, and admins */
export async function GET() {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const ctx = await getStaffContext(auth);

        if (!canManageSchool(auth.role) && auth.role !== 'HOD' && auth.role !== 'TEACHER' && !auth.hasTeacherProfile) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const where =
            canManageSchool(auth.role)
                ? { user: { schoolId: auth.schoolId! } }
                : auth.role === 'HOD'
                  ? {
                        user: { schoolId: auth.schoolId! },
                        OR: [
                            { id: { in: ctx.learnerIds } },
                            {
                                class: {
                                    classSubjects: {
                                        some: { subject: { departmentId: { in: ctx.departmentIdsLed } } },
                                    },
                                },
                            },
                        ],
                    }
                  : { id: { in: ctx.learnerIds } };

        const learners = await prisma.learnerProfile.findMany({
            where,
            include: {
                user: { select: { firstName: true, lastName: true, idNumber: true, email: true } },
                class: { select: { name: true, grade: true } },
            },
            orderBy: { user: { lastName: 'asc' } },
        });

        return NextResponse.json(learners);
    } catch (error) {
        console.error('Error fetching school learners:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
