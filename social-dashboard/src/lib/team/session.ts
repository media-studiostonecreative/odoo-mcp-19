import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findPersonBySession, SESSION_COOKIE, type Person } from "./people";

/** Who is acting on this request, or null. Middleware already sent anyone who
 * hasn't picked a name to the name picker; route handlers call this for the name. */
export async function currentPerson(): Promise<Person | null> {
  const jar = await cookies();
  return findPersonBySession(jar.get(SESSION_COOKIE)?.value);
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Pick your name again to continue." }, { status: 401 });
}
