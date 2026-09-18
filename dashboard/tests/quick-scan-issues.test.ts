import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

interface IssueRow {
  title: string;
  site: string;
  severity: string;
  status: string;
  frequency: number;
}

beforeEach(() => {
  process.env.DASHBOARD_DATA_DIR = mkdtempSync(path.join(tmpdir(), "dashboard-quickscan-test-"));
});

async function seedScanWithChecks(
  checks: Array<{ category: string; site: string; page: string | null; label: string; status: "pass" | "fail" | "warn" }>,
) {
  const { getHealthDb } = await import("@/lib/db");
  const db = getHealthDb();
  const scanId = db.prepare(`INSERT INTO scans (scan_type, status, total_checks) VALUES ('quick', 'completed', ?)`).run(checks.length)
    .lastInsertRowid as number;
  const insert = db.prepare(
    `INSERT INTO checks (scan_id, check_type, category, site, page, label, status, details) VALUES (?, 'availability', ?, ?, ?, ?, ?, '{}')`,
  );
  for (const c of checks) insert.run(scanId, c.category, c.site, c.page, c.label, c.status);
  return scanId;
}

describe("generateIssuesFromScan (via runQuickScan's internal exports)", () => {
  it("creates an issue with the check's real site for each fail/warn check", async () => {
    const { generateIssuesFromScan } = await import("@/lib/issues/quickScan");
    const scanId = await seedScanWithChecks([
      { category: "technical", site: "retail", page: "https://studiostonecreative.com", label: "Homepage reachable", status: "fail" },
      { category: "navigation", site: "wholesale", page: "https://studiostone.odoo.com", label: "Wholesale link — /shop", status: "warn" },
    ]);
    generateIssuesFromScan(scanId);

    const { getHealthDb } = await import("@/lib/db");
    const issues = getHealthDb().prepare(`SELECT * FROM issues WHERE source = 'quick_scan'`).all() as IssueRow[];
    expect(issues).toHaveLength(2);
    expect(issues.find((i) => i.title === "Homepage reachable")).toMatchObject({ site: "retail", severity: "critical" });
    expect(issues.find((i) => i.title.toLowerCase().includes("wholesale"))?.site).toBe("wholesale");
  });

  it("re-running with the same fail bumps frequency instead of duplicating", async () => {
    const { generateIssuesFromScan } = await import("@/lib/issues/quickScan");
    const scanId1 = await seedScanWithChecks([{ category: "technical", site: "retail", page: "https://x.com", label: "X reachable", status: "fail" }]);
    generateIssuesFromScan(scanId1);
    const scanId2 = await seedScanWithChecks([{ category: "technical", site: "retail", page: "https://x.com", label: "X reachable", status: "fail" }]);
    generateIssuesFromScan(scanId2);

    const { getHealthDb } = await import("@/lib/db");
    const issues = getHealthDb().prepare(`SELECT * FROM issues WHERE source = 'quick_scan'`).all() as IssueRow[];
    expect(issues).toHaveLength(1);
    expect(issues[0]?.frequency).toBe(2);
  });

  it("auto-resolves a quick_scan issue once the same check comes back clean", async () => {
    const { generateIssuesFromScan } = await import("@/lib/issues/quickScan");
    const scanId1 = await seedScanWithChecks([{ category: "technical", site: "retail", page: "https://x.com", label: "X reachable", status: "fail" }]);
    generateIssuesFromScan(scanId1);
    const scanId2 = await seedScanWithChecks([{ category: "technical", site: "retail", page: "https://x.com", label: "X reachable", status: "pass" }]);
    generateIssuesFromScan(scanId2);

    const { getHealthDb } = await import("@/lib/db");
    const issue = getHealthDb().prepare(`SELECT * FROM issues WHERE title = 'X reachable'`).get() as IssueRow;
    expect(issue.status).toBe("resolved");
  });
});
