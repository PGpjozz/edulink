import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

/** All staff who can be assigned to teach a class or subject */
export async function GET() {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const users = await prisma.user.findMany({
            where: {
                schoolId: auth.schoolId!,
                isActive: true,
                teacherProfile: { isNot: null },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                teacherProfile: {
                    select: {
                        id: true,
                        department: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        });

        return NextResponse.json(
            users.map((u) => ({
                userId: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                role: u.role,
                teacherProfileId: u.teacherProfile!.id,
                department: u.teacherProfile?.department,
                label: `${u.firstName} ${u.lastName} (${u.role.replace('_', ' ')})`,
            }))
        );
    } catch (error) {
        console.error('Error fetching teaching staff:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
