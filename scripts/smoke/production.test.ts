import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateSaId, normalizeSaId } from '../../lib/sa-id';
import { validatePassword, generateTemporaryPassword } from '../../lib/password';
import { resolveAvailableDashboards, canAccessDashboardPath } from '../../lib/dashboard-roles';
import { canMessage, isMessagingRole } from '../../lib/messaging';
import { capsLevel, currentSchoolTerm } from '../../lib/caps';
import { createPasswordResetToken, verifyPasswordResetToken } from '../../lib/password-reset-token';
import { canManageAdmissions, hasPermission } from '../../lib/permissions';

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

describe('Password reset tokens', () => {
    it('creates and verifies a token', () => {
        process.env.NEXTAUTH_SECRET = 'test-secret-at-least-32-characters-long';
        const token = createPasswordResetToken('user-123');
        const verified = verifyPasswordResetToken(token);
        assert.deepEqual(verified, { userId: 'user-123' });
    });

    it('rejects invalid tokens', () => {
        process.env.NEXTAUTH_SECRET = 'test-secret-at-least-32-characters-long';
        assert.equal(verifyPasswordResetToken('not-a-valid-token'), null);
    });
});

describe('Messaging rules', () => {
    it('allows parent and staff messaging', () => {
        assert.equal(canMessage('PARENT', 'TEACHER'), true);
        assert.equal(canMessage('TEACHER', 'PARENT'), true);
    });

    it('allows learner and teacher messaging', () => {
        assert.equal(canMessage('LEARNER', 'TEACHER'), true);
        assert.equal(canMessage('TEACHER', 'LEARNER'), true);
    });

    it('blocks learner to learner', () => {
        assert.equal(canMessage('LEARNER', 'LEARNER'), false);
    });

    it('includes learner in messaging roles', () => {
        assert.equal(isMessagingRole('LEARNER'), true);
    });
});

describe('CAPS levels', () => {
    it('maps percentages to levels', () => {
        assert.equal(capsLevel(85).level, 7);
        assert.equal(capsLevel(55).level, 4);
        assert.equal(capsLevel(25).level, 1);
    });

    it('returns current school term label', () => {
        const term = currentSchoolTerm(new Date('2026-06-15'));
        assert.match(term.label, /Term 2, 2026/);
    });
});

describe('Permissions', () => {
    it('school owner has admissions permission', () => {
        assert.equal(canManageAdmissions({ role: 'SCHOOL_OWNER', permissions: [] }), true);
    });

    it('delegated finance permission works', () => {
        assert.equal(
            hasPermission({ role: 'TEACHER', permissions: ['MANAGE_FINANCE'] }, 'MANAGE_FINANCE'),
            true,
        );
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

    it('school owner can access principal paths', () => {
        assert.equal(
            canAccessDashboardPath('/dashboard/principal/finance', ['SCHOOL_OWNER']),
            true,
        );
    });
});
