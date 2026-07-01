export const DASHBOARD_ROLES = [
    'PROVIDER',
    'SCHOOL_OWNER',
    'PRINCIPAL',
    'SCHOOL_ADMIN',
    'HOD',
    'TEACHER',
    'LEARNER',
    'PARENT',
] as const;

export type DashboardRole = (typeof DASHBOARD_ROLES)[number];

export const DASHBOARD_ROLE_LABELS: Record<DashboardRole, string> = {
    PROVIDER: 'Provider',
    SCHOOL_OWNER: 'School Owner',
    PRINCIPAL: 'Principal',
    SCHOOL_ADMIN: 'School Admin',
    HOD: 'Head of Department',
    TEACHER: 'Teacher',
    LEARNER: 'Learner',
    PARENT: 'Parent',
};

export function resolveAvailableDashboards(input: {
    primaryRole: string;
    hasTeacherProfile: boolean;
    leadsDepartment: boolean;
}): DashboardRole[] {
    const roles = new Set<DashboardRole>();
    const primary = input.primaryRole as DashboardRole;

    if (DASHBOARD_ROLES.includes(primary)) {
        roles.add(primary);
    }

    if (input.leadsDepartment && primary !== 'HOD') {
        roles.add('HOD');
    }

    if (input.hasTeacherProfile && primary !== 'TEACHER') {
        roles.add('TEACHER');
    }

    return DASHBOARD_ROLES.filter((r) => roles.has(r));
}

export function defaultDashboardRole(
    primaryRole: string,
    availableRoles: DashboardRole[]
): DashboardRole {
    const primary = primaryRole as DashboardRole;
    if (availableRoles.includes(primary)) return primary;
    return availableRoles[0] ?? 'TEACHER';
}

export function dashboardHomePath(role: DashboardRole): string {
    switch (role) {
        case 'PROVIDER':
            return '/dashboard/provider';
        case 'SCHOOL_OWNER':
            return '/dashboard/school-owner';
        case 'PRINCIPAL':
        case 'SCHOOL_ADMIN':
            return '/dashboard/principal';
        case 'HOD':
            return '/dashboard/hod';
        case 'TEACHER':
            return '/dashboard/teacher';
        case 'LEARNER':
            return '/dashboard/learner';
        case 'PARENT':
            return '/dashboard/parent';
        default:
            return '/dashboard';
    }
}

const SHARED_PREFIXES = [
    '/dashboard/messages',
    '/dashboard/announcements',
    '/dashboard/change-password',
    '/dashboard/payment',
];

export function pathRequiredDashboard(pathname: string): DashboardRole | 'SHARED' | null {
    if (SHARED_PREFIXES.some((p) => pathname.startsWith(p))) return 'SHARED';
    if (pathname.startsWith('/dashboard/provider')) return 'PROVIDER';
    if (pathname.startsWith('/dashboard/school-owner')) return 'SCHOOL_OWNER';
    if (pathname.startsWith('/dashboard/principal')) return 'PRINCIPAL';
    if (pathname.startsWith('/dashboard/hod')) return 'HOD';
    if (pathname.startsWith('/dashboard/teacher')) return 'TEACHER';
    if (pathname.startsWith('/dashboard/learner')) return 'LEARNER';
    if (pathname.startsWith('/dashboard/parent')) return 'PARENT';
    if (pathname === '/dashboard') return null;
    return null;
}

export function canAccessDashboardPath(
    pathname: string,
    availableRoles: DashboardRole[]
): boolean {
    const required = pathRequiredDashboard(pathname);
    if (required === null || required === 'SHARED') return true;

    if (required === 'PRINCIPAL') {
        return (
            availableRoles.includes('PRINCIPAL') ||
            availableRoles.includes('SCHOOL_ADMIN') ||
            availableRoles.includes('SCHOOL_OWNER')
        );
    }

    return availableRoles.includes(required);
}

export function roleForNav(activeRole: DashboardRole, primaryRole: string): string {
    if (activeRole === 'PRINCIPAL' && primaryRole === 'SCHOOL_ADMIN') {
        return 'SCHOOL_ADMIN';
    }
    return activeRole;
}
