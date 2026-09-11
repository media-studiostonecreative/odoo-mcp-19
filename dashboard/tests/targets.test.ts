import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "dashboard-targets-test-"));
  process.env.DASHBOARD_DATA_DIR = tmpDir;
});

afterEach(async () => {
  const { closeDb } = await import("@/lib/server/db");
  closeDb();
  delete process.env.DASHBOARD_DATA_DIR;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("targets persistence (SQLite, local only)", () => {
  it("returns sane defaults before anything has been set", async () => {
    const { getTargets } = await import("@/lib/server/targets");
    const targets = getTargets();
    expect(targets.monthly_revenue_target).toBeGreaterThan(0);
    expect(targets.annual_revenue_target).toBeGreaterThan(0);
  });

  it("persists a partial update and merges it with existing values", async () => {
    const { getTargets, setTargets } = await import("@/lib/server/targets");
    setTargets({ monthly_revenue_target: 75_000 });
    const targets = getTargets();
    expect(targets.monthly_revenue_target).toBe(75_000);
    // untouched keys keep their previous (default) value
    expect(targets.annual_revenue_target).toBeGreaterThan(0);
  });

  it("ignores negative or non-finite values rather than corrupting the store", async () => {
    const { getTargets, setTargets } = await import("@/lib/server/targets");
    const before = getTargets();
    setTargets({ annual_revenue_target: -500, monthly_sales_order_target: Number.NaN });
    const after = getTargets();
    expect(after.annual_revenue_target).toBe(before.annual_revenue_target);
    expect(after.monthly_sales_order_target).toBe(before.monthly_sales_order_target);
  });

  it("rejects keys outside the known TARGET_KEYS allowlist", async () => {
    const { getTargets, setTargets } = await import("@/lib/server/targets");
    // @ts-expect-error deliberately passing an unknown key
    setTargets({ not_a_real_target: 999 });
    const targets = getTargets();
    expect(targets).not.toHaveProperty("not_a_real_target");
  });
});

describe("targets persistence across a real db close/reopen", () => {
  it("keeps values written before the db handle was closed", async () => {
    const targetsModule = await import("@/lib/server/targets");
    const dbModule = await import("@/lib/server/db");

    targetsModule.setTargets({ new_wholesale_account_target: 12 });
    dbModule.closeDb(); // simulates the process stopping

    // getDb() lazily reopens the same on-disk file on next access.
    const reloaded = targetsModule.getTargets();
    expect(reloaded.new_wholesale_account_target).toBe(12);
  });
});
