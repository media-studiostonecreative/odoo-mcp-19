import "server-only";

import { readOdoo } from "../safe-odoo";
import { toCompanyCurrency } from "../currency";
import type { DateRange } from "../periods";

/**
 * SALES BOOKED / OPEN QUOTATIONS — confirmed / draft sale.order records.
 * Deliberately separate from invoiced revenue (see kpi/revenue.ts).
 *
 * sale.order.amount_total is in the order's own currency; converted to
 * company currency (CAD) via currency_rate — see currency.ts for the
 * verified conversion direction. Rows are fetched (bounded by the caller's
 * date range) and reduced here rather than via formatted_read_group,
 * because Odoo cannot sum a converted amount server-side.
 */

interface SaleOrderRow {
  id: number;
  name: string;
  amount_total: number;
  currency_rate: number | null;
  date_order: string;
  partner_id: [number, string] | false;
}

const ORDER_FIELDS = ["name", "amount_total", "currency_rate", "date_order", "partner_id"];

export async function fetchConfirmedOrders(range: DateRange, limit = 10_000): Promise<SaleOrderRow[]> {
  return readOdoo<SaleOrderRow[]>("sale.order", "search_read", {
    domain: [
      ["state", "=", "sale"],
      ["date_order", ">=", range.startISO],
      ["date_order", "<", range.endISO],
    ],
    fields: ORDER_FIELDS,
    limit,
  });
}

export async function fetchOpenQuotations(limit = 10_000): Promise<SaleOrderRow[]> {
  return readOdoo<SaleOrderRow[]>("sale.order", "search_read", {
    domain: [["state", "in", ["draft", "sent"]]],
    fields: ORDER_FIELDS,
    limit,
  });
}

export interface SalesBookedSummary {
  totalCompanyCurrency: number;
  orderCount: number;
  averageOrderValue: number;
}

export function summarizeSalesBooked(orders: SaleOrderRow[]): SalesBookedSummary {
  const total = orders.reduce(
    (sum, o) => sum + toCompanyCurrency(o.amount_total, o.currency_rate),
    0,
  );
  return {
    totalCompanyCurrency: total,
    orderCount: orders.length,
    averageOrderValue: orders.length ? total / orders.length : 0,
  };
}

export interface QuotationAgingBucket {
  label: string;
  count: number;
  valueCompanyCurrency: number;
}

/** Buckets open quotations by age (days since date_order) as of `now`. */
export function bucketQuotationAging(
  quotations: SaleOrderRow[],
  now: Date = new Date(),
): QuotationAgingBucket[] {
  const buckets: QuotationAgingBucket[] = [
    { label: "<7 days", count: 0, valueCompanyCurrency: 0 },
    { label: "7-14 days", count: 0, valueCompanyCurrency: 0 },
    { label: "15-30 days", count: 0, valueCompanyCurrency: 0 },
    { label: ">30 days", count: 0, valueCompanyCurrency: 0 },
  ];

  for (const q of quotations) {
    const ageDays = Math.floor((now.getTime() - new Date(q.date_order).getTime()) / 86_400_000);
    const bucket =
      ageDays < 7 ? buckets[0] : ageDays < 14 ? buckets[1] : ageDays < 30 ? buckets[2] : buckets[3];
    if (!bucket) continue;
    bucket.count += 1;
    bucket.valueCompanyCurrency += toCompanyCurrency(q.amount_total, q.currency_rate);
  }
  return buckets;
}

export type { SaleOrderRow };
