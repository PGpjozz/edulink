import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        // Public paths handled by matcher, but double check
        if (path.startsWith("/api/auth")) {
            return NextResponse.next();
        }

        // Unauthenticated redirects
        if (!token) {
            if (path.startsWith("/admin") || path.startsWith("/dashboard/provider")) {
                return NextResponse.redirect(new URL(`/auth/provider-signin?callbackUrl=${encodeURIComponent(path)}`, req.url));
            }

            if (path.startsWith("/dashboard")) {
                return NextResponse.redirect(new URL("/auth/signin", req.url));
            }
        }

        // Role-based protection
        if (path.startsWith("/admin") && token?.role !== "PROVIDER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        if (path.startsWith("/dashboard/provider") && token?.role !== "PROVIDER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        // TODO: Add more granular role checks here as we build out feature routes
        // e.g. /school/[id]/... check if user belongs to school

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: () => true,
        },
        pages: {
            signIn: "/auth/provider-signin",
        },
    }
);

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/admin/:path*",
        "/api/schools/:path*"
    ],
};
