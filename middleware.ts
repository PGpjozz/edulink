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

        // Role-based protection
        if (path.startsWith("/admin") && token?.role !== "PROVIDER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        if (path.startsWith("/dashboard") && !token) {
            return NextResponse.redirect(new URL("/auth/signin", req.url));
        }

        // TODO: Add more granular role checks here as we build out feature routes
        // e.g. /school/[id]/... check if user belongs to school

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
        pages: {
            signIn: "/auth/signin",
        },
    }
);

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/admin/:path*",
        "/api/schools/:path*",
        // Exclude public assets
        "/((?!api/auth|_next/static|_next/image|favicon.ico).*)"
    ],
};
