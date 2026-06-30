// Lightweight in-memory fixed-window rate limiter.
//
// NOTE: state is per-process, so in a multi-instance / serverless deployment
// this is a best-effort baseline, not a global guarantee. For production-grade
// limiting back this with a shared store (e.g. Redis/Upstash). It is still
// valuable as a first line of defence against bursty abuse and brute force.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
    ok: boolean;
    remaining: number;
    retryAfterMs: number;
};

/**
 * Record a hit for `key` and report whether it is within `limit` per `windowMs`.
 * `now` is injectable for testing.
 */
export function rateLimit(
    key: string,
    limit: number,
    windowMs: number,
    now: number = Date.now()
): RateLimitResult {
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
    }

    if (existing.count >= limit) {
        return { ok: false, remaining: 0, retryAfterMs: existing.resetAt - now };
    }

    existing.count += 1;
    return { ok: true, remaining: limit - existing.count, retryAfterMs: 0 };
}

/** Test helper: clear all buckets. */
export function resetRateLimit(): void {
    buckets.clear();
}

/** Best-effort client IP from common proxy headers. */
export function getClientIp(req: Request): string {
    const xff = req.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]!.trim();
    return req.headers.get('x-real-ip') ?? 'unknown';
}
