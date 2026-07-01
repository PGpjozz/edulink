import crypto from 'crypto';
import { getNextAuthSecret } from './env';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function sign(payload: string): string {
    return crypto.createHmac('sha256', getNextAuthSecret()).update(payload).digest('hex');
}

export function createPasswordResetToken(userId: string): string {
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const payload = `${userId}:${expiresAt}`;
    const signature = sign(payload);
    return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

export function verifyPasswordResetToken(token: string): { userId: string } | null {
    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf8');
        const lastColon = decoded.lastIndexOf(':');
        if (lastColon === -1) return null;

        const payload = decoded.slice(0, lastColon);
        const signature = decoded.slice(lastColon + 1);
        if (!signature || sign(payload) !== signature) return null;

        const [userId, expiresRaw] = payload.split(':');
        const expiresAt = Number(expiresRaw);
        if (!userId || !expiresAt || Date.now() > expiresAt) return null;

        return { userId };
    } catch {
        return null;
    }
}
