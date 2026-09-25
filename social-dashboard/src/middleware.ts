import { NextResponse, type NextRequest } from "next/server";
import { findPersonBySession, refreshSession, SESSION_COOKIE, sessionCookie } from "@/lib/team/people";

/**
 * No sign-in — anyone on the local network can use the planner — but every
 * page and API route needs to know who's acting, so comments and changes carry
 * a name. A device that hasn't given a name yet goes to the name page; one that
 * has is remembered for good, its session renewed as it keeps being used.
 * Runs on the Node.js runtime so it can look the session up in SQLite.
 */
export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/auth/login).*)"],
};

export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const person = findPersonBySession(token);
  if (person && token) {
    const response = NextResponse.next();
    const renewed = refreshSession(token);
    if (renewed) response.cookies.set(sessionCookie(token, renewed));
    return response;
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Pick your name again to continue." }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}
