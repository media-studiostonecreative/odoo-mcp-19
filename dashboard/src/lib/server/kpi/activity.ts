import "server-only";

import { readOdoo } from "../safe-odoo";

export interface RecentOrderRow {
  orderNumber: string;
  customer: string;
  date: string;
  total: number;
  currency: string;
  status: string;
}

interface RawRow {
  name: string;
  partner_id: [number, string] | false;
  date_order: string;
  amount_total: number;
  currency_id: [number, string] | false;
  state: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Quotation",
  sent: "Quotation Sent",
  sale: "Confirmed",
  cancel: "Cancelled",
};

export async function recentConfirmedOrders(limit = 10): Promise<RecentOrderRow[]> {
  const rows = await readOdoo<RawRow[]>("sale.order", "search_read", {
    domain: [["state", "=", "sale"]],
    fields: ["name", "partner_id", "date_order", "amount_total", "currency_id", "state"],
    limit,
    order: "date_order desc",
  });

  return rows.map((r) => ({
    orderNumber: r.name,
    customer: r.partner_id ? r.partner_id[1] : "—",
    date: r.date_order,
    total: r.amount_total,
    currency: r.currency_id ? r.currency_id[1] : "",
    status: STATUS_LABELS[r.state] ?? r.state,
  }));
}
