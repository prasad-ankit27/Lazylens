import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "lazylens_session";
const SESSION_SECRET_STRING =
  process.env.SESSION_SECRET ||
  "lazylens-secure-session-key-fallback-must-be-configured-in-production-env-32bytes";
const ENCODED_KEY = new TextEncoder().encode(SESSION_SECRET_STRING);

// Safe redirect helper to prevent open-redirect vulnerabilities
function getSafeRedirectUrl(target: string | null, baseUrl: string): URL {
  if (target && target.startsWith("/") && !target.startsWith("//")) {
    return new URL(target, baseUrl);
  }
  return new URL("/", baseUrl);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public static assets and system routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/demo") ||
    pathname.includes(".") // e.g. favicon.ico, images, fonts
  ) {
    return NextResponse.next();
  }

  // 2. Read and verify session token
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, ENCODED_KEY, {
        algorithms: ["HS256"],
      });
      if (payload && payload.userId) {
        isAuthenticated = true;
      }
    } catch {
      isAuthenticated = false;
    }
  }

  const isAuthPage = pathname === "/login" || pathname === "/register";

  // 3. Authenticated user visiting /login or /register -> Redirect to Dashboard
  if (isAuthPage && isAuthenticated) {
    const fromParam = req.nextUrl.searchParams.get("from");
    const safeUrl = getSafeRedirectUrl(fromParam, req.url);
    return NextResponse.redirect(safeUrl);
  }

  // 4. Unauthenticated user visiting protected pages -> Redirect to /login
  if (!isAuthPage && !isAuthenticated) {
    // If it's a private API route, return JSON 401 instead of redirecting
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const loginUrl = new URL("/login", req.url);
    // Add safe 'from' query parameter if not root
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
