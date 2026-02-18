import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                identifier: { label: "Email or ID Number", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                console.log('NextAuth received credentials:', credentials);
                
                if (!credentials?.identifier || !credentials?.password) {
                    throw new Error("Missing credentials");
                }

                const { identifier, password } = credentials;

                // Use mock mode only
                const { MOCK_USERS } = await import('./mock-data');
                let mockUser;

                if (identifier.includes('@')) {
                    mockUser = MOCK_USERS.find(u => u.email === identifier);
                } else {
                    mockUser = MOCK_USERS.find(u => u.idNumber === identifier);
                }

                console.log('Mock user found:', mockUser ? { id: mockUser.id, email: mockUser.email, role: mockUser.role } : null);

                if (mockUser && mockUser.password === password) {
                    console.log('Authentication successful');
                    return {
                        id: mockUser.id,
                        name: `${mockUser.firstName} ${mockUser.lastName}`,
                        email: mockUser.email || '',
                        role: mockUser.role,
                        schoolId: mockUser.schoolId,
                        membershipId: mockUser.membershipId
                    };
                }
                
                console.log('Authentication failed - throwing error');
                throw new Error("Invalid credentials");
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
                token.membershipId = user.membershipId;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.schoolId = token.schoolId as string | null;
                session.user.membershipId = token.membershipId as string;
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
