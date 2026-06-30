import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateSaId, normalizeSaId } from '../../lib/sa-id';
import { validatePassword, generateTemporaryPassword } from '../../lib/password';

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
