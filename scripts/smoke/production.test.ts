import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateSaId, normalizeSaId } from '../../lib/sa-id';
import { validatePassword, generateTemporaryPassword } from '../../lib/password';
import { resolveAvailableDashboards, canAccessDashboardPath } from '../../lib/dashboard-roles';

describe('SA ID validation', () => {
    it('accepts a valid test ID', () => {
        const result = validateSaId('0801015001085');
        assert.equal(result.valid, true);
    });

    it('rejects wrong length', () => {
        const result = validateSaId('12345');
        assert.equal(result.valid, false);
    });

    it('normalizes spaces and dashes', () => {
        assert.equal(normalizeSaId('0801 0150 0108 5'), '0801015001085');
    });
});

describe('Password policy', () => {
    it('rejects weak default passwords', () => {
        assert.ok(validatePassword('password123'));
        assert.ok(validatePassword('principal123'));
    });

    it('accepts strong passwords', () => {
        assert.equal(validatePassword('MySecurePass2026!'), null);
    });

    it('generates temporary passwords', () => {
        const pw = generateTemporaryPassword();
        assert.ok(pw.length >= 12);
        assert.equal(validatePassword(pw), null);
    });
});

describe('Dashboard roles', () => {
    it('principal with teacher profile gets teacher dashboard', () => {
        const roles = resolveAvailableDashboards({
            primaryRole: 'PRINCIPAL',
            hasTeacherProfile: true,
            leadsDepartment: false,
        });
        assert.deepEqual(roles, ['PRINCIPAL', 'TEACHER']);
    });

    it('teacher leading a department gets HOD dashboard', () => {
        const roles = resolveAvailableDashboards({
            primaryRole: 'TEACHER',
            hasTeacherProfile: true,
            leadsDepartment: true,
        });
        assert.ok(roles.includes('TEACHER'));
        assert.ok(roles.includes('HOD'));
    });

    it('school owner can access principal paths', () => {
        assert.equal(
            canAccessDashboardPath('/dashboard/principal/finance', ['SCHOOL_OWNER']),
            true
        );
    });

    it('school owner gets principal dashboard in switcher', () => {
        const roles = resolveAvailableDashboards({
            primaryRole: 'SCHOOL_OWNER',
            hasTeacherProfile: false,
            leadsDepartment: false,
        });
        assert.deepEqual(roles, ['SCHOOL_OWNER', 'PRINCIPAL']);
    });

    it('school admin with teacher profile gets teacher dashboard', () => {
        const roles = resolveAvailableDashboards({
            primaryRole: 'SCHOOL_ADMIN',
            hasTeacherProfile: true,
            leadsDepartment: false,
        });
        assert.deepEqual(roles, ['SCHOOL_ADMIN', 'TEACHER']);
    });
});
