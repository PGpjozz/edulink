import crypto from 'crypto';
import { getNextAuthSecret } from './env';

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

function sign(payload: string): string {
    return crypto.createHmac('sha256', getNextAuthSecret()).update(payload).digest('hex');
}

/** Signed token allowing a provider to sign in as a school user (audited). */
export function createImpersonationToken(providerUserId: string, targetUserId: string): string {
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const payload = `${providerUserId}:${targetUserId}:${expiresAt}`;
    const signature = sign(payload);
    return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

export function verifyImpersonationToken(
    token: string,
): { providerUserId: string; targetUserId: string } | null {
    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf8');
        const lastColon = decoded.lastIndexOf(':');
        if (lastColon === -1) return null;

        const payload = decoded.slice(0, lastColon);
        const signature = decoded.slice(lastColon + 1);
        if (!signature || sign(payload) !== signature) return null;

        const [providerUserId, targetUserId, expiresRaw] = payload.split(':');
        const expiresAt = Number(expiresRaw);
        if (!providerUserId || !targetUserId || !expiresAt || Date.now() > expiresAt) return null;

        return { providerUserId, targetUserId };
    } catch {
        return null;
    }
}
