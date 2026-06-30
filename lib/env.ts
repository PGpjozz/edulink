const PRODUCTION = process.env.NODE_ENV === 'production';

export function isProduction(): boolean {
    return PRODUCTION;
}

/** Dev-only HTTP routes (setup, seed, debug). Disabled in production unless explicitly enabled. */
export function isDevRouteEnabled(): boolean {
    if (!PRODUCTION) return true;
    return process.env.ENABLE_DEV_ROUTES === 'true';
}

export function getNextAuthSecret(): string {
    const secret = process.env.NEXTAUTH_SECRET;
    if (secret && secret.length >= 32) return secret;
    if (PRODUCTION) {
        throw new Error('NEXTAUTH_SECRET must be set to at least 32 characters in production');
    }
    return secret || 'dev-only-secret-not-for-production-use!!';
}

export function isPayFastConfigured(): boolean {
    return Boolean(
        process.env.PAYFAST_MERCHANT_ID &&
        process.env.PAYFAST_MERCHANT_KEY &&
        process.env.PAYFAST_PASSPHRASE
    );
}

/** Payment simulation is only allowed outside production. */
export function isPaymentSimulationAllowed(): boolean {
    return !PRODUCTION && process.env.ALLOW_PAYMENT_SIMULATION !== 'false';
}

export const PRIVACY_POLICY_VERSION = '2026-01';
