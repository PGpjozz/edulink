/** Central BrightCampus product branding — import for UI, emails, and metadata. */
export const BRAND = {
    name: 'BrightCampus',
    shortName: 'BrightCampus',
    tagline: 'Brighter Schools. Smarter Management.',
    mission:
        'To empower schools with intelligent, secure, and easy-to-use technology that simplifies administration, enhances teaching, and improves learner success.',
    vision:
        "To become Africa's leading school management platform, connecting schools, educators, parents, and learners through innovative technology.",
    description:
        'School management platform for African schools — learners, teachers, parents, billing, and academics in one place.',
    providerPortalTitle: 'BrightCampus Provider Portal',
    studyAdvisorLabel: 'BrightCampus Study Advisor',
    dataHubLabel: 'BrightCampus Data Hub',
    /** Full horizontal logo (icon + wordmark + tagline) */
    logoUrl: '/brightcampus-logo.png',
    /** Square mark for sidebar, favicons, and compact UI */
    logoIconUrl: '/brightcampus-icon.png',
} as const;

export const BRAND_DEFAULTS = {
    /** Fallback when school name is not loaded */
    appName: BRAND.name,
    /** Sidebar / avatar initials when no school logo */
    initials: 'BC',
    /** Default multi-tenant root domain */
    tenantRootDomain: 'brightcampus.co.za',
    /** SaaS provider bootstrap email (dev) */
    providerEmail: 'provider@brightcampus.com',
    /** Dev route secrets */
    seedSecret: 'brightcampus-seed-2026',
    setupSecret: 'brightcampus-setup-2026',
    billingCronSecret: 'brightcampus-billing-cron-2026',
} as const;

export function brandEmailFrom(): string {
    return process.env.EMAIL_FROM ?? `${BRAND.name} <onboarding@resend.dev>`;
}
