import "server-only";

import { createHash, randomBytes, randomInt } from "node:crypto";
import { getHealthDb } from "../db";

/**
 * Team access for LAN sharing: every person has their own access code, which
 * signs them in and tags everything they do with their name. Only SHA-256
 * hashes of codes and session tokens are stored. Codes are high-entropy random
 * strings (not user-chosen passwords), so a fast hash is sufficient.
 */

export type PersonRole = "admin" | "member";

export interface Person {
  id: number;
  name: string;
  role: PersonRole;
  created_at: string;
  revoked_at: string | null;
}

export const SESSION_COOKIE = "ss_session";
export const SESSION_DAYS = 30;

// No 0/O, 1/I/L, so a code read aloud or copied by hand survives.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Uppercases and strips spaces/dashes so "7kqm 2wxp-9hdt" matches "7KQM-2WXP-9HDT". */
export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function generateCode(): string {
  const chars = Array.from({ length: 12 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
}

const PERSON_COLUMNS = "id, name, role, created_at, revoked_at";

export function listPeople(): Person[] {
  return getHealthDb().prepare(`SELECT ${PERSON_COLUMNS} FROM people ORDER BY revoked_at IS NOT NULL, name COLLATE NOCASE`).all() as Person[];
}

export function countActiveAdmins(): number {
  return (getHealthDb().prepare("SELECT COUNT(*) AS n FROM people WHERE role = 'admin' AND revoked_at IS NULL").get() as { n: number }).n;
}

/** Returns the new person and their code. The code is only ever available here. */
export function createPerson(name: string, role: PersonRole = "member"): { person: Person; code: string } {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("A name is required.");
  const db = getHealthDb();
  const code = generateCode();
  const result = db.prepare("INSERT INTO people (name, role, code_hash) VALUES (?, ?, ?)").run(trimmed, role, sha256(normalizeCode(code)));
  const person = db.prepare(`SELECT ${PERSON_COLUMNS} FROM people WHERE id = ?`).get(result.lastInsertRowid) as Person;
  return { person, code };
}

/** Issues a fresh code and signs the person out everywhere; the old code stops working. */
export function resetCode(personId: number): string | null {
  const db = getHealthDb();
  const code = generateCode();
  const result = db.prepare("UPDATE people SET code_hash = ? WHERE id = ? AND revoked_at IS NULL").run(sha256(normalizeCode(code)), personId);
  if (result.changes === 0) return null;
  db.prepare("DELETE FROM sessions WHERE person_id = ?").run(personId);
  return code;
}

/** Revokes access and ends every session. Their name stays on what they wrote. */
export function revokePerson(personId: number): boolean {
  const db = getHealthDb();
  const result = db.prepare("UPDATE people SET revoked_at = datetime('now') WHERE id = ? AND revoked_at IS NULL").run(personId);
  db.prepare("DELETE FROM sessions WHERE person_id = ?").run(personId);
  return result.changes > 0;
}

export function findPersonByCode(code: string): Person | null {
  const normalized = normalizeCode(code);
  if (normalized.length !== 12) return null;
  const row = getHealthDb().prepare(`SELECT ${PERSON_COLUMNS} FROM people WHERE code_hash = ? AND revoked_at IS NULL`).get(sha256(normalized)) as Person | undefined;
  return row ?? null;
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
      `SELECT p.id, p.name, p.role, p.created_at, p.revoked_at
         FROM sessions s JOIN people p ON p.id = s.person_id
        WHERE s.token_hash = ? AND s.expires_at > ? AND p.revoked_at IS NULL`,
    )
    .get(sha256(token), new Date().toISOString()) as Person | undefined;
  return row ?? null;
}

export function deleteSession(token: string): void {
  getHealthDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}
