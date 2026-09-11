import "server-only";

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Local SQLite store for dashboard preferences (targets) only.
 *
 * Never used to persist business data pulled from Odoo — KPI results only
 * ever live in the in-memory cache (cache.ts). Targets set here are never
 * written back to Odoo; see `<odoo_safety>` in the project brief.
 */

const DATA_DIR =
  process.env.DASHBOARD_DATA_DIR ?? path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "dashboard.sqlite3");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS targets (
      key TEXT PRIMARY KEY,
      value REAL NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}
