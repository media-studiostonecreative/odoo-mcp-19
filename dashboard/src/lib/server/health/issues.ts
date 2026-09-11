import "server-only";

import { getHealthDb } from "./db";

export interface IssueRow {
  id: number;
  fingerprint: string;
  severity: "critical" | "warning" | "info";
  category: string;
  page: string | null;
  journey: string | null;
  title: string;
  description: string | null;
  evidence: string | null;
  suggested_investigation: string | null;
  baseline_value: string | null;
  current_value: string | null;
  frequency: number;
  first_detected: string;
  last_detected: string;
  source: string;
  status: "open" | "acknowledged" | "snoozed" | "resolved";
  snoozed_until: string | null;
}

export interface IssueFilters {
  status?: string;
  severity?: string;
  category?: string;
}

export function listIssues(filters: IssueFilters = {}): IssueRow[] {
  const db = getHealthDb();
  autoWakeSnoozed(db);

  const clauses: string[] = [];
  const params: Record<string, string> = {};
  if (filters.status === "active") {
    // Acknowledging an issue marks it as seen — it must stay visible and still
    // count against the score. Only snoozed/resolved actually hide something.
    clauses.push("status IN ('open', 'acknowledged')");
  } else if (filters.status) {
    clauses.push("status = @status");
    params.status = filters.status;
  }
  if (filters.severity) {
    clauses.push("severity = @severity");
    params.severity = filters.severity;
  }
  if (filters.category) {
    clauses.push("category = @category");
    params.category = filters.category;
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(
      `SELECT * FROM issues ${where} ORDER BY
        CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
        last_detected DESC`,
    )
    .all(params) as IssueRow[];
}

export function getIssue(id: number): IssueRow | null {
  const db = getHealthDb();
  return (db.prepare("SELECT * FROM issues WHERE id = ?").get(id) as IssueRow | undefined) ?? null;
}

function autoWakeSnoozed(db: ReturnType<typeof getHealthDb>): void {
  db.prepare(
    `UPDATE issues SET status = 'open', snoozed_until = NULL WHERE status = 'snoozed' AND snoozed_until IS NOT NULL AND snoozed_until <= datetime('now')`,
  ).run();
  db.prepare(
    `UPDATE alerts SET status = 'open', snoozed_until = NULL WHERE status = 'snoozed' AND snoozed_until IS NOT NULL AND snoozed_until <= datetime('now')`,
  ).run();
}

export type AlertAction = "acknowledge" | "snooze_1d" | "snooze_7d" | "resolve" | "reopen";

export function applyAlertAction(issueId: number, action: AlertAction, note?: string): IssueRow | null {
  const db = getHealthDb();
  const issue = getIssue(issueId);
  if (!issue) return null;

  let newStatus: IssueRow["status"];
  let snoozedUntil: string | null = null;
  switch (action) {
    case "acknowledge":
      newStatus = "acknowledged";
      break;
    case "snooze_1d":
      newStatus = "snoozed";
      snoozedUntil = "+1 day";
      break;
    case "snooze_7d":
      newStatus = "snoozed";
      snoozedUntil = "+7 days";
      break;
    case "resolve":
      newStatus = "resolved";
      break;
    case "reopen":
      newStatus = "open";
      break;
  }

  const fromStatus = issue.status;
  if (snoozedUntil) {
    db.prepare(`UPDATE issues SET status = ?, snoozed_until = datetime('now', ?) WHERE id = ?`).run(
      newStatus,
      snoozedUntil,
      issueId,
    );
  } else {
    db.prepare(`UPDATE issues SET status = ?, snoozed_until = NULL WHERE id = ?`).run(newStatus, issueId);
  }

  const alert = db.prepare("SELECT id FROM alerts WHERE issue_id = ?").get(issueId) as { id: number } | undefined;
  let alertId = alert?.id;
  if (!alertId) {
    const inserted = db.prepare("INSERT INTO alerts (issue_id, status) VALUES (?, ?)").run(issueId, newStatus);
    alertId = inserted.lastInsertRowid as number;
  } else {
    if (snoozedUntil) {
      db.prepare(`UPDATE alerts SET status = ?, snoozed_until = datetime('now', ?), updated_at = datetime('now') WHERE id = ?`).run(
        newStatus,
        snoozedUntil,
        alertId,
      );
    } else {
      db.prepare(`UPDATE alerts SET status = ?, snoozed_until = NULL, updated_at = datetime('now') WHERE id = ?`).run(
        newStatus,
        alertId,
      );
    }
  }

  db.prepare(
    `INSERT INTO alert_history (alert_id, from_status, to_status, note) VALUES (?, ?, ?, ?)`,
  ).run(alertId, fromStatus, newStatus, note ?? null);

  return getIssue(issueId);
}

export function getAlertHistory(issueId: number) {
  const db = getHealthDb();
  const alert = db.prepare("SELECT id FROM alerts WHERE issue_id = ?").get(issueId) as { id: number } | undefined;
  if (!alert) return [];
  return db
    .prepare("SELECT * FROM alert_history WHERE alert_id = ? ORDER BY changed_at DESC")
    .all(alert.id);
}
