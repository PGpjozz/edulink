import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson } from '@/lib/api-auth';
import bcrypt from 'bcryptjs';
import { validatePassword } from '@/lib/password';
import { getTierDefaultFee, type BillingTier } from '@/lib/provider-pricing';
import { sendEmail, onboardWelcomeEmailHtml } from '@/lib/email';
import { BRAND_DEFAULTS } from '@/lib/branding';
import { trialEndDate } from '@/lib/subscription';

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function slugifySubdomain(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<any>(req);
        if (body instanceof NextResponse) return body;
        const {
            schoolName,
            tier,
            monthlyFee,
            contactEmail,
            subdomain,
            principalFirstName,
            principalLastName,
            principalEmail,
            principalPassword,
            ownerFirstName,
            ownerLastName,
            ownerEmail,
            ownerPassword,
        } = body;

        if (
            !schoolName ||
            !tier ||
            !contactEmail ||
            !principalFirstName ||
            !principalLastName ||
            !principalEmail ||
            !principalPassword
        ) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const tierKey = tier as BillingTier;
        const monthlyFeeNumber =
            monthlyFee === undefined || monthlyFee === null || monthlyFee === ''
                ? getTierDefaultFee(tierKey)
                : Number(monthlyFee);

        if (!Number.isFinite(monthlyFeeNumber) || monthlyFeeNumber < 0) {
            return NextResponse.json({ error: 'Invalid monthlyFee' }, { status: 400 });
        }

        let subdomainValue: string | undefined;
        if (subdomain?.trim()) {
            subdomainValue = slugifySubdomain(subdomain);
            if (!subdomainValue) {
                return NextResponse.json({ error: 'Invalid subdomain' }, { status: 400 });
            }
            const clash = await prisma.school.findUnique({ where: { subdomain: subdomainValue } });
            if (clash) {
                return NextResponse.json({ error: 'Subdomain already in use' }, { status: 400 });
            }
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: principalEmail },
        });

        if (existingUser) {
            return NextResponse.json({ error: 'Principal email already exists' }, { status: 400 });
        }

        const principalPasswordError = validatePassword(principalPassword);
        if (principalPasswordError) {
            return NextResponse.json({ error: principalPasswordError }, { status: 400 });
        }

        if (ownerPassword) {
            const ownerPasswordError = validatePassword(ownerPassword);
            if (ownerPasswordError) {
                return NextResponse.json({ error: ownerPasswordError }, { status: 400 });
            }
        }

        const hashedPassword = await bcrypt.hash(principalPassword, 10);
        const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

        const result = await prisma.$transaction(async (tx: TxClient) => {
            const school = await tx.school.create({
                data: {
                    name: schoolName,
                    tier: tierKey,
                    monthlyFee: monthlyFeeNumber,
                    contactEmail,
                    subdomain: subdomainValue,
                    isActive: true,
                    gradesOffered: ['8', '9', '10', '11', '12'],
                    subscriptionStatus: 'TRIALING',
                    trialEndsAt: trialEndDate(),
                },
            });

            let ownerId: string | undefined;

            if (ownerEmail && ownerPassword) {
                const existingOwner = await tx.user.findUnique({ where: { email: ownerEmail } });
                if (existingOwner) {
                    throw new Error('OWNER_EMAIL_EXISTS');
                }
                const owner = await tx.user.create({
                    data: {
                        email: ownerEmail,
                        password: await bcrypt.hash(ownerPassword, 10),
                        firstName: ownerFirstName?.trim() || 'School',
                        lastName: ownerLastName?.trim() || 'Owner',
                        role: 'SCHOOL_OWNER',
                        schoolId: school.id,
                        isActive: true,
                    },
                });
                ownerId = owner.id;
                await tx.school.update({
                    where: { id: school.id },
                    data: { ownerId: owner.id },
                });
            }

            const principal = await tx.user.create({
                data: {
                    email: principalEmail,
                    password: hashedPassword,
                    firstName: principalFirstName,
                    lastName: principalLastName,
                    role: 'PRINCIPAL',
                    schoolId: school.id,
                    isActive: true,
                },
            });

            await tx.auditLog.create({
                data: {
                    schoolId: school.id,
                    userId: auth.userId,
                    action: 'ONBOARD_SCHOOL',
                    entity: 'SCHOOL',
                    entityId: school.id,
                    details: {
                        schoolName,
                        principalEmail,
                        tier,
                        subdomain: subdomainValue,
                    },
                },
            });

            return { school, principal, ownerId };
        });

        const principalEmailResult = await sendEmail({
            to: principalEmail,
            subject: `Welcome to ${schoolName} on BrightCampus`,
            html: onboardWelcomeEmailHtml({
                schoolName,
                role: 'principal',
                email: principalEmail,
                tempPassword: principalPassword,
                signInUrl: `${baseUrl}/auth/signin`,
                firstName: principalFirstName,
            }),
        });

        let ownerEmailSent = false;
        if (ownerEmail && ownerPassword) {
            const ownerMail = await sendEmail({
                to: ownerEmail,
                subject: `Welcome — ${schoolName} school owner account`,
                html: onboardWelcomeEmailHtml({
                    schoolName,
                    role: 'school owner',
                    email: ownerEmail,
                    tempPassword: ownerPassword,
                    signInUrl: `${baseUrl}/auth/signin`,
                    firstName: ownerFirstName,
                }),
            });
            ownerEmailSent = ownerMail.sent;
        }

        return NextResponse.json({
            success: true,
            school: result.school,
            principal: {
                id: result.principal.id,
                email: result.principal.email,
                welcomeEmailSent: principalEmailResult.sent,
            },
            ...(result.ownerId
                ? { owner: { id: result.ownerId, email: ownerEmail, welcomeEmailSent: ownerEmailSent } }
                : {}),
            applyUrl: subdomainValue
                ? `https://${subdomainValue}.${BRAND_DEFAULTS.tenantRootDomain}/apply`
                : null,
        });
    } catch (error) {
        console.error('Error onboarding school:', error);
        if (error instanceof Error && error.message === 'OWNER_EMAIL_EXISTS') {
            return NextResponse.json({ error: 'Owner email already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to onboard school' }, { status: 500 });
    }
}
