import crypto from 'crypto';
import { isProduction } from './env';

export function validatePassword(password: string): string | null {
    if (!password || password.length < 8) {
        return 'Password must be at least 8 characters';
    }
    if (isProduction() && password.length < 10) {
        return 'Password must be at least 10 characters';
    }
    if (/password123|principal123|changeme/i.test(password)) {
        return 'Please choose a stronger password';
    }
    return null;
}

export function generateTemporaryPassword(): string {
    return crypto.randomBytes(10).toString('base64url') + 'A1!';
}
