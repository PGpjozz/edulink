import type { AuthContext } from './api-auth';

export const PERMISSION_KEYS = [
    'MANAGE_USERS',
    'MANAGE_CLASSES',
    'MANAGE_FINANCE',
    'MANAGE_ADMISSIONS',
    'MANAGE_ASSETS',
    'VIEW_ANALYTICS',
    'MANAGE_ANNOUNCEMENTS',
    'MANAGE_HOMEWORK',
    'GRADE_LEARNERS',
    'VIEW_AUDIT_LOGS',
    'MANAGE_DEPARTMENTS',
    'MANAGE_SETTINGS',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const STAFF_ROLES = ['SCHOOL_OWNER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'HOD', 'TEACHER'] as const;
export const SCHOOL_ADMIN_ROLES = ['SCHOOL_OWNER', 'PRINCIPAL', 'SCHOOL_ADMIN'] as const;
export const TEACHING_ROLES = ['SCHOOL_OWNER', 'PRINCIPAL', 'HOD', 'TEACHER'] as const;
export const GRADING_ROLES = ['SCHOOL_OWNER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'HOD', 'TEACHER'] as const;

const ROLE_DEFAULT_PERMISSIONS: Record<string, PermissionKey[]> = {
    SCHOOL_OWNER: [...PERMISSION_KEYS],
    PRINCIPAL: [...PERMISSION_KEYS],
    SCHOOL_ADMIN: [
        'MANAGE_USERS',
        'MANAGE_CLASSES',
        'MANAGE_ADMISSIONS',
        'MANAGE_ASSETS',
        'VIEW_ANALYTICS',
        'MANAGE_ANNOUNCEMENTS',
        'MANAGE_HOMEWORK',
        'MANAGE_DEPARTMENTS',
    ],
    HOD: ['VIEW_ANALYTICS', 'MANAGE_ANNOUNCEMENTS', 'MANAGE_HOMEWORK', 'GRADE_LEARNERS'],
    TEACHER: ['MANAGE_HOMEWORK', 'GRADE_LEARNERS', 'MANAGE_ANNOUNCEMENTS'],
};

export function isStaffRole(role: string): boolean {
    return (STAFF_ROLES as readonly string[]).includes(role);
}

export function getEffectivePermissions(role: string, custom: string[] = []): Set<PermissionKey> {
    const defaults = ROLE_DEFAULT_PERMISSIONS[role] ?? [];
    const merged = new Set<PermissionKey>([...defaults, ...(custom as PermissionKey[])]);
    return merged;
}

export function hasPermission(
    auth: Pick<AuthContext, 'role' | 'permissions'>,
    permission: PermissionKey
): boolean {
    if (auth.role === 'PROVIDER') return true;
    return getEffectivePermissions(auth.role, auth.permissions).has(permission);
}

export function canManageSchool(role: string): boolean {
    return (SCHOOL_ADMIN_ROLES as readonly string[]).includes(role);
}

export function canManageDepartments(auth: Pick<AuthContext, 'role' | 'permissions'>): boolean {
    return canManageSchool(auth.role) || hasPermission(auth, 'MANAGE_DEPARTMENTS');
}

export function canManageUsers(auth: Pick<AuthContext, 'role' | 'permissions'>): boolean {
    return canManageSchool(auth.role) || hasPermission(auth, 'MANAGE_USERS');
}

export function canViewSchoolAnalytics(auth: Pick<AuthContext, 'role' | 'permissions'>): boolean {
    return canManageSchool(auth.role) || auth.role === 'HOD' || hasPermission(auth, 'VIEW_ANALYTICS');
}

export function canViewAuditLogs(auth: Pick<AuthContext, 'role' | 'permissions'>): boolean {
    return canManageSchool(auth.role) || hasPermission(auth, 'VIEW_AUDIT_LOGS');
}

export function canManageFinance(auth: Pick<AuthContext, 'role' | 'permissions'>): boolean {
    return canManageSchool(auth.role) || hasPermission(auth, 'MANAGE_FINANCE');
}

export function canManageAnnouncements(auth: Pick<AuthContext, 'role' | 'permissions'>): boolean {
    return isStaffRole(auth.role) && (canManageSchool(auth.role) || hasPermission(auth, 'MANAGE_ANNOUNCEMENTS'));
}

export function canManageHomework(auth: Pick<AuthContext, 'role' | 'permissions'>): boolean {
    return isStaffRole(auth.role) && (canManageSchool(auth.role) || hasPermission(auth, 'MANAGE_HOMEWORK'));
}

export function canTeach(role: string, hasTeacherProfile: boolean): boolean {
    return hasTeacherProfile && (TEACHING_ROLES as readonly string[]).includes(role);
}

export function canAccessTeacherDashboard(role: string, hasTeacherProfile: boolean): boolean {
    if (role === 'TEACHER') return true;
    return canTeach(role, hasTeacherProfile);
}

export function canAccessHodDashboard(role: string): boolean {
    return role === 'HOD';
}

export function canAccessPrincipalDashboard(role: string): boolean {
    return role === 'PRINCIPAL' || role === 'SCHOOL_ADMIN';
}

export function canAccessSchoolOwnerDashboard(role: string): boolean {
    return role === 'SCHOOL_OWNER';
}

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
    MANAGE_USERS: 'Manage users & invites',
    MANAGE_CLASSES: 'Manage classes & subjects',
    MANAGE_FINANCE: 'Finance & fees',
    MANAGE_ADMISSIONS: 'Admissions',
    MANAGE_ASSETS: 'Library & assets',
    VIEW_ANALYTICS: 'View analytics',
    MANAGE_ANNOUNCEMENTS: 'Post announcements',
    MANAGE_HOMEWORK: 'Assign homework',
    GRADE_LEARNERS: 'Grade learners',
    VIEW_AUDIT_LOGS: 'Audit logs',
    MANAGE_DEPARTMENTS: 'Departments & HOD',
    MANAGE_SETTINGS: 'School settings',
};
