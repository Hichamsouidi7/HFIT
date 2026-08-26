import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";

/**
 * The app is on the public internet, so everything is behind the password by
 * default. Only the login screen, the login endpoint and the Health-sync webhook
 * (which carries its own secret token) are reachable without a session.
 */
const PUBLIC_PATHS = ["/login", "/api/login", "/api/health/sync"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  if (await verifyToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  // API calls get a clean 401 instead of an HTML redirect they cannot parse.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  // Skip Next internals and static assets, otherwise the PWA icons and the
  // manifest would sit behind the login wall and the install prompt would break.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|sw.js).*)"],
};
