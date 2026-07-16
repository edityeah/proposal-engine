import { NextResponse, type NextRequest } from "next/server";

// Lightweight edge gate: redirect to /login when no Auth.js session cookie is
// present. This is a fast pre-filter only — the authoritative checks live in
// every page (auth() + redirect) and API route (auth() + 401). We avoid
// importing the DB-backed auth() here so the middleware stays Edge-safe.
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export function middleware(req: NextRequest) {
  // Local dev escape hatch: DEV_NO_AUTH disables the session gate entirely.
  // Hard-gated to non-production so it can never open up the prod gate.
  if (process.env.DEV_NO_AUTH === "1" && process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  const isPublic = pathname.startsWith("/login") || pathname.startsWith("/api/auth");
  if (isPublic) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((c) => req.cookies.has(c));
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals AND any static file in /public (anything with an
  // extension, e.g. /logo.png) — otherwise the gate redirects assets to /login.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
