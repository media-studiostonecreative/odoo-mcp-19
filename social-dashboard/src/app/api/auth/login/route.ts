import { NextRequest, NextResponse } from "next/server";
import { createSession, findOrCreatePerson, PersonNameError, sessionCookie } from "@/lib/team/people";

export const dynamic = "force-dynamic";

/** Sets the name for this device, once. No password: the planner is open to the local network. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  let person;
  try {
    person = findOrCreatePerson(body?.name);
  } catch (error) {
    if (error instanceof PersonNameError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
  const session = createSession(person.id);
  const response = NextResponse.json({ person: { id: person.id, name: person.name } });
  response.cookies.set(sessionCookie(session.token, session.expiresAt));
  return response;
}
