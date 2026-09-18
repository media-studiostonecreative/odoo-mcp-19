import "server-only";

import { readOdoo } from "./client";
import type { DateRange } from "./periods";

/**
 * Open Odoo quotations WITH state, so callers can tell "not yet sent"
 * (draft) apart from "sent, no reply" (sent). Deliberately a narrow slice
 * of what the full kpi/sales.ts had in the pre-rebuild app — conversion
 * rate / revenue / aging-bucket concerns belong to Phase 2 (Business Data),
 * not Phase 1 (Issues).
 */
export interface SaleOrderWithState {
  id: number;
  name: string;
  amount_total: number;
  currency_rate: number | null;
  date_order: string;
  partner_id: [number, string] | false;
  state: string;
}

const ORDER_FIELDS = ["name", "amount_total", "currency_rate", "date_order", "partner_id", "state"];

export async function fetchOpenQuotations(limit = 10_000): Promise<SaleOrderWithState[]> {
  return readOdoo<SaleOrderWithState[]>("sale.order", "search_read", {
    domain: [["state", "in", ["draft", "sent"]]],
    fields: ORDER_FIELDS,
    limit,
  });
}

/** Won (state=sale) or lost (state=cancel) quotations whose date_order falls inside `range`. */
export async function fetchResolvedQuotations(range: DateRange, limit = 10_000): Promise<SaleOrderWithState[]> {
  return readOdoo<SaleOrderWithState[]>("sale.order", "search_read", {
    domain: [
      ["state", "in", ["sale", "cancel"]],
      ["date_order", ">=", range.startISO],
      ["date_order", "<", range.endISO],
    ],
    fields: ORDER_FIELDS,
    limit,
  });
}
