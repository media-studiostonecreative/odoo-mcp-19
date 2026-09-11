import "server-only";

import { getHealthDb } from "./db";

export interface CriticalFact {
  id: number;
  key: string;
  label: string;
  expected_value: string;
  unit: string | null;
  notes: string | null;
  updated_at: string;
}

export function listCriticalFacts(): CriticalFact[] {
  const db = getHealthDb();
  return db.prepare("SELECT * FROM critical_facts ORDER BY label ASC").all() as CriticalFact[];
}

export function updateCriticalFact(id: number, expectedValue: string, notes?: string): void {
  const db = getHealthDb();
  db.prepare(
    `UPDATE critical_facts SET expected_value = ?, notes = COALESCE(?, notes), updated_at = datetime('now') WHERE id = ?`,
  ).run(expectedValue, notes ?? null, id);
}

export function getSetting(key: string, fallback: string | null = null): string | null {
  const db = getHealthDb();
  const row = db.prepare("SELECT value FROM health_settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string): void {
  const db = getHealthDb();
  db.prepare(
    `INSERT INTO health_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(key, value);
}

export function listSettings(): Record<string, string> {
  const db = getHealthDb();
  const rows = db.prepare("SELECT key, value FROM health_settings").all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
