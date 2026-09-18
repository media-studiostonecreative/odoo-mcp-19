import "server-only";

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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Constructs a UTC calendar date, letting Date.UTC normalize month/day overflow (e.g. month 12 -> next January). */
function ymd(y: number, m: number, d: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m, d));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
}

function fmt(p: { y: number; m: number; d: number }): string {
  return `${p.y}-${pad2(p.m + 1)}-${pad2(p.d)}`;
}

/** Resolves a preset period into current + comparable previous ranges, entirely in UTC calendar terms. */
export function resolvePeriod(period: Exclude<PeriodKey, "custom">, now: Date = new Date()): PeriodRange {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-11
  const d = now.getUTCDate();

  switch (period) {
    case "month": {
      const cur = ymd(y, m, 1);
      const curEnd = ymd(y, m + 1, 1);
      const prev = ymd(y, m - 1, 1);
      return {
        current: { startISO: fmt(cur), endISO: fmt(curEnd) },
        previous: { startISO: fmt(prev), endISO: fmt(cur) },
        label: `${MONTH_NAMES[m]} ${y}`,
      };
    }
    case "quarter": {
      const qi = Math.floor(m / 3);
      const cur = ymd(y, qi * 3, 1);
      const curEnd = ymd(y, qi * 3 + 3, 1);
      const prev = ymd(y, qi * 3 - 3, 1);
      return {
        current: { startISO: fmt(cur), endISO: fmt(curEnd) },
        previous: { startISO: fmt(prev), endISO: fmt(cur) },
        label: `Q${qi + 1} ${y}`,
      };
    }
    case "ytd": {
      const cur = ymd(y, 0, 1);
      const curEnd = ymd(y, m, d + 1);
      const prev = ymd(y - 1, 0, 1);
      const prevEnd = ymd(y - 1, m, d + 1);
      return {
        current: { startISO: fmt(cur), endISO: fmt(curEnd) },
        previous: { startISO: fmt(prev), endISO: fmt(prevEnd) },
        label: `${y} YTD`,
      };
    }
    case "12months": {
      const cur = ymd(y - 1, m, d);
      const curEnd = ymd(y, m, d + 1);
      const prev = ymd(y - 2, m, d);
      return {
        current: { startISO: fmt(cur), endISO: fmt(curEnd) },
        previous: { startISO: fmt(prev), endISO: fmt(cur) },
        label: "Trailing 12 Months",
      };
    }
  }
}

/** Resolves a custom [startISO, endISO) range, with `previous` an equal-length window right before it. Pure millisecond math on UTC-midnight instants — no local-timezone-sensitive function anywhere. */
export function resolveCustomPeriod(startISO: string, endISO: string): PeriodRange {
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  if (!(end.getTime() > start.getTime())) {
    throw new Error(`resolveCustomPeriod: end (${endISO}) must be after start (${startISO})`);
  }
  const lengthMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - lengthMs);
  const iso = (dt: Date) => dt.toISOString().slice(0, 10);
  return {
    current: { startISO, endISO },
    previous: { startISO: iso(prevStart), endISO: iso(start) },
    label: `${startISO} to ${endISO}`,
  };
}
