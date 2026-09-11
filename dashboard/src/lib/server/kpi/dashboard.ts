import "server-only";

import { cached } from "../cache";
import { resolvePeriod, percentChange, type PeriodKey } from "../periods";
import { getTargets } from "../targets";
import { invoicedRevenueForRange, invoicedRevenueMonthlySeries } from "./revenue";
import {
  fetchConfirmedOrders,
  fetchOpenQuotations,
  summarizeSalesBooked,
  bucketQuotationAging,
} from "./sales";
import { topCustomersFromOrders, countNewCustomers } from "./customers";
import { topProductsFromOrders } from "./products";
import { inventoryAttention } from "./inventory";
import { recentConfirmedOrders } from "./activity";
import { regionsForCountryIds } from "../regions";
import { readOdoo } from "../safe-odoo";
import { toCompanyCurrency } from "../currency";

export interface KpiValue {
  value: number;
  previousValue: number | null;
  changePct: number | null;
}

function toKpi(value: number, previousValue: number | null): KpiValue {
  return {
    value,
    previousValue,
    changePct: previousValue == null ? null : percentChange(value, previousValue),
  };
}

async function buildDashboard(period: PeriodKey) {
  const now = new Date();
  const monthRange = resolvePeriod("month", now);
  const ytdRange = resolvePeriod("ytd", now);
  const selected = resolvePeriod(period, now);
  const year = now.getFullYear();

  const [
    revenueThisMonth,
    revenueThisMonthPrev,
    revenueYTD,
    revenueYTDPrev,
    monthlySeries,
    monthlySeriesPrevYear,
    confirmedThisMonth,
    confirmedThisMonthPrev,
    openQuotations,
    newCustomersThisMonth,
    newCustomersPrevMonth,
    selectedConfirmedOrders,
    inventory,
    recentActivity,
    targets,
  ] = await Promise.all([
    invoicedRevenueForRange(monthRange.current),
    invoicedRevenueForRange(monthRange.previous),
    invoicedRevenueForRange(ytdRange.current),
    invoicedRevenueForRange(ytdRange.previous),
    invoicedRevenueMonthlySeries(year),
    invoicedRevenueMonthlySeries(year - 1),
    fetchConfirmedOrders(monthRange.current),
    fetchConfirmedOrders(monthRange.previous),
    fetchOpenQuotations(),
    countNewCustomers(monthRange.current),
    countNewCustomers(monthRange.previous),
    fetchConfirmedOrders(selected.current),
    inventoryAttention(),
    recentConfirmedOrders(10),
    Promise.resolve(getTargets()),
  ]);

  const salesBookedThisMonth = summarizeSalesBooked(confirmedThisMonth);
  const salesBookedThisMonthPrev = summarizeSalesBooked(confirmedThisMonthPrev);
  const openQuotationsSummary = summarizeSalesBooked(openQuotations);
  const aging = bucketQuotationAging(openQuotations);

  const topCustomers = topCustomersFromOrders(selectedConfirmedOrders, 10);
  const topProducts = await topProductsFromOrders(selectedConfirmedOrders, 10);

  // Regional performance for the selected period's confirmed orders.
  const partnerIds = [
    ...new Set(
      selectedConfirmedOrders
        .map((o) => (o.partner_id ? o.partner_id[0] : null))
        .filter((id): id is number => id != null),
    ),
  ];
  const partnerRows =
    partnerIds.length > 0
      ? await readOdoo<{ id: number; country_id: [number, string] | false }[]>(
          "res.partner",
          "search_read",
          { domain: [["id", "in", partnerIds]], fields: ["country_id"] },
        )
      : [];
  const countryIdByPartner = new Map(
    partnerRows.map((p) => [p.id, p.country_id ? p.country_id[0] : null]),
  );
  const regionByCountryId = await regionsForCountryIds([...countryIdByPartner.values()]);

  const REGION_BUCKETS = ["Canada", "United States", "United Kingdom", "European Union", "Other"];
  const regionalTotals = new Map<string, { revenue: number; orders: number }>(
    REGION_BUCKETS.map((region) => [region, { revenue: 0, orders: 0 }]),
  );
  for (const order of selectedConfirmedOrders) {
    const partnerId = order.partner_id ? order.partner_id[0] : null;
    const countryId = partnerId != null ? countryIdByPartner.get(partnerId) ?? null : null;
    const region = regionByCountryId.get(countryId ?? null) ?? "Other";
    const entry = regionalTotals.get(region) ?? { revenue: 0, orders: 0 };
    entry.revenue += toCompanyCurrency(order.amount_total, order.currency_rate);
    entry.orders += 1;
    regionalTotals.set(region, entry);
  }
  const regionalPerformance = [...regionalTotals.entries()].map(([region, v]) => ({
    region,
    revenueCompanyCurrency: v.revenue,
    orderCount: v.orders,
  }));

  const ytdActual = revenueYTD;
  const annualProgressPct = targets.annual_revenue_target
    ? (ytdActual / targets.annual_revenue_target) * 100
    : null;

  return {
    meta: {
      lastRefreshed: now.toISOString(),
      period,
      periodLabel: selected.label,
    },
    kpis: {
      revenueThisMonth: toKpi(revenueThisMonth, revenueThisMonthPrev),
      revenueYTD: toKpi(revenueYTD, revenueYTDPrev),
      salesBookedThisMonth: toKpi(
        salesBookedThisMonth.totalCompanyCurrency,
        salesBookedThisMonthPrev.totalCompanyCurrency,
      ),
      openQuotationValue: toKpi(openQuotationsSummary.totalCompanyCurrency, null),
      averageConfirmedOrderValue: toKpi(
        salesBookedThisMonth.averageOrderValue,
        salesBookedThisMonthPrev.averageOrderValue,
      ),
      newCustomersThisMonth: toKpi(newCustomersThisMonth, newCustomersPrevMonth),
    },
    revenueVsTarget: {
      monthly: monthlySeries,
      monthlyTarget: targets.monthly_revenue_target,
      annualTarget: targets.annual_revenue_target,
      ytdActual,
      annualProgressPct,
    },
    revenueTrend: {
      currentYear: monthlySeries,
      previousYear: monthlySeriesPrevYear,
    },
    quotationPipeline: {
      openCount: openQuotationsSummary.orderCount,
      openValueCompanyCurrency: openQuotationsSummary.totalCompanyCurrency,
      aging,
    },
    topCustomers,
    topProducts,
    regionalPerformance,
    inventoryAttention: inventory,
    recentActivity,
    targets,
  };
}

export type DashboardData = Awaited<ReturnType<typeof buildDashboard>>;

export async function getDashboardData(period: PeriodKey): Promise<DashboardData> {
  return cached(`dashboard:${period}`, () => buildDashboard(period), 45_000);
}
