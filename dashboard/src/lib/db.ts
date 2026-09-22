import "server-only";

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Local SQLite store for the Website Health dashboard. Never written back
 * to Odoo or Shopify — this is local alert/scan/audit state only.
 */

let db: Database.Database | null = null;
let currentDbPath: string | null = null;

export function getHealthDb(): Database.Database {
  const dataDir = process.env.DASHBOARD_DATA_DIR ?? path.resolve(process.cwd(), "data");
  const dbPath = path.join(dataDir, "website-health.sqlite3");

  // If the data directory changed, close the old database
  if (currentDbPath !== dbPath) {
    if (db) {
      db.close();
      db = null;
    }
    currentDbPath = dbPath;
  }

  if (db) return db;
  mkdirSync(dataDir, { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export function closeHealthDb(): void {
  db?.close();
  db = null;
  currentDbPath = null;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_type TEXT NOT NULL CHECK(scan_type IN ('quick','full')),
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  total_checks INTEGER NOT NULL DEFAULT 0,
  completed_checks INTEGER NOT NULL DEFAULT 0,
  passed_checks INTEGER NOT NULL DEFAULT 0,
  failed_checks INTEGER NOT NULL DEFAULT 0,
  warned_checks INTEGER NOT NULL DEFAULT 0,
  current_label TEXT,
  error TEXT
);

CREATE TABLE IF NOT EXISTS checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL,
  category TEXT NOT NULL,
  site TEXT NOT NULL CHECK(site IN ('retail','wholesale')),
  page TEXT,
  label TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pass','fail','warn')),
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_checks_scan ON checks(scan_id);
CREATE INDEX IF NOT EXISTS idx_checks_type ON checks(check_type);

CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL CHECK(severity IN ('critical','warning','info')),
  category TEXT NOT NULL,
  site TEXT NOT NULL CHECK(site IN ('retail','wholesale')),
  page TEXT,
  title TEXT NOT NULL,
  description TEXT,
  evidence TEXT,
  current_value TEXT,
  frequency INTEGER NOT NULL DEFAULT 1,
  first_detected TEXT NOT NULL DEFAULT (datetime('now')),
  last_detected TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','acknowledged','snoozed','resolved')),
  snoozed_until TEXT
);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);
CREATE INDEX IF NOT EXISTS idx_issues_site ON issues(site);

CREATE TABLE IF NOT EXISTS alert_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_path TEXT NOT NULL UNIQUE,
  audit_date TEXT NOT NULL,
  status TEXT,
  executive_summary TEXT,
  critical_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  health_score INTEGER,
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_import_id INTEGER REFERENCES audit_imports(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  priority TEXT,
  category TEXT,
  page TEXT,
  title TEXT NOT NULL,
  body TEXT,
  recommendation TEXT,
  change_status TEXT CHECK(change_status IN ('new','ongoing','resolved','regression','not_retested'))
);
CREATE INDEX IF NOT EXISTS idx_findings_fingerprint ON content_findings(fingerprint);
CREATE INDEX IF NOT EXISTS idx_findings_audit ON content_findings(audit_import_id);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sent_date TEXT NOT NULL,
  subject TEXT NOT NULL,
  recipients INTEGER NOT NULL DEFAULT 0,
  opens INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_date ON email_campaigns(sent_date);

CREATE TABLE IF NOT EXISTS social_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  posted_date TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('instagram','facebook','tiktok','pinterest')),
  post_type TEXT,
  caption TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  link_clicks INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_social_posts_date ON social_posts(posted_date);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);

-- Small manually-maintained list of "must stay true" facts (a price, a phone number, a
-- policy line) that someone should periodically eyeball against the live site/Odoo/Shopify.
-- No automated checking — this is a watchlist, not a monitor.
CREATE TABLE IF NOT EXISTS critical_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  expected_value TEXT NOT NULL,
  source_url TEXT,
  last_verified_date TEXT,
  status TEXT NOT NULL DEFAULT 'unverified' CHECK(status IN ('unverified','confirmed','mismatch')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
