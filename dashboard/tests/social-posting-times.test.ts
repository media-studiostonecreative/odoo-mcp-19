import { describe, it, expect } from "vitest";
import { suggestPostingTime } from "@/lib/social/postingTimes";

describe("suggestPostingTime", () => {
  it("suggests an evening time for an Instagram reel on Wednesday", () => {
    // 2026-09-30 is a Wednesday
    const result = suggestPostingTime("instagram", "reel", "2026-09-30");
    expect(result.time).toBe("7:00 PM");
    expect(result.reason.toLowerCase()).toContain("wednesday");
  });

  it("suggests a different (midday) time for an Instagram photo on the same Wednesday", () => {
    const result = suggestPostingTime("instagram", "photo", "2026-09-30");
    expect(result.time).toBe("12:00 PM");
  });

  it("falls back to the platform default when no day-specific rule matches", () => {
    // 2026-09-28 is a Monday, with no Monday-specific instagram photo rule
    const result = suggestPostingTime("instagram", "photo", "2026-09-28");
    expect(result.time).toBe("11:00 AM");
  });

  it("suggests Tuesday 10am for Facebook", () => {
    // 2026-09-29 is a Tuesday
    const result = suggestPostingTime("facebook", "photo", "2026-09-29");
    expect(result.time).toBe("10:00 AM");
  });

  it("suggests a Sunday evening time for Pinterest", () => {
    // 2026-09-27 is a Sunday
    const result = suggestPostingTime("pinterest", "photo", "2026-09-27");
    expect(result.time).toBe("8:00 PM");
  });
});
