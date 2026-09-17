import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

beforeEach(() => {
  process.env.DASHBOARD_DATA_DIR = mkdtempSync(path.join(tmpdir(), "dashboard-db-test-"));
});

describe("getHealthDb", () => {
  it("creates every Phase 1 table on first access", async () => {
    const { getHealthDb } = await import("@/lib/db");
    const db = getHealthDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((r: Record<string, unknown>) => r.name as string);
    for (const expected of ["issues", "alert_history", "scans", "checks", "audit_imports", "content_findings"]) {
      expect(tables).toContain(expected);
    }
  });

  it("issues.site only accepts retail or wholesale", async () => {
    const { getHealthDb } = await import("@/lib/db");
    const db = getHealthDb();
    expect(() =>
      db
        .prepare(
          `INSERT INTO issues (fingerprint, severity, category, site, title, source) VALUES ('fp1', 'warning', 'technical', 'bogus', 'Test', 'quick_scan')`,
        )
        .run(),
    ).toThrow();
    expect(() =>
      db
        .prepare(
          `INSERT INTO issues (fingerprint, severity, category, site, title, source) VALUES ('fp2', 'warning', 'technical', 'retail', 'Test', 'quick_scan')`,
        )
        .run(),
    ).not.toThrow();
  });

  it("returns the same connection on repeated calls", async () => {
    const { getHealthDb } = await import("@/lib/db");
    expect(getHealthDb()).toBe(getHealthDb());
  });
});
