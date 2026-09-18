import { describe, it, expect } from "vitest";
import { resolvePeriod, resolveCustomPeriod } from "@/lib/odoo/periods";

describe("resolvePeriod", () => {
  it("month: current is this calendar month, previous is last calendar month", () => {
    const now = new Date("2026-03-15T12:00:00Z");
    const r = resolvePeriod("month", now);
    expect(r.current).toEqual({ startISO: "2026-03-01", endISO: "2026-04-01" });
    expect(r.previous).toEqual({ startISO: "2026-02-01", endISO: "2026-03-01" });
    expect(r.label).toBe("March 2026");
  });

  it("quarter: current is this calendar quarter, previous is last quarter", () => {
    const now = new Date("2026-05-10T00:00:00Z");
    const r = resolvePeriod("quarter", now);
    expect(r.current).toEqual({ startISO: "2026-04-01", endISO: "2026-07-01" });
    expect(r.previous).toEqual({ startISO: "2026-01-01", endISO: "2026-04-01" });
  });

  it("ytd: current is Jan 1 to today, previous is the same span last year", () => {
    const now = new Date("2026-03-10T00:00:00Z");
    const r = resolvePeriod("ytd", now);
    expect(r.current).toEqual({ startISO: "2026-01-01", endISO: "2026-03-11" });
    expect(r.previous).toEqual({ startISO: "2025-01-01", endISO: "2025-03-11" });
  });

  it("12months: current is the trailing 12 months, previous is the 12 months before that", () => {
    const now = new Date("2026-03-15T00:00:00Z");
    const r = resolvePeriod("12months", now);
    expect(r.current).toEqual({ startISO: "2025-03-15", endISO: "2026-03-16" });
    expect(r.previous).toEqual({ startISO: "2024-03-15", endISO: "2025-03-15" });
  });
});

describe("resolveCustomPeriod", () => {
  it("previous is an equal-length window immediately before start", () => {
    const r = resolveCustomPeriod("2026-03-10", "2026-03-20");
    expect(r.current).toEqual({ startISO: "2026-03-10", endISO: "2026-03-20" });
    // 10-day current window -> 10-day previous window ending right before it
    expect(r.previous).toEqual({ startISO: "2026-02-28", endISO: "2026-03-10" });
  });

  it("throws when end is not after start", () => {
    expect(() => resolveCustomPeriod("2026-03-10", "2026-03-10")).toThrow();
    expect(() => resolveCustomPeriod("2026-03-10", "2026-03-05")).toThrow();
  });
});
