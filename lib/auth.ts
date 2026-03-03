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

                const { identifier, password } = credentials;

                const user = await prisma.user.findFirst({
                    where: identifier.includes('@')
                        ? { email: identifier }
                        : { idNumber: identifier },
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        password: true,
                        role: true,
                        schoolId: true,
                        isActive: true,
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
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.schoolId = user.schoolId;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.schoolId = token.schoolId as string | null;
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
    secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development-change-in-production',
};
