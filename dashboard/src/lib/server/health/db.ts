import "server-only";

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Local SQLite store for the Website Health module.
 *
 * Kept in its own file (separate from dashboard.sqlite3) because it holds a
 * different kind of data — scan/audit history and alert state, not Odoo KPI
 * cache. Never written back to Odoo; see CLAUDE.md "Website Health" scope.
 */

const DATA_DIR =
  process.env.DASHBOARD_DATA_DIR ?? path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "website-health.sqlite3");

let db: Database.Database | null = null;

export function getHealthDb(): Database.Database {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  seedDefaults(db);
  return db;
}

export function closeHealthDb(): void {
  db?.close();
  db = null;
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
  page TEXT,
  journey TEXT,
  title TEXT NOT NULL,
  description TEXT,
  evidence TEXT,
  suggested_investigation TEXT,
  baseline_value TEXT,
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

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL UNIQUE REFERENCES issues(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','acknowledged','snoozed','resolved')),
  snoozed_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alert_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journeys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS journey_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  journey_id INTEGER NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  last_status TEXT DEFAULT 'unknown' CHECK(last_status IN ('pass','fail','unknown')),
  last_checked_at TEXT,
  details TEXT,
  UNIQUE(journey_id, key)
);

CREATE TABLE IF NOT EXISTS performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL,
  measured_at TEXT NOT NULL DEFAULT (datetime('now')),
  performance INTEGER,
  accessibility INTEGER,
  seo INTEGER,
  best_practices INTEGER,
  source TEXT NOT NULL DEFAULT 'lighthouse'
);
CREATE INDEX IF NOT EXISTS idx_perf_page ON performance_metrics(page, measured_at);

CREATE TABLE IF NOT EXISTS audit_imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_path TEXT NOT NULL UNIQUE,
  audit_date TEXT NOT NULL,
  status TEXT,
  executive_summary TEXT,
  critical_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  health_score INTEGER,
  score_breakdown TEXT,
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
  screenshot_ref TEXT,
  change_status TEXT CHECK(change_status IN ('new','ongoing','resolved','regression','not_retested'))
);
CREATE INDEX IF NOT EXISTS idx_findings_fingerprint ON content_findings(fingerprint);
CREATE INDEX IF NOT EXISTS idx_findings_audit ON content_findings(audit_import_id);

CREATE TABLE IF NOT EXISTS screenshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL UNIQUE,
  page TEXT,
  viewport TEXT,
  taken_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL,
  scan_id INTEGER REFERENCES scans(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS critical_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  expected_value TEXT NOT NULL,
  unit TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS health_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function seedDefaults(database: Database.Database): void {
  const journeyCount = database.prepare("SELECT COUNT(*) as n FROM journeys").get() as { n: number };
  if (journeyCount.n === 0) {
    const insertJourney = database.prepare(
      "INSERT INTO journeys (key, name, description) VALUES (?, ?, ?)",
    );
    const insertStep = database.prepare(
      "INSERT INTO journey_steps (journey_id, step_order, key, name) VALUES (?, ?, ?, ?)",
    );
    const journeys: Array<{ key: string; name: string; description: string; steps: string[] }> = [
      {
        key: "education",
        name: "Education (Classroom)",
        description: "studiostonecreative.com/pages/classroom — school workshop enquiry path",
        steps: [
          "education_page_view",
          "education_inclass_click",
          "education_zoom_click",
          "education_teacherled_click",
          "education_booking_start",
          "education_form_submit",
        ],
      },
      {
        key: "wholesale",
        name: "Wholesale (Odoo)",
        description: "studiostone.odoo.com — B2B account request and login-gated catalog",
        steps: [
          "wholesale_page_view",
          "wholesale_contact_click",
          "wholesale_login_open",
        ],
      },
      {
        key: "ecommerce",
        name: "Ecommerce (Shopify)",
        description: "studiostonecreative.com — retail collection to checkout handoff",
        steps: ["product_view", "add_to_cart", "cart_view"],
      },
    ];
    for (const j of journeys) {
      const result = database.prepare(
        "INSERT OR IGNORE INTO journeys (key, name, description) VALUES (?, ?, ?)",
      ).run(j.key, j.name, j.description);
      let journeyId = result.lastInsertRowid as number;
      if (!journeyId) {
        journeyId = (database.prepare("SELECT id FROM journeys WHERE key = ?").get(j.key) as { id: number }).id;
      }
      j.steps.forEach((stepKey, idx) => {
        insertStep.run(journeyId, idx + 1, stepKey, stepKey.replace(/_/g, " "));
      });
    }
    void insertJourney; // reserved for future re-seeding needs
  }

  const factsCount = database.prepare("SELECT COUNT(*) as n FROM critical_facts").get() as { n: number };
  if (factsCount.n === 0) {
    const insertFact = database.prepare(
      "INSERT INTO critical_facts (key, label, expected_value, unit, notes) VALUES (?, ?, ?, ?, ?)",
    );
    insertFact.run(
      "wholesale_free_shipping_threshold",
      "Wholesale free shipping threshold (Europe)",
      "400",
      "CAD/USD",
      "Confirmed on studiostone.odoo.com 'Customer benefits' section as of 2026-09-02 audit — verify before editing.",
    );
    insertFact.run(
      "wholesale_free_shipping_threshold_domestic",
      "Wholesale free shipping threshold (CAD/USD)",
      "300",
      "CAD/USD",
      "Confirmed on studiostone.odoo.com 'Customer benefits' section as of 2026-09-02 audit — verify before editing.",
    );
  }
}
