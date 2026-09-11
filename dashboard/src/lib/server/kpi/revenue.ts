import "server-only";

import { readOdoo } from "../safe-odoo";
import type { DateRange } from "../periods";

/**
 * INVOICED REVENUE — posted customer invoices/refunds only (account.move),
 * never confirmed sales orders. amount_total_signed is Odoo's company-
 * currency (CAD), sign-corrected field: verified live that a posted credit
 * note carries a negative amount_total_signed, so summing it across
 * out_invoice + out_refund already nets refunds out correctly.
 */
const INVOICE_MOVE_TYPES = ["out_invoice", "out_refund"];

interface ReadGroupSumRow {
  "amount_total_signed:sum": number | false;
}

export async function invoicedRevenueForRange(range: DateRange): Promise<number> {
  const rows = await readOdoo<ReadGroupSumRow[]>("account.move", "formatted_read_group", {
    domain: [
      ["move_type", "in", INVOICE_MOVE_TYPES],
      ["state", "=", "posted"],
      ["invoice_date", ">=", range.startISO],
      ["invoice_date", "<", range.endISO],
    ],
    aggregates: ["amount_total_signed:sum"],
    groupby: [],
  });
  return rows[0]?.["amount_total_signed:sum"] || 0;
}

export interface MonthlyRevenuePoint {
  month: string; // "2026-01"
  label: string; // "Jan"
  total: number;
}

/** 12 calendar months of invoiced revenue for the given year, zero-filled. */
export async function invoicedRevenueMonthlySeries(year: number): Promise<MonthlyRevenuePoint[]> {
  const rows = await readOdoo<
    { "invoice_date:month": [string, string] | false; "amount_total_signed:sum": number | false }[]
  >("account.move", "formatted_read_group", {
    domain: [
      ["move_type", "in", INVOICE_MOVE_TYPES],
      ["state", "=", "posted"],
      ["invoice_date", ">=", `${year}-01-01`],
      ["invoice_date", "<", `${year + 1}-01-01`],
    ],
    aggregates: ["amount_total_signed:sum"],
    groupby: ["invoice_date:month"],
  });

  const byMonth = new Map<string, number>();
  for (const row of rows) {
    if (!row["invoice_date:month"]) continue;
    const [isoDate] = row["invoice_date:month"];
    const monthKey = isoDate.slice(0, 7); // "2026-01"
    byMonth.set(monthKey, row["amount_total_signed:sum"] || 0);
  }

  const monthLabels = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return monthLabels.map((label, idx) => {
    const month = `${year}-${String(idx + 1).padStart(2, "0")}`;
    return { month, label, total: byMonth.get(month) ?? 0 };
  });
}
