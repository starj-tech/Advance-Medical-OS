import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-cookie";

/**
 * Route guard. Redirects unauthenticated visitors to /login for any page route.
 * This is a lightweight presence check (the cookie holds an opaque session
 * token); authoritative validation happens server-side in the data layer via
 * getSessionUser(). Data APIs under /api are left untouched for now.
 */
const PUBLIC_PAGES = new Set([
  "/",
  "/login",
  "/register",
  "/pricing",
  "/billing/return",
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api")) return NextResponse.next();
  if (PUBLIC_PAGES.has(pathname)) return NextResponse.next();

  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|fonts/).*)",
  ],
};
