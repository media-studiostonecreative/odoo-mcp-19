import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { tradeShowPostByDate } from "@/lib/social/tradeShows";

describe("tradeShowPostByDate", () => {
  it("subtracts lead_days from start_date", () => {
    expect(tradeShowPostByDate({ start_date: "2026-11-11", lead_days: 10 })).toBe("2026-11-01");
  });

  it("handles a lead time that crosses a month boundary", () => {
    expect(tradeShowPostByDate({ start_date: "2026-12-09", lead_days: 14 })).toBe("2026-11-25");
  });

  it("handles zero lead days", () => {
    expect(tradeShowPostByDate({ start_date: "2026-11-11", lead_days: 0 })).toBe("2026-11-11");
  });
});

describe("updateTradeShow", () => {
  beforeEach(() => {
    process.env.DASHBOARD_DATA_DIR = mkdtempSync(path.join(tmpdir(), "trade-shows-test-"));
  });

  it("partially updates only the fields provided, leaving the rest unchanged", async () => {
    const { createTradeShow, updateTradeShow } = await import("@/lib/social/tradeShows");
    const created = createTradeShow({ name: "Circle Craft", location: "Vancouver, BC", start_date: "2026-11-11", end_date: "2026-11-16", lead_days: 10 });
    const updated = updateTradeShow(created.id, { end_date: "2026-11-15" });
    expect(updated!.end_date).toBe("2026-11-15");
    expect(updated!.name).toBe("Circle Craft");
    expect(updated!.location).toBe("Vancouver, BC");
  });

  it("returns null for a non-existent id", async () => {
    const { updateTradeShow } = await import("@/lib/social/tradeShows");
    expect(updateTradeShow(999999, { end_date: "2026-11-15" })).toBeNull();
  });
});
