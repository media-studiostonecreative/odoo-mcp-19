// dashboard/src/lib/social/seasonalCalendar.ts

/**
 * Real, computed retail-calendar dates relevant to a gift-oriented physical
 * craft-kit business — not trend data, not a claim about what's popular,
 * just calendar facts (with floating holidays computed algorithmically so
 * they stay correct year to year). Each occasion also carries a
 * `suggestedPostByDate`, offset by a lead time appropriate to that kind of
 * event, so content can be planned ahead rather than reactively.
 *
 * The one item here that is NOT a hard fact is the holiday shipping cutoff —
 * carriers change these every year, so it's explicitly labeled as typical/
 * estimated and the reasoning text says to confirm the real one before
 * committing marketing copy to it.
 */

export type OccasionCategory = "gifting" | "seasonal" | "sale-event";

export interface SeasonalOccasion {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  suggestedPostByDate: string; // YYYY-MM-DD — date minus lead time
  category: OccasionCategory;
  note: string;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** nth (1-indexed) occurrence of `weekday` (0=Sun..6=Sat) in `month` (0-indexed) of `year`. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const d = new Date(Date.UTC(year, month, 1));
  let count = 0;
  while (true) {
    if (d.getUTCDay() === weekday) {
      count++;
      if (count === n) return d;
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

interface OccasionDef {
  id: string;
  name: string;
  category: OccasionCategory;
  note: string;
  leadDays: number;
  dateForYear: (year: number) => Date;
}

const OCCASION_DEFS: OccasionDef[] = [
  { id: "halloween", name: "Halloween", category: "seasonal", leadDays: 14, note: "No dedicated Halloween SKU exists in the catalog — lean on already-in-stock atmospheric/wild themes (e.g. Wolf, Bigfoot, Dragon kits) rather than implying a themed product that isn't real.", dateForYear: (y) => new Date(Date.UTC(y, 9, 31)) },
  {
    id: "black-friday",
    name: "Black Friday",
    category: "sale-event",
    leadDays: 10,
    note: "US Thanksgiving + 1 day (4th Thursday of November), computed, not guessed.",
    dateForYear: (y) => addDays(nthWeekdayOfMonth(y, 10, 4, 4), 1),
  },
  {
    id: "cyber-monday",
    name: "Cyber Monday",
    category: "sale-event",
    leadDays: 10,
    note: "The Monday after US Thanksgiving, computed, not guessed.",
    dateForYear: (y) => addDays(nthWeekdayOfMonth(y, 10, 4, 4), 4),
  },
  {
    id: "holiday-shipping-cutoff",
    name: "Holiday Shipping Cutoff (estimated)",
    category: "gifting",
    leadDays: 14,
    note: "Estimated ~10 days before Christmas as a typical standard-shipping cutoff — confirm the real date with your carrier/fulfillment before publishing any cutoff claim in marketing copy.",
    dateForYear: (y) => addDays(new Date(Date.UTC(y, 11, 25)), -10),
  },
  { id: "christmas", name: "Christmas", category: "gifting", leadDays: 21, note: "Fixed calendar date.", dateForYear: (y) => new Date(Date.UTC(y, 11, 25)) },
  { id: "valentines-day", name: "Valentine's Day", category: "gifting", leadDays: 14, note: "Fixed calendar date.", dateForYear: (y) => new Date(Date.UTC(y, 1, 14)) },
  { id: "mothers-day", name: "Mother's Day (US/Canada)", category: "gifting", leadDays: 14, note: "2nd Sunday of May, computed, not guessed.", dateForYear: (y) => nthWeekdayOfMonth(y, 4, 0, 2) },
  { id: "fathers-day", name: "Father's Day (US/Canada)", category: "gifting", leadDays: 14, note: "3rd Sunday of June, computed, not guessed.", dateForYear: (y) => nthWeekdayOfMonth(y, 5, 0, 3) },
];

/** Every occasion's next upcoming occurrence relative to `now`, sorted soonest first.
 * If this year's date has already passed, uses next year's instead — so the list is
 * always genuinely forward-looking regardless of when it's called. */
export function listUpcomingOccasions(now: Date = new Date()): SeasonalOccasion[] {
  const year = now.getUTCFullYear();
  const occasions = OCCASION_DEFS.map((def) => {
    let date = def.dateForYear(year);
    if (date.getTime() < now.getTime()) date = def.dateForYear(year + 1);
    return {
      id: def.id,
      name: def.name,
      date: toIso(date),
      suggestedPostByDate: toIso(addDays(date, -def.leadDays)),
      category: def.category,
      note: def.note,
    };
  });
  return occasions.sort((a, b) => a.date.localeCompare(b.date));
}
