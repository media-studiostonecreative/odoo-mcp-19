// dashboard/src/lib/shopify/analytics.ts
import "server-only";

import { callShopifyGraphQL, isShopifyConfigured, ShopifyRequestError } from "./client";

export interface LandingPageFunnelRow {
  landingPage: string;
  sessions: number;
  sessionsWithCartAdditions: number;
  sessionsThatCompletedCheckout: number;
  conversionRate: number; // 0-1 fraction, as ShopifyQL returns it
}

/**
 * ShopifyQL query. Verified directly against the real Admin API (2026-07) on
 * 2026-09-22 — the dataset/column names below are confirmed correct, not
 * guessed (an earlier version of this file guessed wrong names; every guess
 * failed with a `parseErrors` entry rather than silently returning wrong
 * data, which is exactly why that field is never swallowed below). There is
 * no separate "sessions_converted"/"checkouts" column — the sessions
 * dataset's real names are sessions_with_cart_additions,
 * sessions_that_completed_checkout, and conversion_rate (a fraction, not a
 * raw converted-session count).
 */
const FUNNEL_QUERY = `
  FROM sessions
  SHOW sessions, sessions_with_cart_additions, sessions_that_completed_checkout, conversion_rate
  GROUP BY landing_page_path
  SINCE -30d
  UNTIL today
  ORDER BY sessions DESC
  LIMIT 25
`;

interface ShopifyQLTableResponse {
  shopifyqlQuery: {
    tableData: {
      columns: { name: string; dataType: string; displayName: string }[];
      // Each row is an object keyed by column name; ShopifyQL returns every value as a string
      // regardless of dataType (confirmed empirically — INTEGER/PERCENT columns are still strings).
      rows: Record<string, string>[];
    } | null;
    parseErrors: string[];
  };
}

export interface FunnelResult {
  configured: boolean;
  rows: LandingPageFunnelRow[];
}

/** Session→cart→checkout funnel by landing page, trailing 30 days. Returns
 * `{configured: false}` (never fabricated data) when Shopify credentials aren't set. */
export async function fetchLandingPageFunnel(): Promise<FunnelResult> {
  if (!isShopifyConfigured()) return { configured: false, rows: [] };

  const data = await callShopifyGraphQL<ShopifyQLTableResponse>(`query {
    shopifyqlQuery(query: ${JSON.stringify(FUNNEL_QUERY)}) {
      tableData { columns { name dataType displayName } rows }
      parseErrors
    }
  }`);

  const result = data.shopifyqlQuery;
  if (result.parseErrors.length > 0) {
    throw new ShopifyRequestError(`ShopifyQL parse error: ${result.parseErrors.join("; ")}`);
  }
  if (!result.tableData) return { configured: true, rows: [] };

  const rows: LandingPageFunnelRow[] = result.tableData.rows.map((row) => ({
    landingPage: row.landing_page_path || "(unknown)",
    sessions: Number(row.sessions) || 0,
    sessionsWithCartAdditions: Number(row.sessions_with_cart_additions) || 0,
    sessionsThatCompletedCheckout: Number(row.sessions_that_completed_checkout) || 0,
    conversionRate: Number(row.conversion_rate) || 0,
  }));

  return { configured: true, rows };
}
