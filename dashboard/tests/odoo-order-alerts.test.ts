import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SaleOrderWithState } from "@/lib/odoo/quotations";

interface IssueRow {
  source: string;
  category: string;
  site: string;
  title: string;
  severity: string;
  status: string;
}

beforeAll(() => {
  process.env.DASHBOARD_DATA_DIR = mkdtempSync(path.join(tmpdir(), "dashboard-order-alerts-test-"));
});

const NOW = new Date("2026-09-14T00:00:00Z");

function makeQuote(overrides: Partial<SaleOrderWithState>): SaleOrderWithState {
  return {
    id: 1,
    name: "SO-TEST",
    amount_total: 1000,
    currency_rate: 1,
    date_order: NOW.toISOString(),
    partner_id: [1, "Test Customer"],
    state: "draft",
    ...overrides,
  };
}

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 86_400_000).toISOString();
}

describe("generateOdooOrderAlerts — DB-level upsert and auto-resolve", () => {
  it("creates an issue for a stale draft quote and an abandoned sent quote", async () => {
    const { generateOdooOrderAlerts } = await import("@/lib/odoo/orderAlerts");
    const { getHealthDb } = await import("@/lib/db");
    const db = getHealthDb();

    generateOdooOrderAlerts(
      [
        makeQuote({ id: 1, name: "SO-1", date_order: daysAgo(5), state: "draft" }),
        makeQuote({ id: 2, name: "SO-2", date_order: daysAgo(20), state: "sent" }),
      ],
      NOW,
    );

    const issues = db.prepare(`SELECT * FROM issues WHERE source = 'odoo_order_alert'`).all() as IssueRow[];
    expect(issues).toHaveLength(2);
    expect(issues.every((i) => i.category === "business" && i.site === "wholesale")).toBe(true);
    expect(issues.find((i) => i.title.includes("SO-1"))?.severity).toBe("warning");
  });

  it("auto-resolves an issue once its quote is no longer stale", async () => {
    const { generateOdooOrderAlerts } = await import("@/lib/odoo/orderAlerts");
    const { getHealthDb } = await import("@/lib/db");
    const db = getHealthDb();

    generateOdooOrderAlerts([makeQuote({ id: 3, name: "SO-3", date_order: daysAgo(5), state: "draft" })], NOW);
    generateOdooOrderAlerts([makeQuote({ id: 3, name: "SO-3", date_order: daysAgo(6), state: "sent" })], NOW);

    const issue = db.prepare(`SELECT * FROM issues WHERE title LIKE '%SO-3%'`).get() as IssueRow;
    expect(issue.status).toBe("resolved");
  });

  it("escalates severity to critical past the critical-age threshold", async () => {
    const { generateOdooOrderAlerts } = await import("@/lib/odoo/orderAlerts");
    const { getHealthDb } = await import("@/lib/db");
    const db = getHealthDb();

    generateOdooOrderAlerts([makeQuote({ id: 4, name: "SO-4", date_order: daysAgo(31), state: "sent" })], NOW);
    const issue = db.prepare(`SELECT * FROM issues WHERE title LIKE '%SO-4%'`).get() as IssueRow;
    expect(issue.severity).toBe("critical");
  });

  it("does not flag a fresh draft or a sent quote inside the grace window", async () => {
    const { generateOdooOrderAlerts } = await import("@/lib/odoo/orderAlerts");
    const { getHealthDb } = await import("@/lib/db");
    const db = getHealthDb();

    generateOdooOrderAlerts(
      [
        makeQuote({ id: 5, name: "SO-5", date_order: daysAgo(1), state: "draft" }),
        makeQuote({ id: 6, name: "SO-6", date_order: daysAgo(10), state: "sent" }),
      ],
      NOW,
    );
    const rows = db.prepare(`SELECT * FROM issues WHERE title LIKE '%SO-5%' OR title LIKE '%SO-6%'`).all();
    expect(rows).toHaveLength(0);
  });
});
