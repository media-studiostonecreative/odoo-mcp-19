import { describe, it, expect } from "vitest";
import { summarizeConversion, compareConversion } from "@/lib/odoo/conversion";
import type { SaleOrderWithState } from "@/lib/odoo/quotations";

function order(overrides: Partial<SaleOrderWithState>): SaleOrderWithState {
  return {
    id: 1,
    name: "S00001",
    amount_total: 100,
    currency_rate: null,
    date_order: "2026-03-01",
    partner_id: false,
    state: "sale",
    ...overrides,
  };
}

describe("summarizeConversion", () => {
  it("returns all zeros for an empty list", () => {
    expect(summarizeConversion([])).toEqual({
      wonCount: 0,
      lostCount: 0,
      winRate: 0,
      dropRate: 0,
      revenue: 0,
      avgDealSize: 0,
    });
  });

  it("computes win rate, drop rate, revenue, and avg deal size for a mix", () => {
    const orders = [
      order({ id: 1, state: "sale", amount_total: 100, currency_rate: null }),
      order({ id: 2, state: "sale", amount_total: 300, currency_rate: null }),
      order({ id: 3, state: "cancel", amount_total: 50, currency_rate: null }),
    ];
    const summary = summarizeConversion(orders);
    expect(summary.wonCount).toBe(2);
    expect(summary.lostCount).toBe(1);
    expect(summary.winRate).toBeCloseTo((2 / 3) * 100, 5);
    expect(summary.dropRate).toBeCloseTo((1 / 3) * 100, 5);
    expect(summary.revenue).toBe(400);
    expect(summary.avgDealSize).toBe(200);
  });

  it("ignores orders in states other than sale/cancel", () => {
    const orders = [order({ state: "sale" }), order({ state: "draft" }), order({ state: "sent" })];
    const summary = summarizeConversion(orders);
    expect(summary.wonCount).toBe(1);
    expect(summary.lostCount).toBe(0);
    expect(summary.winRate).toBe(100);
  });

  it("converts revenue via currency_rate", () => {
    const orders = [order({ state: "sale", amount_total: 1072.0, currency_rate: 0.7247427163357009 })];
    const summary = summarizeConversion(orders);
    expect(summary.revenue).toBeCloseTo(1479.15, 1);
  });

  it("all-lost: win rate 0, drop rate 100, revenue 0", () => {
    const orders = [order({ state: "cancel" }), order({ state: "cancel" })];
    const summary = summarizeConversion(orders);
    expect(summary.winRate).toBe(0);
    expect(summary.dropRate).toBe(100);
    expect(summary.revenue).toBe(0);
    expect(summary.avgDealSize).toBe(0);
  });
});

describe("compareConversion", () => {
  it("computes deltas as current minus previous", () => {
    const current = summarizeConversion([order({ state: "sale", amount_total: 300 }), order({ state: "cancel" })]);
    const previous = summarizeConversion([order({ state: "sale", amount_total: 100 }), order({ state: "sale", amount_total: 100 })]);
    const cmp = compareConversion(current, previous);
    expect(cmp.current).toBe(current);
    expect(cmp.previous).toBe(previous);
    expect(cmp.winRateDelta).toBeCloseTo(current.winRate - previous.winRate, 5);
    expect(cmp.dropRateDelta).toBeCloseTo(current.dropRate - previous.dropRate, 5);
    expect(cmp.revenueDelta).toBe(300 - 200);
  });

  it("handles a zero previous period without dividing by zero", () => {
    const current = summarizeConversion([order({ state: "sale", amount_total: 100 })]);
    const previous = summarizeConversion([]);
    const cmp = compareConversion(current, previous);
    expect(cmp.winRateDelta).toBe(100);
    expect(cmp.revenueDelta).toBe(100);
  });
});
