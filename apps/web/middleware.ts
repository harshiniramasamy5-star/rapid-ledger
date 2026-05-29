import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_ACCESS: Record<string, string[]> = {
  "/dashboard":  ["admin", "creator", "recommender", "decision_owner", "performer", "viewer", "approver", "viewer"],
  "/approvals":  ["admin", "approver"],
  "/ledger":     ["admin", "viewer", "recommender", "decision_owner", "creator", "approver", "performer", "viewer"],
  "/audit-log":  ["admin", "viewer"],
  "/documents":  ["admin", "creator", "recommender", "decision_owner", "performer", "viewer", "approver", "viewer"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
      // Redirect to LOGIN not dashboard — prevents redirect loop
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
