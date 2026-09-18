import "server-only";

import { toCompanyCurrency } from "./currency";
import type { SaleOrderWithState } from "./quotations";

export interface ConversionSummary {
  wonCount: number;
  lostCount: number;
  winRate: number;
  dropRate: number;
  revenue: number;
  avgDealSize: number;
}

/** Filters `orders` to won (state=sale) / lost (state=cancel) internally — safe to pass an unfiltered list. */
export function summarizeConversion(orders: SaleOrderWithState[]): ConversionSummary {
  const won = orders.filter((o) => o.state === "sale");
  const lost = orders.filter((o) => o.state === "cancel");
  const resolvedCount = won.length + lost.length;
  const revenue = won.reduce((sum, o) => sum + toCompanyCurrency(o.amount_total, o.currency_rate), 0);
  return {
    wonCount: won.length,
    lostCount: lost.length,
    winRate: resolvedCount ? (won.length / resolvedCount) * 100 : 0,
    dropRate: resolvedCount ? (lost.length / resolvedCount) * 100 : 0,
    revenue,
    avgDealSize: won.length ? revenue / won.length : 0,
  };
}

export interface ConversionComparison {
  current: ConversionSummary;
  previous: ConversionSummary;
  winRateDelta: number;
  dropRateDelta: number;
  revenueDelta: number;
}

export function compareConversion(current: ConversionSummary, previous: ConversionSummary): ConversionComparison {
  return {
    current,
    previous,
    winRateDelta: current.winRate - previous.winRate,
    dropRateDelta: current.dropRate - previous.dropRate,
    revenueDelta: current.revenue - previous.revenue,
  };
}
