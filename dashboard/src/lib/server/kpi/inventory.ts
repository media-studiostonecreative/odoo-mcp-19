import "server-only";

import { readOdoo } from "../safe-odoo";

interface ProductRow {
  id: number;
  name: string;
  default_code: string | false;
  qty_available: number;
  virtual_available: number;
}

interface SaleOrderLineVelocityRow {
  product_id: [number, string] | false;
  product_uom_qty: number;
}

export interface InventoryAttentionRow {
  productId: number;
  product: string;
  sku: string | null;
  qtyAvailable: number;
  qtyForecast: number;
  unitsSoldTrailing60Days: number;
}

const LOW_STOCK_THRESHOLD = 10;
const VELOCITY_WINDOW_DAYS = 60;

/**
 * Low-stock, storable products combined with recent sales velocity.
 * qty_available / virtual_available are non-stored computed fields in this
 * Odoo instance (confirmed live: filtering on them in a `domain` raises
 * "Cannot convert ... to SQL because it is not stored"), so every active
 * storable product is fetched and the low-stock filter is applied here in
 * application code instead. No forecasting is performed — see brief.
 */
export async function inventoryAttention(): Promise<InventoryAttentionRow[]> {
  const products = await readOdoo<ProductRow[]>("product.product", "search_read", {
    domain: [
      ["is_storable", "=", true],
      ["active", "=", true],
    ],
    fields: ["name", "default_code", "qty_available", "virtual_available"],
    limit: 5000,
  });

  const lowStock = products.filter((p) => p.qty_available <= LOW_STOCK_THRESHOLD);
  if (lowStock.length === 0) return [];

  const since = new Date();
  since.setDate(since.getDate() - VELOCITY_WINDOW_DAYS);
  const sinceISO = since.toISOString().slice(0, 10);

  const lowStockIds = lowStock.map((p) => p.id);
  const lines = await readOdoo<SaleOrderLineVelocityRow[]>("sale.order.line", "search_read", {
    domain: [
      ["product_id", "in", lowStockIds],
      ["order_id.state", "=", "sale"],
      ["order_id.date_order", ">=", sinceISO],
    ],
    fields: ["product_id", "product_uom_qty"],
    limit: 20_000,
  });

  const soldByProduct = new Map<number, number>();
  for (const line of lines) {
    if (!line.product_id) continue;
    const [productId] = line.product_id;
    soldByProduct.set(productId, (soldByProduct.get(productId) ?? 0) + line.product_uom_qty);
  }

  return lowStock
    .map((p) => ({
      productId: p.id,
      product: p.name,
      sku: p.default_code || null,
      qtyAvailable: p.qty_available,
      qtyForecast: p.virtual_available,
      unitsSoldTrailing60Days: soldByProduct.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.unitsSoldTrailing60Days - a.unitsSoldTrailing60Days);
}
