type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Drop expired buckets so the map doesn't grow unbounded with unique IPs. */
function pruneExpired(now: number) {
    for (const [key, bucket] of buckets) {
        if (now >= bucket.resetAt) buckets.delete(key);
    }
}

const PRUNE_THRESHOLD = 10_000;

export function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now();
    if (buckets.size > PRUNE_THRESHOLD) pruneExpired(now);
    const bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSec: 0 };
    }

    if (bucket.count >= limit) {
        return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
    }

    bucket.count += 1;
    return { allowed: true, retryAfterSec: 0 };
}

export function getClientIp(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.headers.get('x-real-ip') ?? 'unknown';
}
