import { describe, it, expect } from 'vitest';
import {
    hasPermission,
    canManageHomework,
    canManageSchool,
    canViewSchoolAnalytics,
    isStaffRole,
    getEffectivePermissions,
} from '../permissions';

describe('permissions', () => {
    it('PROVIDER implicitly has every permission', () => {
        expect(hasPermission({ role: 'PROVIDER', permissions: [] }, 'MANAGE_USERS')).toBe(true);
        expect(hasPermission({ role: 'PROVIDER', permissions: [] }, 'VIEW_AUDIT_LOGS')).toBe(true);
    });

    it('TEACHER lacks MANAGE_USERS by default but has MANAGE_HOMEWORK', () => {
        expect(hasPermission({ role: 'TEACHER', permissions: [] }, 'MANAGE_USERS')).toBe(false);
        expect(hasPermission({ role: 'TEACHER', permissions: [] }, 'MANAGE_HOMEWORK')).toBe(true);
    });

    it('custom permissions are merged with role defaults', () => {
        const perms = getEffectivePermissions('TEACHER', ['MANAGE_USERS']);
        expect(perms.has('MANAGE_USERS')).toBe(true);
        expect(perms.has('MANAGE_HOMEWORK')).toBe(true);
    });

    it('canManageHomework requires a staff role', () => {
        expect(canManageHomework({ role: 'TEACHER', permissions: [] })).toBe(true);
        expect(canManageHomework({ role: 'PRINCIPAL', permissions: [] })).toBe(true);
        expect(canManageHomework({ role: 'PARENT', permissions: [] })).toBe(false);
        // Non-staff cannot gain homework management even with a custom grant.
        expect(canManageHomework({ role: 'LEARNER', permissions: ['MANAGE_HOMEWORK'] })).toBe(false);
    });

    it('canManageSchool is limited to admin roles', () => {
        expect(canManageSchool('SCHOOL_OWNER')).toBe(true);
        expect(canManageSchool('PRINCIPAL')).toBe(true);
        expect(canManageSchool('SCHOOL_ADMIN')).toBe(true);
        expect(canManageSchool('TEACHER')).toBe(false);
        expect(canManageSchool('PARENT')).toBe(false);
    });

    it('HOD can view analytics; TEACHER cannot by default', () => {
        expect(canViewSchoolAnalytics({ role: 'HOD', permissions: [] })).toBe(true);
        expect(canViewSchoolAnalytics({ role: 'TEACHER', permissions: [] })).toBe(false);
    });

    it('isStaffRole classifies roles correctly', () => {
        expect(isStaffRole('PRINCIPAL')).toBe(true);
        expect(isStaffRole('HOD')).toBe(true);
        expect(isStaffRole('LEARNER')).toBe(false);
        expect(isStaffRole('PROVIDER')).toBe(false);
    });
});
