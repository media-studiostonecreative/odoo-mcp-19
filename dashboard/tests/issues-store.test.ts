import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

beforeEach(async () => {
  const { closeHealthDb } = await import("@/lib/db");
  closeHealthDb();
  process.env.DASHBOARD_DATA_DIR = mkdtempSync(path.join(tmpdir(), "dashboard-issues-store-test-"));
});

async function seedIssue(overrides: Partial<Record<string, unknown>> = {}) {
  const { getHealthDb } = await import("@/lib/db");
  const db = getHealthDb();
  const row = {
    fingerprint: `fp-${Math.random()}`,
    severity: "warning",
    category: "technical",
    site: "retail",
    title: "Test issue",
    source: "quick_scan",
    ...overrides,
  };
  const result = db
    .prepare(
      `INSERT INTO issues (fingerprint, severity, category, site, title, source) VALUES (@fingerprint, @severity, @category, @site, @title, @source)`,
    )
    .run(row);
  return result.lastInsertRowid as number;
}

describe("listIssues", () => {
  it("returns issues ordered critical-first, then most recently detected", async () => {
    await seedIssue({ fingerprint: "a", severity: "warning", last_detected: "2026-01-01" });
    await seedIssue({ fingerprint: "b", severity: "critical", last_detected: "2026-01-01" });
    const { listIssues } = await import("@/lib/issues/store");
    const rows = listIssues();
    expect(rows[0]!.fingerprint).toBe("b");
  });

  it("filters by status = active to mean open OR acknowledged", async () => {
    await seedIssue({ fingerprint: "open1" });
    const openId = 1;
    await seedIssue({ fingerprint: "resolved1" });
    const { getHealthDb } = await import("@/lib/db");
    getHealthDb().prepare(`UPDATE issues SET status = 'resolved' WHERE fingerprint = 'resolved1'`).run();
    const { listIssues } = await import("@/lib/issues/store");
    const rows = listIssues({ status: "active" });
    expect(rows.map((r) => r.fingerprint)).toEqual(["open1"]);
    void openId;
  });

  it("filters by site", async () => {
    await seedIssue({ fingerprint: "retail1", site: "retail" });
    await seedIssue({ fingerprint: "wholesale1", site: "wholesale" });
    const { listIssues } = await import("@/lib/issues/store");
    expect(listIssues({ site: "wholesale" }).map((r) => r.fingerprint)).toEqual(["wholesale1"]);
  });
});

describe("applyAlertAction", () => {
  it("acknowledge sets status to acknowledged and records history", async () => {
    const id = await seedIssue({ fingerprint: "ack1" });
    const { applyAlertAction, getAlertHistory } = await import("@/lib/issues/store");
    const updated = applyAlertAction(id, "acknowledge");
    expect(updated?.status).toBe("acknowledged");
    const history = getAlertHistory(id) as Array<{ from_status: string; to_status: string }>;
    expect(history[0]).toMatchObject({ from_status: "open", to_status: "acknowledged" });
  });

  it("snooze_1d sets status to snoozed with a snoozed_until in the future", async () => {
    const id = await seedIssue({ fingerprint: "snooze1" });
    const { applyAlertAction, getIssue } = await import("@/lib/issues/store");
    applyAlertAction(id, "snooze_1d");
    const issue = getIssue(id);
    expect(issue?.status).toBe("snoozed");
    expect(new Date(issue!.snoozed_until!).getTime()).toBeGreaterThan(Date.now());
  });

  it("resolve then reopen round-trips status", async () => {
    const id = await seedIssue({ fingerprint: "roundtrip1" });
    const { applyAlertAction, getIssue } = await import("@/lib/issues/store");
    applyAlertAction(id, "resolve");
    expect(getIssue(id)?.status).toBe("resolved");
    applyAlertAction(id, "reopen");
    expect(getIssue(id)?.status).toBe("open");
  });

  it("returns null for a non-existent issue id", async () => {
    const { applyAlertAction } = await import("@/lib/issues/store");
    expect(applyAlertAction(999999, "resolve")).toBeNull();
  });
});

describe("listIssues auto-wake", () => {
  it("moves a snoozed issue whose snoozed_until has passed back to open", async () => {
    const id = await seedIssue({ fingerprint: "expired-snooze" });
    const { getHealthDb } = await import("@/lib/db");
    getHealthDb()
      .prepare(`UPDATE issues SET status = 'snoozed', snoozed_until = datetime('now', '-1 hour') WHERE id = ?`)
      .run(id);
    const { listIssues } = await import("@/lib/issues/store");
    const rows = listIssues();
    expect(rows.find((r) => r.id === id)?.status).toBe("open");
  });
});
