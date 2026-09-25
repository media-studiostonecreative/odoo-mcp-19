import { NextRequest, NextResponse } from "next/server";
import { createSession, findPersonByCode, SESSION_COOKIE } from "@/lib/team/people";

export const dynamic = "force-dynamic";

// Codes carry ~60 bits of entropy, so guessing is already impractical; this
// just stops a script on the network from hammering the endpoint.
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function POST(request: NextRequest) {
  const key = clientKey(request);
  const now = Date.now();
  const entry = attempts.get(key);
  if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. Wait 15 minutes, then try again." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const person = typeof body?.code === "string" ? findPersonByCode(body.code) : null;
  if (!person) {
    attempts.set(key, entry && entry.resetAt > now ? { ...entry, count: entry.count + 1 } : { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.json({ error: "That code didn't match anyone on the team. Check it with whoever set you up." }, { status: 401 });
  }

  attempts.delete(key);
  const session = createSession(person.id);
  const response = NextResponse.json({ person: { id: person.id, name: person.name, role: person.role } });
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    // Shared over plain http on the local network, so a Secure cookie would never be sent back.
    secure: false,
    path: "/",
    expires: session.expiresAt,
  });
  return response;
}
