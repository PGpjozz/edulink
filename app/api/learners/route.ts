import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { canManageSchool } from '@/lib/permissions';
import { getStaffContext } from '@/lib/staff-context';

export async function GET() {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        if (canManageSchool(auth.role) || auth.role === 'HOD') {
            const ctx = await getStaffContext(auth);
            const where =
                auth.role === 'HOD' && !canManageSchool(auth.role)
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
                    : { user: { schoolId: auth.schoolId! } };

            const learners = await prisma.learnerProfile.findMany({
                where,
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true, idNumber: true } },
                    class: { select: { id: true, name: true, grade: true } },
                },
                orderBy: { user: { lastName: 'asc' } },
            });
            return NextResponse.json(learners);
        }

        const ctx = await getStaffContext(auth);
        if (ctx.learnerIds.length === 0) {
            return NextResponse.json([]);
        }

        const learners = await prisma.learnerProfile.findMany({
            where: { id: { in: ctx.learnerIds } },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true, idNumber: true } },
                class: { select: { id: true, name: true, grade: true } },
            },
            orderBy: { user: { lastName: 'asc' } },
        });

        return NextResponse.json(learners);
    } catch (error) {
        console.error('Error fetching learners:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
