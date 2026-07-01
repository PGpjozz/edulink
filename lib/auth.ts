import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { getNextAuthSecret } from "./env";
import { verifyImpersonationToken } from "./impersonation-token";
import {
    type DashboardRole,
    defaultDashboardRole,
    resolveAvailableDashboards,
} from "./dashboard-roles";

async function authorizeImpersonation(impersonationToken: string) {
    const parsed = verifyImpersonationToken(impersonationToken);
    if (!parsed) throw new Error("Invalid or expired impersonation link");

    const provider = await prisma.user.findUnique({
        where: { id: parsed.providerUserId },
        select: { id: true, role: true, isActive: true },
    });
    if (!provider?.isActive || provider.role !== 'PROVIDER') {
        throw new Error("Invalid impersonation session");
    }

    const user = await prisma.user.findUnique({
        where: { id: parsed.targetUserId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            schoolId: true,
            isActive: true,
            mustChangePassword: true,
            permissions: true,
            teacherProfile: { select: { id: true } },
            departmentsLed: { select: { id: true } },
            school: { select: { isActive: true, name: true } },
        },
    });

    if (!user || !user.isActive || user.role === 'PROVIDER') {
        throw new Error("Cannot impersonate this user");
    }

    return {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email || '',
        role: user.role,
        schoolId: user.schoolId,
        mustChangePassword: user.mustChangePassword,
        hasTeacherProfile: !!user.teacherProfile,
        permissions: user.permissions ?? [],
        impersonatedBy: provider.id,
    };
}

async function loadRoleContext(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            role: true,
            schoolId: true,
            mustChangePassword: true,
            permissions: true,
            teacherProfile: { select: { id: true } },
            departmentsLed: { select: { id: true } },
        },
    });

    if (!user) return null;

    const primaryRole = user.role;
    const hasTeacherProfile = Boolean(user.teacherProfile);
    const availableRoles = resolveAvailableDashboards({
        primaryRole,
        hasTeacherProfile,
        leadsDepartment: user.departmentsLed.length > 0,
    });
    const activeRole = defaultDashboardRole(primaryRole, availableRoles);

    return {
        primaryRole,
        activeRole,
        availableRoles,
        schoolId: user.schoolId,
        mustChangePassword: user.mustChangePassword,
        hasTeacherProfile,
        permissions: user.permissions ?? [],
    };
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                identifier: { label: "Email or ID Number", type: "text" },
                password: { label: "Password", type: "password" },
                impersonationToken: { label: "Impersonation Token", type: "text" },
            },
            async authorize(credentials) {
                if (credentials?.impersonationToken) {
                    return authorizeImpersonation(credentials.impersonationToken);
                }

                if (!credentials?.identifier || !credentials?.password) {
                    throw new Error("Missing credentials");
                }

                const { password } = credentials;
                const normalizedIdentifier = credentials.identifier.trim();

                const user = await prisma.user.findFirst({
                    where: normalizedIdentifier.includes('@')
                        ? { email: { equals: normalizedIdentifier, mode: 'insensitive' } }
                        : { idNumber: normalizedIdentifier },
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        password: true,
                        role: true,
                        schoolId: true,
                        isActive: true,
                        mustChangePassword: true,
                        permissions: true,
                        teacherProfile: { select: { id: true } },
                        departmentsLed: { select: { id: true } },
                        school: { select: { isActive: true, name: true } },
                    }
                });

                if (!user || !user.isActive || !user.password) {
                    throw new Error("Invalid credentials");
                }

                if (user.schoolId && user.school && !user.school.isActive) {
                    throw new Error("School account is inactive. Contact your administrator.");
                }

                const passwordMatch = await bcrypt.compare(password, user.password);
                if (!passwordMatch) {
                    throw new Error("Invalid credentials");
                }

                return {
                    id: user.id,
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email || '',
                    role: user.role,
                    schoolId: user.schoolId,
                    mustChangePassword: user.mustChangePassword,
                    hasTeacherProfile: !!user.teacherProfile,
                    permissions: user.permissions ?? [],
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user?.id) {
                const ctx = await loadRoleContext(user.id);
                if (ctx) {
                    token.primaryRole = ctx.primaryRole;
                    token.activeRole = ctx.activeRole;
                    token.availableRoles = ctx.availableRoles;
                    token.role = ctx.primaryRole;
                    token.schoolId = ctx.schoolId;
                    token.mustChangePassword = ctx.mustChangePassword;
                    token.hasTeacherProfile = ctx.hasTeacherProfile;
                    token.permissions = ctx.permissions;
                }
                token.id = user.id;
                if ((user as { impersonatedBy?: string }).impersonatedBy) {
                    token.impersonatedBy = (user as { impersonatedBy?: string }).impersonatedBy;
                }
            } else if (!token.availableRoles && token.id) {
                const ctx = await loadRoleContext(token.id as string);
                if (ctx) {
                    token.primaryRole = ctx.primaryRole;
                    token.activeRole = token.activeRole ?? ctx.activeRole;
                    token.availableRoles = ctx.availableRoles;
                    token.role = ctx.primaryRole;
                    token.hasTeacherProfile = ctx.hasTeacherProfile;
                    token.permissions = ctx.permissions;
                }
            }

            if (trigger === 'update' && session?.activeRole) {
                const requested = session.activeRole as DashboardRole;
                const available = (token.availableRoles as DashboardRole[]) ?? [];
                if (available.includes(requested)) {
                    token.activeRole = requested;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.primaryRole = (token.primaryRole as string) ?? (token.role as string);
                session.user.activeRole = (token.activeRole as string) ?? session.user.primaryRole;
                session.user.availableRoles = (token.availableRoles as string[]) ?? [session.user.primaryRole];
                session.user.role = session.user.primaryRole;
                session.user.schoolId = token.schoolId as string | null;
                session.user.mustChangePassword = Boolean(token.mustChangePassword);
                session.user.hasTeacherProfile = Boolean(token.hasTeacherProfile);
                session.user.permissions = (token.permissions as string[]) ?? [];
                session.user.impersonatedBy = token.impersonatedBy as string | undefined;
            }
            return session;
        }
    },
    pages: {
        signIn: '/auth/signin',
        error: '/auth/error',
    },
    session: {
        strategy: "jwt",
    },
    secret: getNextAuthSecret(),
};
