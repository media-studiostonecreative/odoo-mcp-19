import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getHealthDb } from "../db";

/**
 * Who's using the planner. There is no sign-in: anyone on the local network can
 * open it and types their name once per device; a session cookie remembers the
 * device from then on, so comments, edits and approvals carry their name.
 * It's an honour system — typing a name proves nothing — which is the
 * deliberate trade for a shared studio Wi-Fi.
 */

export interface Person {
  id: number;
  name: string;
  created_at: string;
}

export const SESSION_COOKIE = "ss_session";
/** Browsers cap cookie lifetime at about 400 days, so a device is remembered
 * "forever" by renewing its session whenever it's used (see refreshSession). */
export const SESSION_DAYS = 400;
const RENEW_WHEN_DAYS_LEFT = 365;
export const MAX_NAME_LENGTH = 60;

export class PersonNameError extends Error {}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function listPeople(): Person[] {
  return getHealthDb().prepare("SELECT id, name, created_at FROM people ORDER BY name COLLATE NOCASE").all() as Person[];
}

/** The person with this name (ignoring case and extra spaces), created if new. */
export function findOrCreatePerson(name: unknown): Person {
  const trimmed = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!trimmed) throw new PersonNameError("Enter your name.");
  if (trimmed.length > MAX_NAME_LENGTH) throw new PersonNameError(`Keep names under ${MAX_NAME_LENGTH} characters.`);
  const db = getHealthDb();
  const existing = db.prepare("SELECT id, name, created_at FROM people WHERE name = ? COLLATE NOCASE").get(trimmed) as Person | undefined;
  if (existing) return existing;
  const result = db.prepare("INSERT INTO people (name) VALUES (?)").run(trimmed);
  return db.prepare("SELECT id, name, created_at FROM people WHERE id = ?").get(result.lastInsertRowid) as Person;
}

export function createSession(personId: number): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  getHealthDb().prepare("INSERT INTO sessions (token_hash, person_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), personId, expiresAt.toISOString());
  return { token, expiresAt };
}

export function findPersonBySession(token: string | undefined | null): Person | null {
  if (!token) return null;
  const row = getHealthDb()
    .prepare(
      `SELECT p.id, p.name, p.created_at
         FROM sessions s JOIN people p ON p.id = s.person_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(sha256(token), new Date().toISOString()) as Person | undefined;
  return row ?? null;
}

/**
 * Pushes an active session's expiry back to a full SESSION_DAYS once it has
 * less than RENEW_WHEN_DAYS_LEFT to go — at most about once a month per device,
 * rather than a write on every request. Returns the new expiry, or null when
 * nothing changed.
 */
export function refreshSession(token: string): Date | null {
  const renewBefore = new Date(Date.now() + RENEW_WHEN_DAYS_LEFT * 86_400_000).toISOString();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const result = getHealthDb()
    .prepare("UPDATE sessions SET expires_at = ? WHERE token_hash = ? AND expires_at > ? AND expires_at < ?")
    .run(expiresAt.toISOString(), sha256(token), new Date().toISOString(), renewBefore);
  return result.changes > 0 ? expiresAt : null;
}

/** One place for the cookie settings, so creating and renewing a session agree. */
export function sessionCookie(token: string, expires: Date) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    // Served over plain http on the local network, so a Secure cookie would never be sent back.
    secure: false,
    path: "/",
    expires,
  };
}

export function deleteSession(token: string): void {
  getHealthDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}
