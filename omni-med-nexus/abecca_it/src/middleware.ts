import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-cookie";

/**
 * Route guard for the IT app. Redirects unauthenticated page visits to /login.
 * Lightweight cookie-presence check; authoritative validation happens in the
 * data layer via getSessionUser(). Data APIs under /api are left untouched.
 */
const PUBLIC_PAGES = new Set(["/login"]);

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
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|fonts/).*)",
  ],
};
