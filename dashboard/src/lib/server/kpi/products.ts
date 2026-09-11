import "server-only";

import { readOdoo } from "../safe-odoo";
import { toCompanyCurrency } from "../currency";
import type { SaleOrderRow } from "./sales";

interface SaleOrderLineRow {
  product_id: [number, string] | false;
  product_uom_qty: number;
  price_subtotal: number;
  order_id: [number, string];
}

export interface TopProductRow {
  productId: number;
  product: string;
  unitsSold: number;
  bookedSalesCompanyCurrency: number;
}

/**
 * Top products by booked sales within a set of already-fetched confirmed
 * orders. Lines are fetched by order_id membership (rather than filtering
 * on order_id.state/date_order dot-notation, which CLAUDE.md's known
 * model-limitations flag as fragile on computed/related fields) and each
 * line's price_subtotal is converted using its own order's currency_rate.
 */
export async function topProductsFromOrders(
  orders: SaleOrderRow[],
  limit = 10,
): Promise<TopProductRow[]> {
  if (orders.length === 0) return [];
  const rateByOrderId = new Map(orders.map((o) => [o.id, o.currency_rate]));
  const orderIds = orders.map((o) => o.id);

  const lines = await readOdoo<SaleOrderLineRow[]>("sale.order.line", "search_read", {
    domain: [["order_id", "in", orderIds]],
    fields: ["product_id", "product_uom_qty", "price_subtotal", "order_id"],
    limit: 50_000,
  });

  const byProduct = new Map<number, TopProductRow>();
  for (const line of lines) {
    if (!line.product_id) continue;
    const [productId, name] = line.product_id;
    const rate = rateByOrderId.get(line.order_id[0]);
    const amount = toCompanyCurrency(line.price_subtotal, rate);
    const existing = byProduct.get(productId);
    if (existing) {
      existing.unitsSold += line.product_uom_qty;
      existing.bookedSalesCompanyCurrency += amount;
    } else {
      byProduct.set(productId, {
        productId,
        product: name,
        unitsSold: line.product_uom_qty,
        bookedSalesCompanyCurrency: amount,
      });
    }
  }
  return [...byProduct.values()]
    .sort((a, b) => b.bookedSalesCompanyCurrency - a.bookedSalesCompanyCurrency)
    .slice(0, limit);
}
