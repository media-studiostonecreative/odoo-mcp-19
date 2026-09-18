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
  addDays,
  differenceInCalendarDays,
  format,
} from "date-fns";

export type PeriodKey = "month" | "quarter" | "ytd" | "12months" | "custom";

/** startISO inclusive, endISO exclusive, both YYYY-MM-DD — for Odoo domain >=/< comparisons. */
export interface DateRange {
  startISO: string;
  endISO: string;
}

export interface PeriodRange {
  current: DateRange;
  previous: DateRange;
  label: string;
}

const iso = (d: Date) => d.toISOString().split("T")[0]!;
const dayAfter = (d: Date) => addDays(d, 1);

/** Resolves a preset period into current + comparable previous ranges. */
export function resolvePeriod(period: Exclude<PeriodKey, "custom">, now: Date = new Date()): PeriodRange {
  switch (period) {
    case "month": {
      const start = startOfMonth(now);
      const end = dayAfter(endOfMonth(now));
      const prevMonth = subMonths(now, 1);
      return {
        current: { startISO: iso(start), endISO: iso(end) },
        previous: { startISO: iso(startOfMonth(prevMonth)), endISO: iso(dayAfter(endOfMonth(prevMonth))) },
        label: format(now, "MMMM yyyy"),
      };
    }
    case "quarter": {
      const start = startOfQuarter(now);
      const end = dayAfter(endOfQuarter(now));
      const prevQ = subQuarters(now, 1);
      return {
        current: { startISO: iso(start), endISO: iso(end) },
        previous: { startISO: iso(startOfQuarter(prevQ)), endISO: iso(dayAfter(endOfQuarter(prevQ))) },
        label: `Q${Math.floor(now.getMonth() / 3) + 1} ${format(now, "yyyy")}`,
      };
    }
    case "ytd": {
      const start = startOfYear(now);
      const end = dayAfter(now);
      const prevYear = subYears(now, 1);
      return {
        current: { startISO: iso(start), endISO: iso(end) },
        previous: { startISO: iso(startOfYear(prevYear)), endISO: iso(dayAfter(prevYear)) },
        label: `${format(now, "yyyy")} YTD`,
      };
    }
    case "12months": {
      const start = subYears(now, 1);
      const end = dayAfter(now);
      const prevStart = subYears(start, 1);
      return {
        current: { startISO: iso(start), endISO: iso(end) },
        previous: { startISO: iso(prevStart), endISO: iso(start) },
        label: "Trailing 12 Months",
      };
    }
  }
}

/** Resolves a custom [startISO, endISO) range, with `previous` an equal-length window right before it. */
export function resolveCustomPeriod(startISO: string, endISO: string): PeriodRange {
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  if (!(end.getTime() > start.getTime())) {
    throw new Error(`resolveCustomPeriod: end (${endISO}) must be after start (${startISO})`);
  }
  const lengthDays = differenceInCalendarDays(end, start);
  const prevEnd = start;
  const prevStart = addDays(start, -lengthDays);
  return {
    current: { startISO, endISO },
    previous: { startISO: iso(prevStart), endISO: iso(prevEnd) },
    label: `${startISO} to ${endISO}`,
  };
}
