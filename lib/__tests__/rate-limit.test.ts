import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, resetRateLimit } from '../rate-limit';

describe('rateLimit', () => {
    beforeEach(() => resetRateLimit());

    it('allows up to the limit then blocks within the window', () => {
        const key = 'user-a';
        const limit = 3;
        const windowMs = 1000;
        const t0 = 1_000_000;

        expect(rateLimit(key, limit, windowMs, t0).ok).toBe(true);
        expect(rateLimit(key, limit, windowMs, t0).ok).toBe(true);
        expect(rateLimit(key, limit, windowMs, t0).ok).toBe(true);

        const blocked = rateLimit(key, limit, windowMs, t0);
        expect(blocked.ok).toBe(false);
        expect(blocked.retryAfterMs).toBeGreaterThan(0);
    });

    it('resets after the window elapses', () => {
        const key = 'user-b';
        const t0 = 1_000_000;

        expect(rateLimit(key, 1, 1000, t0).ok).toBe(true);
        expect(rateLimit(key, 1, 1000, t0).ok).toBe(false);
        // After the window passes, the counter resets.
        expect(rateLimit(key, 1, 1000, t0 + 1001).ok).toBe(true);
    });

    it('tracks keys independently', () => {
        const t0 = 1_000_000;
        expect(rateLimit('x', 1, 1000, t0).ok).toBe(true);
        expect(rateLimit('y', 1, 1000, t0).ok).toBe(true);
        expect(rateLimit('x', 1, 1000, t0).ok).toBe(false);
    });
});
