// dashboard/src/lib/settings/criticalFacts.ts
import "server-only";

import { getHealthDb } from "../db";

export type CriticalFactStatus = "unverified" | "confirmed" | "mismatch";

export interface CriticalFact {
  id: number;
  description: string;
  expected_value: string;
  source_url: string | null;
  last_verified_date: string | null;
  status: CriticalFactStatus;
  notes: string | null;
  created_at: string;
}

export interface NewCriticalFact {
  description: string;
  expected_value: string;
  source_url?: string | null;
  notes?: string | null;
}

export function listCriticalFacts(): CriticalFact[] {
  return getHealthDb().prepare("SELECT * FROM critical_facts ORDER BY created_at DESC").all() as CriticalFact[];
}

export function createCriticalFact(data: NewCriticalFact): CriticalFact {
  const db = getHealthDb();
  const result = db
    .prepare(`INSERT INTO critical_facts (description, expected_value, source_url, notes) VALUES (@description, @expected_value, @source_url, @notes)`)
    .run({ ...data, source_url: data.source_url ?? null, notes: data.notes ?? null });
  return db.prepare("SELECT * FROM critical_facts WHERE id = ?").get(result.lastInsertRowid) as CriticalFact;
}

/** Marks a fact confirmed or mismatched as of today, via a manual eyeball check — not automated. */
export function verifyCriticalFact(id: number, status: Extract<CriticalFactStatus, "confirmed" | "mismatch">): CriticalFact | null {
  const db = getHealthDb();
  db.prepare("UPDATE critical_facts SET status = ?, last_verified_date = datetime('now') WHERE id = ?").run(status, id);
  return (db.prepare("SELECT * FROM critical_facts WHERE id = ?").get(id) as CriticalFact | undefined) ?? null;
}

export function deleteCriticalFact(id: number): boolean {
  const db = getHealthDb();
  const result = db.prepare("DELETE FROM critical_facts WHERE id = ?").run(id);
  return result.changes > 0;
}
