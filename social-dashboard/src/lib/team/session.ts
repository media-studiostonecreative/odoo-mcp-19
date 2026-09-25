import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findPersonBySession, SESSION_COOKIE, type Person } from "./people";

/** The signed-in person for this request, or null. Middleware already turned
 * away anonymous requests; route handlers call this to know *who* is acting. */
export async function currentPerson(): Promise<Person | null> {
  const jar = await cookies();
  return findPersonBySession(jar.get(SESSION_COOKIE)?.value);
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Your sign-in has expired. Sign in again to continue." }, { status: 401 });
}

export function forbidden(message = "Only a team admin can do that."): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
