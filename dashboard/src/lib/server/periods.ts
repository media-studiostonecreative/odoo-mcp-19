import "server-only";

import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  subMonths,
  subQuarters,
  subYears,
  format,
} from "date-fns";

export type PeriodKey = "month" | "quarter" | "ytd" | "12months";

export interface DateRange {
  /** Inclusive, YYYY-MM-DD, for Odoo domain >= comparisons */
  startISO: string;
  /** Exclusive, YYYY-MM-DD, for Odoo domain < comparisons */
  endISO: string;
}

export interface PeriodRange {
  current: DateRange;
  previous: DateRange;
  label: string;
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const dayAfter = (d: Date) => {
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return next;
};

/** Resolves a period selector into current + comparable previous ranges. */
export function resolvePeriod(period: PeriodKey, now: Date = new Date()): PeriodRange {
  switch (period) {
    case "month": {
      const start = startOfMonth(now);
      const end = dayAfter(endOfMonth(now));
      const prevMonth = subMonths(now, 1);
      const prevStart = startOfMonth(prevMonth);
      const prevEnd = dayAfter(endOfMonth(prevMonth));
      return {
        current: { startISO: iso(start), endISO: iso(end) },
        previous: { startISO: iso(prevStart), endISO: iso(prevEnd) },
        label: format(now, "MMMM yyyy"),
      };
    }
    case "quarter": {
      const start = startOfQuarter(now);
      const end = dayAfter(endOfQuarter(now));
      const prevQ = subQuarters(now, 1);
      const prevStart = startOfQuarter(prevQ);
      const prevEnd = dayAfter(endOfQuarter(prevQ));
      return {
        current: { startISO: iso(start), endISO: iso(end) },
        previous: { startISO: iso(prevStart), endISO: iso(prevEnd) },
        label: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`,
      };
    }
    case "ytd": {
      const start = startOfYear(now);
      const end = dayAfter(now);
      const prevStart = startOfYear(subYears(now, 1));
      const prevEnd = dayAfter(subYears(now, 1));
      return {
        current: { startISO: iso(start), endISO: iso(end) },
        previous: { startISO: iso(prevStart), endISO: iso(prevEnd) },
        label: `${now.getFullYear()} YTD`,
      };
    }
    case "12months": {
      const start = startOfMonth(subMonths(now, 11));
      const end = dayAfter(now);
      const prevStart = startOfMonth(subMonths(now, 23));
      const prevEnd = startOfMonth(subMonths(now, 11));
      return {
        current: { startISO: iso(start), endISO: iso(end) },
        previous: { startISO: iso(prevStart), endISO: iso(prevEnd) },
        label: "Trailing 12 Months",
      };
    }
  }
}

/** Percent change, current vs previous. Null when previous is 0 (undefined comparison). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
