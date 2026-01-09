import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Use global singleton
// const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                identifier: { label: "Email or ID Number", type: "text" },
                password: { label: "Password", type: "password" },
                schoolId: { label: "School ID (Optional)", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.identifier || !credentials?.password) {
                    throw new Error("Missing credentials");
                }

                const { identifier, password } = credentials;

                const USE_MOCK = false;

                if (USE_MOCK) {
                    const { MOCK_USERS } = await import('./mock-data');
                    let mockUser;

                    if (identifier.includes('@')) {
                        mockUser = MOCK_USERS.find(u => u.email === identifier);
                    } else {
                        mockUser = MOCK_USERS.find(u => u.idNumber === identifier);
                    }

                    if (mockUser && mockUser.password === password) {
                        return {
                            id: mockUser.id,
                            name: `${mockUser.firstName} ${mockUser.lastName}`,
                            email: mockUser.email || '',
                            role: mockUser.role,
                            schoolId: mockUser.schoolId
                        };
                    }
                    // Fallback to error if mock user not found
                    throw new Error("Invalid credentials (Mock Mode)");
                }

                // Determine if identifier is an email (basic check)
                const isEmail = identifier.includes("@");

                let user;

                if (isEmail) {
                    // Find by email
                    user = await prisma.user.findUnique({
                        where: { email: identifier }
                    });
                } else {
                    // Find by ID number
                    user = await prisma.user.findUnique({
                        where: { idNumber: identifier }
                    });
                }

                if (!user || !user.password) {
                    throw new Error("Invalid credentials");
                }

                // Verify password
                const isValid = await bcrypt.compare(password, user.password);

                if (!isValid) {
                    throw new Error("Invalid credentials");
                }

                if (!user.isActive) {
                    throw new Error("Account is inactive");
                }

                // Return user object for the session
                return {
                    id: user.id,
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    role: user.role,
                    schoolId: user.schoolId
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
    secret: process.env.NEXTAUTH_SECRET,
};
