import { NextResponse, type NextRequest } from "next/server";
import { findPersonBySession, SESSION_COOKIE } from "@/lib/team/people";

/**
 * Every page and API route requires a signed-in team member — the app is shared
 * over the local network, and its routes read Shopify data and change the
 * planner. Runs on the Node.js runtime so it can check the session in SQLite
 * rather than trusting a cookie's mere presence.
 */
export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/auth/login).*)"],
};

export function middleware(request: NextRequest) {
  const person = findPersonBySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (person) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Your sign-in has expired. Sign in again to continue." }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}
