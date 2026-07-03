import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateSaId, normalizeSaId } from '../../lib/sa-id';
import { validatePassword, generateTemporaryPassword } from '../../lib/password';
import { resolveAvailableDashboards, canAccessDashboardPath } from '../../lib/dashboard-roles';
import { canMessage, isMessagingRole } from '../../lib/messaging';
import { capsLevel, currentSchoolTerm } from '../../lib/caps';
import { createPasswordResetToken, verifyPasswordResetToken } from '../../lib/password-reset-token';
import { canManageAdmissions, hasPermission } from '../../lib/permissions';
import { calculateSchoolBill, getTierDefaultFee, getEffectiveMonthlyFee } from '../../lib/provider-pricing';
import { getTuitionFee, hasActiveTrial } from '../../lib/subscription';
import { createImpersonationToken, verifyImpersonationToken } from '../../lib/impersonation-token';

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
        // validatePassword returns an error message string when the password is rejected
        assert.equal(typeof validatePassword('password123'), 'string');
        assert.equal(typeof validatePassword('principal123'), 'string');
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

describe('Provider pricing', () => {
    it('uses school monthly fee for billing base', () => {
        const bill = calculateSchoolBill({ tier: 'SMALL', monthlyFee: 3000 }, 50);
        assert.equal(bill.baseAmount, 3000);
        assert.equal(bill.totalAmount, 3000);
        assert.equal(getTierDefaultFee('MEDIUM'), 5500);
    });

    it('treats legacy unset SaaS fee as tier default', () => {
        assert.equal(getEffectiveMonthlyFee({ tier: 'SMALL', monthlyFee: 1000 }), 2500);
        assert.equal(getEffectiveMonthlyFee({ tier: 'SMALL', monthlyFee: 0 }), 2500);
    });

    it('applies learner overage above tier limit', () => {
        const bill = calculateSchoolBill({ tier: 'SMALL', monthlyFee: 2500 }, 220);
        assert.equal(bill.extraLearners, 20);
        assert.equal(bill.extraAmount, 300);
        assert.equal(bill.totalAmount, 2800);
    });
});

describe('Tuition vs SaaS fees', () => {
    it('uses tuitionFee when set', () => {
        assert.equal(getTuitionFee({ tuitionFee: 2000 }), 2000);
        assert.equal(getTuitionFee({ tuitionFee: 0 }), 1500);
    });
});

describe('Subscription trial state', () => {
    it('requires a future trial end date to protect a trialing school from billing', () => {
        const now = new Date('2026-07-03T11:00:00.000Z');

        assert.equal(
            hasActiveTrial({ subscriptionStatus: 'TRIALING', trialEndsAt: '2026-07-04T11:00:00.000Z' }, now),
            true,
        );
        assert.equal(hasActiveTrial({ subscriptionStatus: 'TRIALING', trialEndsAt: null }, now), false);
        assert.equal(
            hasActiveTrial({ subscriptionStatus: 'TRIALING', trialEndsAt: '2026-07-02T11:00:00.000Z' }, now),
            false,
        );
    });
});

describe('Production database safety', () => {
    it('does not run Prisma db push during normal builds or main-branch pushes', () => {
        const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
        const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/db-sync.yml'), 'utf8');

        assert.doesNotMatch(packageJson.scripts.build, /prisma\s+db\s+push/);
        assert.doesNotMatch(workflow, /branches:\s*\[main\]/);
        assert.match(workflow, /workflow_dispatch:/);
        assert.match(workflow, /inputs:/);
    });

    it('backfills legacy schools with no trial end date to active subscriptions', () => {
        const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
        const migration = readFileSync(
            resolve(process.cwd(), 'prisma/migrations/20260701120000_subscription_fields/migration.sql'),
            'utf8',
        );

        assert.match(schema, /subscriptionStatus\s+SubscriptionStatus\s+@default\(ACTIVE\)/);
        assert.match(migration, /SET "subscriptionStatus" = 'ACTIVE'/);
        assert.match(migration, /"trialEndsAt" IS NULL/);
        assert.match(migration, /ALTER COLUMN "subscriptionStatus" SET DEFAULT 'ACTIVE'/);
    });
});

describe('Impersonation tokens', () => {
    it('creates and verifies provider impersonation token', () => {
        process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-for-smoke-tests-32chars';
        const token = createImpersonationToken('provider-1', 'user-2');
        const parsed = verifyImpersonationToken(token);
        assert.ok(parsed);
        assert.equal(parsed?.providerUserId, 'provider-1');
        assert.equal(parsed?.targetUserId, 'user-2');
    });
});
