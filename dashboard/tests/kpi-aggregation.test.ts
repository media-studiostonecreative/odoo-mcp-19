import { describe, it, expect, vi, beforeEach } from "vitest";
import { toCompanyCurrency } from "@/lib/server/currency";
import { percentChange } from "@/lib/server/periods";
import {
  summarizeSalesBooked,
  bucketQuotationAging,
  type SaleOrderRow,
} from "@/lib/server/kpi/sales";
import { topCustomersFromOrders } from "@/lib/server/kpi/customers";

describe("toCompanyCurrency", () => {
  it("divides by currency_rate to recover the company-currency amount (verified against a live USD order/CAD invoice pair)", () => {
    // Real numbers from studiostone.odoo.com: SO-2026-03167, amount_total=1072,
    // currency_rate=0.7247427163357009, matching invoice amount_total_signed=1479.15.
    expect(toCompanyCurrency(1072, 0.7247427163357009)).toBeCloseTo(1479.15, 1);
  });

  it("returns the amount unchanged when currency_rate is 1 (or falsy)", () => {
    expect(toCompanyCurrency(500, 1)).toBe(500);
    expect(toCompanyCurrency(500, null)).toBe(500);
    expect(toCompanyCurrency(500, 0)).toBe(500);
  });
});

describe("percentChange", () => {
  it("computes a positive change correctly", () => {
    expect(percentChange(120, 100)).toBeCloseTo(20, 5);
  });
  it("computes a negative change correctly", () => {
    expect(percentChange(80, 100)).toBeCloseTo(-20, 5);
  });
  it("returns null when the previous value is zero (undefined comparison)", () => {
    expect(percentChange(50, 0)).toBeNull();
  });
});

function makeOrder(overrides: Partial<SaleOrderRow>): SaleOrderRow {
  return {
    id: 1,
    name: "SO-TEST",
    amount_total: 100,
    currency_rate: 1,
    date_order: "2026-06-15",
    partner_id: [1, "Test Customer"],
    ...overrides,
  };
}

describe("summarizeSalesBooked", () => {
  it("sums company-currency amounts and computes the average order value", () => {
    const orders = [
      makeOrder({ id: 1, amount_total: 1072, currency_rate: 0.7247427163357009 }),
      makeOrder({ id: 2, amount_total: 500, currency_rate: 1 }),
    ];
    const summary = summarizeSalesBooked(orders);
    expect(summary.orderCount).toBe(2);
    expect(summary.totalCompanyCurrency).toBeCloseTo(1479.15 + 500, 1);
    expect(summary.averageOrderValue).toBeCloseTo(summary.totalCompanyCurrency / 2, 5);
  });

  it("returns zeroes for an empty order list without dividing by zero", () => {
    const summary = summarizeSalesBooked([]);
    expect(summary.orderCount).toBe(0);
    expect(summary.totalCompanyCurrency).toBe(0);
    expect(summary.averageOrderValue).toBe(0);
  });
});

describe("bucketQuotationAging", () => {
  const now = new Date("2026-06-30T00:00:00Z");

  it("places quotations into the correct age bucket relative to `now`", () => {
    const quotations = [
      makeOrder({ id: 1, date_order: "2026-06-29" }), // 1 day -> <7
      makeOrder({ id: 2, date_order: "2026-06-20" }), // 10 days -> 7-14
      makeOrder({ id: 3, date_order: "2026-06-10" }), // 20 days -> 15-30
      makeOrder({ id: 4, date_order: "2026-05-01" }), // >30 days
    ];
    const buckets = bucketQuotationAging(quotations, now);
    expect(buckets.map((b) => b.count)).toEqual([1, 1, 1, 1]);
  });

  it("sums company-currency value per bucket", () => {
    const quotations = [
      makeOrder({ id: 1, date_order: "2026-06-29", amount_total: 200, currency_rate: 1 }),
      makeOrder({ id: 2, date_order: "2026-06-28", amount_total: 300, currency_rate: 1 }),
    ];
    const buckets = bucketQuotationAging(quotations, now);
    expect(buckets[0]?.valueCompanyCurrency).toBe(500);
  });
});

describe("topCustomersFromOrders", () => {
  it("aggregates revenue/order count per customer and sorts descending by revenue", () => {
    const orders = [
      makeOrder({ id: 1, partner_id: [1, "Alpha"], amount_total: 100 }),
      makeOrder({ id: 2, partner_id: [1, "Alpha"], amount_total: 50, date_order: "2026-07-01" }),
      makeOrder({ id: 3, partner_id: [2, "Beta"], amount_total: 500 }),
    ];
    const rows = topCustomersFromOrders(orders, 10);
    expect(rows[0]?.customer).toBe("Beta");
    expect(rows[1]?.customer).toBe("Alpha");
    expect(rows[1]?.revenueCompanyCurrency).toBe(150);
    expect(rows[1]?.orderCount).toBe(2);
    expect(rows[1]?.lastOrderDate).toBe("2026-07-01");
  });

  it("respects the limit parameter", () => {
    const orders = Array.from({ length: 20 }, (_, i) =>
      makeOrder({ id: i, partner_id: [i, `Customer ${i}`], amount_total: i + 1 }),
    );
    expect(topCustomersFromOrders(orders, 5)).toHaveLength(5);
  });
});

describe("invoicedRevenueForRange (mocked Odoo)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("sums amount_total_signed for posted out_invoice/out_refund moves in range", async () => {
    vi.doMock("@/lib/server/safe-odoo", () => ({
      readOdoo: vi.fn().mockResolvedValue([{ "amount_total_signed:sum": 42_000 }]),
    }));
    const { invoicedRevenueForRange } = await import("@/lib/server/kpi/revenue");
    const total = await invoicedRevenueForRange({ startISO: "2026-01-01", endISO: "2026-02-01" });
    expect(total).toBe(42_000);
  });

  it("treats an empty result as zero revenue rather than throwing", async () => {
    vi.doMock("@/lib/server/safe-odoo", () => ({
      readOdoo: vi.fn().mockResolvedValue([]),
    }));
    const { invoicedRevenueForRange } = await import("@/lib/server/kpi/revenue");
    const total = await invoicedRevenueForRange({ startISO: "2026-01-01", endISO: "2026-02-01" });
    expect(total).toBe(0);
  });
});
