import { describe, it, expect } from "vitest";
import { listUpcomingOccasions } from "@/lib/social/seasonalCalendar";

describe("listUpcomingOccasions", () => {
  it("computes Black Friday as the day after the 4th Thursday of November", () => {
    const occasions = listUpcomingOccasions(new Date("2026-09-22T00:00:00Z"));
    const blackFriday = occasions.find((o) => o.id === "black-friday")!;
    // 4th Thursday of Nov 2026 is Nov 26 -> Black Friday is Nov 27
    expect(blackFriday.date).toBe("2026-11-27");
  });

  it("computes Cyber Monday as the Monday after Black Friday", () => {
    const occasions = listUpcomingOccasions(new Date("2026-09-22T00:00:00Z"));
    const cyberMonday = occasions.find((o) => o.id === "cyber-monday")!;
    expect(cyberMonday.date).toBe("2026-11-30");
  });

  it("rolls Halloween into next year once this year's date has passed", () => {
    const occasions = listUpcomingOccasions(new Date("2026-11-05T00:00:00Z"));
    const halloween = occasions.find((o) => o.id === "halloween")!;
    expect(halloween.date).toBe("2027-10-31");
  });

  it("keeps this year's Halloween when it hasn't happened yet", () => {
    const occasions = listUpcomingOccasions(new Date("2026-09-22T00:00:00Z"));
    const halloween = occasions.find((o) => o.id === "halloween")!;
    expect(halloween.date).toBe("2026-10-31");
  });

  it("offsets suggestedPostByDate by the occasion's lead time", () => {
    const occasions = listUpcomingOccasions(new Date("2026-09-22T00:00:00Z"));
    const halloween = occasions.find((o) => o.id === "halloween")!;
    // 14-day lead time -> Oct 31 - 14 days = Oct 17
    expect(halloween.suggestedPostByDate).toBe("2026-10-17");
  });

  it("computes Mother's Day as the 2nd Sunday of May", () => {
    const occasions = listUpcomingOccasions(new Date("2026-09-22T00:00:00Z"));
    const mothersDay = occasions.find((o) => o.id === "mothers-day")!;
    // 2027 (since 2026's has passed): May 1 2027 is a Saturday, so 1st Sunday is May 2, 2nd Sunday is May 9
    expect(mothersDay.date).toBe("2027-05-09");
  });

  it("returns occasions sorted soonest-first", () => {
    const occasions = listUpcomingOccasions(new Date("2026-09-22T00:00:00Z"));
    const dates = occasions.map((o) => o.date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it("labels the holiday shipping cutoff as estimated, not a verified fact", () => {
    const occasions = listUpcomingOccasions(new Date("2026-09-22T00:00:00Z"));
    const cutoff = occasions.find((o) => o.id === "holiday-shipping-cutoff")!;
    expect(cutoff.note.toLowerCase()).toContain("confirm");
  });
});
