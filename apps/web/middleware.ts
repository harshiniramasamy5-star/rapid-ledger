import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Roles that may access each route prefix
// Derived from ROLE_PERMISSIONS in apps/api/src/middleware/permissions.ts
const ROLE_ACCESS: Record<string, string[]> = {
  "/dashboard":  ["admin", "creator", "recommender", "performer", "viewer", "approver"],
  "/approvals":  ["admin", "approver"],
  "/ledger":     ["admin", "viewer", "recommender", "creator", "approver", "performer"],
  "/audit-log":  ["admin", "viewer", "creator", "approver", "recommender", "performer"],
  "/documents":  ["admin", "creator", "recommender", "performer", "viewer", "approver"],
  "/admin":      ["admin"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("rapid_token")?.value;
  const role  = request.cookies.get("rapid_role")?.value;

  if (pathname === "/login" || pathname === "/register" || pathname === "/" || pathname.startsWith("/signup") || pathname.startsWith("/verify-email") || pathname.startsWith("/join/")) return NextResponse.next();
  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  // Enforce MFA setup: until rapid_mfa=1, only the TOTP setup page is reachable
  const mfa = request.cookies.get("rapid_mfa")?.value;
  if (mfa !== "1" && !pathname.startsWith("/settings/totp")) {
    return NextResponse.redirect(new URL("/settings/totp?required=1", request.url));
  }

  const matchedRoute = Object.keys(ROLE_ACCESS).find(route =>
    pathname.startsWith(route)
  );

  if (matchedRoute && role) {
    if (!ROLE_ACCESS[matchedRoute].includes(role)) {
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
