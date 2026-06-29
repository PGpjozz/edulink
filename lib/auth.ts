import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                identifier: { label: "Email or ID Number", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
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
                    }
                });

                if (!user || !user.isActive || !user.password) {
                    throw new Error("Invalid credentials");
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
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.schoolId = user.schoolId;
                token.mustChangePassword = user.mustChangePassword ?? false;
                token.hasTeacherProfile = user.hasTeacherProfile ?? false;
                token.permissions = user.permissions ?? [];
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.schoolId = token.schoolId as string | null;
                session.user.mustChangePassword = Boolean(token.mustChangePassword);
                session.user.hasTeacherProfile = Boolean(token.hasTeacherProfile);
                session.user.permissions = (token.permissions as string[]) ?? [];
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
    // No insecure hardcoded fallback: NextAuth requires a secret in production
    // and will throw if it is missing, which is the desired fail-fast behaviour.
    // In development it auto-generates an ephemeral secret.
    secret: process.env.NEXTAUTH_SECRET,
};
