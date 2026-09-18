import { describe, it, expect } from "vitest";
import { computeHealthScore, computeAuditScore } from "@/lib/issues/scoring";

describe("computeHealthScore", () => {
  it("returns 100 for no issues", () => {
    expect(computeHealthScore([])).toBe(100);
  });

  it("deducts 8 per critical and 4 per warning", () => {
    expect(computeHealthScore([{ severity: "critical" }, { severity: "warning" }])).toBe(88);
  });

  it("floors at 0, never negative", () => {
    const many = Array.from({ length: 20 }, () => ({ severity: "critical" }));
    expect(computeHealthScore(many)).toBe(0);
  });

  it("treats an unrecognized severity as 1 point", () => {
    expect(computeHealthScore([{ severity: "unknown" }])).toBe(99);
  });
});

describe("computeAuditScore", () => {
  it("returns 100 for no findings", () => {
    expect(computeAuditScore([])).toBe(100);
  });

  it("deducts by priority weight (P0=10, P1=5, P2=2, P3=1)", () => {
    expect(computeAuditScore([{ priority: "P0" }, { priority: "P1" }, { priority: "P2" }, { priority: "P3" }])).toBe(82);
  });

  it("treats a null/unknown priority as 1 point", () => {
    expect(computeAuditScore([{ priority: null }])).toBe(99);
  });
});
