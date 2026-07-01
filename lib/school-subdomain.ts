import { BRAND_DEFAULTS } from './branding';

const RESERVED = new Set(['www', 'app', 'api', 'admin', 'auth', 'localhost']);

/** Base domain for multi-tenant subdomains (e.g. westview.brightcampus.co.za). */
const TENANT_ROOT = process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN ?? BRAND_DEFAULTS.tenantRootDomain;

/**
 * Resolve school subdomain from hostname or path.
 * Examples: westview.brightcampus.co.za → westview; westview.localhost → westview
 */
export function getSchoolSubdomainFromHost(hostname: string): string | null {
    const host = hostname.split(':')[0].toLowerCase();

    if (host === 'localhost' || host === '127.0.0.1') {
        return null;
    }

    const parts = host.split('.');
    if (parts.length < 2) return null;

    const rootParts = TENANT_ROOT.split('.');
    const matchesRoot =
        parts.length > rootParts.length &&
        parts.slice(-rootParts.length).join('.') === TENANT_ROOT;

    if (matchesRoot) {
        const sub = parts.slice(0, -rootParts.length).join('.');
        if (sub && !RESERVED.has(sub)) return sub;
    }

    // dev: westview.localhost
    if (parts.length === 2 && parts[1] === 'localhost') {
        const sub = parts[0];
        if (!RESERVED.has(sub)) return sub;
    }

    return null;
}

/** Subdomain for branding: hostname first, then ?school=, then default demo school. */
export function resolveSchoolSubdomain(
    hostname: string,
    searchParams?: URLSearchParams | { get: (k: string) => string | null },
): string {
    const fromHost = getSchoolSubdomainFromHost(hostname);
    if (fromHost) return fromHost;

    const fromQuery = searchParams?.get('school')?.trim().toLowerCase();
    if (fromQuery) return fromQuery;

    return process.env.NEXT_PUBLIC_DEFAULT_SCHOOL_SUBDOMAIN ?? 'westview';
}
