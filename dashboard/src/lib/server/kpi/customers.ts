import "server-only";

import { readOdoo } from "../safe-odoo";
import { toCompanyCurrency } from "../currency";
import type { DateRange } from "../periods";
import type { SaleOrderRow } from "./sales";

export interface TopCustomerRow {
  partnerId: number;
  customer: string;
  revenueCompanyCurrency: number;
  orderCount: number;
  lastOrderDate: string;
}

/** Ranks customers by booked sales within the already-fetched confirmed orders for a period. */
export function topCustomersFromOrders(orders: SaleOrderRow[], limit = 10): TopCustomerRow[] {
  const byPartner = new Map<number, TopCustomerRow>();
  for (const order of orders) {
    if (!order.partner_id) continue;
    const [partnerId, name] = order.partner_id;
    const existing = byPartner.get(partnerId);
    const amount = toCompanyCurrency(order.amount_total, order.currency_rate);
    if (existing) {
      existing.revenueCompanyCurrency += amount;
      existing.orderCount += 1;
      if (order.date_order > existing.lastOrderDate) existing.lastOrderDate = order.date_order;
    } else {
      byPartner.set(partnerId, {
        partnerId,
        customer: name,
        revenueCompanyCurrency: amount,
        orderCount: 1,
        lastOrderDate: order.date_order,
      });
    }
  }
  return [...byPartner.values()]
    .sort((a, b) => b.revenueCompanyCurrency - a.revenueCompanyCurrency)
    .slice(0, limit);
}

/**
 * New customers this month: res.partner records marked as customers
 * (customer_rank > 0) whose own create_date falls in the given range.
 * This is an approximation of "became a customer this month" — Odoo has
 * no dedicated "became a customer" timestamp — documented here rather than
 * silently assumed.
 */
export async function countNewCustomers(range: DateRange): Promise<number> {
  return readOdoo<number>("res.partner", "search_count", {
    domain: [
      ["customer_rank", ">", 0],
      ["create_date", ">=", range.startISO],
      ["create_date", "<", range.endISO],
    ],
  });
}
