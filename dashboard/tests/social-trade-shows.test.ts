import { describe, it, expect } from "vitest";
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
