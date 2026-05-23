import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_ACCESS: Record<string, string[]> = {
  "/dashboard":  ["admin", "creator", "recommender", "decider", "performer", "auditor", "approver"],
  "/approvals":  ["admin", "approver"],
  "/ledger":     ["admin", "auditor", "recommender", "decider", "creator", "approver", "performer"],
  "/audit-log":  ["admin", "auditor"],
  "/documents":  ["admin", "creator", "recommender", "decider", "performer", "auditor", "approver"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookie (we'll set this on login)
  const token = request.cookies.get("rapid_token")?.value;
  const role  = request.cookies.get("rapid_role")?.value;

  // Public routes — always allow
  if (pathname === "/login" || pathname === "/") {
    return NextResponse.next();
  }

  // No token — redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check role access for protected routes
  const matchedRoute = Object.keys(ROLE_ACCESS).find(route =>
    pathname.startsWith(route)
  );

  if (matchedRoute && role) {
    const allowed = ROLE_ACCESS[matchedRoute];
    if (!allowed.includes(role)) {
      // Redirect to dashboard with unauthorized flag
      return NextResponse.redirect(new URL("/dashboard?unauthorized=1", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
