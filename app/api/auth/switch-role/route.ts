import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readJson } from '@/lib/api-auth';
import {
    DASHBOARD_ROLES,
    type DashboardRole,
    dashboardHomePath,
    resolveAvailableDashboards,
} from '@/lib/dashboard-roles';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await readJson<{ role?: string }>(req);
    if (body instanceof NextResponse) return body;

    const requested = body.role as DashboardRole;
    if (!requested || !DASHBOARD_ROLES.includes(requested)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            role: true,
            teacherProfile: { select: { id: true } },
            departmentsLed: { select: { id: true } },
        },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const availableRoles = resolveAvailableDashboards({
        primaryRole: user.role,
        hasTeacherProfile: Boolean(user.teacherProfile),
        leadsDepartment: user.departmentsLed.length > 0,
    });

    if (!availableRoles.includes(requested)) {
        return NextResponse.json({ error: 'Role not available for this account' }, { status: 403 });
    }

    return NextResponse.json({
        ok: true,
        activeRole: requested,
        redirectTo: dashboardHomePath(requested),
    });
}
