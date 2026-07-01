import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            /** Primary role stored on the user account (used for API permissions). */
            role: string;
            primaryRole: string;
            /** Currently selected dashboard role. */
            activeRole: string;
            availableRoles: string[];
            schoolId: string | null;
            mustChangePassword: boolean;
            hasTeacherProfile: boolean;
            permissions: string[];
            impersonatedBy?: string;
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        role: string;
        schoolId: string | null;
        mustChangePassword?: boolean;
        hasTeacherProfile?: boolean;
        permissions?: string[];
        impersonatedBy?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        primaryRole: string;
        activeRole: string;
        availableRoles: string[];
        schoolId: string | null;
        mustChangePassword: boolean;
        hasTeacherProfile: boolean;
        permissions: string[];
        impersonatedBy?: string;
    }
}
