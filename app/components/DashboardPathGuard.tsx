'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
    type DashboardRole,
    canAccessDashboardPath,
    dashboardHomePath,
} from '@/lib/dashboard-roles';

/** Redirects users who navigate to a dashboard they have not switched into. */
export default function DashboardPathGuard() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (status !== 'authenticated' || !session?.user) return;
        if (session.user.mustChangePassword) return;

        const available = (session.user.availableRoles ?? [session.user.primaryRole]) as DashboardRole[];
        const activeRole = (session.user.activeRole ?? session.user.primaryRole) as DashboardRole;

        if (!canAccessDashboardPath(pathname, available)) {
            router.replace(dashboardHomePath(activeRole));
            return;
        }

        const required = pathname.startsWith('/dashboard/teacher')
            ? 'TEACHER'
            : pathname.startsWith('/dashboard/hod')
              ? 'HOD'
              : pathname.startsWith('/dashboard/principal')
                ? 'PRINCIPAL'
                : pathname.startsWith('/dashboard/school-owner')
                  ? 'SCHOOL_OWNER'
                  : null;

        if (!required) return;

        const activeMatches =
            activeRole === required ||
            (required === 'PRINCIPAL' &&
                (activeRole === 'SCHOOL_ADMIN' || activeRole === 'SCHOOL_OWNER'));

        if (!activeMatches && available.includes(required as DashboardRole)) {
            router.replace(dashboardHomePath(activeRole));
        }
    }, [session, status, pathname, router]);

    return null;
}
