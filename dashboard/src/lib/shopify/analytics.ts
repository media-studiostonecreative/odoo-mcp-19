// dashboard/src/lib/shopify/analytics.ts
import "server-only";

import { callShopifyGraphQL, isShopifyConfigured, ShopifyRequestError } from "./client";

export interface LandingPageFunnelRow {
  landingPage: string;
  sessions: number;
  addToCarts: number;
  checkouts: number;
  conversions: number;
}

/**
 * ShopifyQL query. UNVERIFIED against a live store — SHOPIFY_ADMIN_ACCESS_TOKEN
 * has never been configured in this environment, so this has not been run
 * against the real Admin API. The dataset/field names below (`sessions`,
 * `add_to_carts`, `checkouts`, `sessions_converted`, `landing_page`) match
 * Shopify's documented Sessions dataset as of API version 2025-01, but if
 * Shopify has since renamed anything, this will surface as a `parseErrors`
 * entry (handled below, not swallowed) rather than silently returning wrong
 * numbers. Fix the query string here if that happens — do not paper over it.
 */
const FUNNEL_QUERY = `
  FROM sessions
  SHOW sessions, add_to_carts, checkouts, sessions_converted
  BY landing_page
  SINCE -30d
  UNTIL today
  ORDER BY sessions DESC
  LIMIT 25
`;

interface ShopifyQLTableResponse {
  shopifyqlQuery: {
    tableData?: {
      rowData: string[][];
      columns: { name: string }[];
    };
    parseErrors?: { code: string; message: string }[];
  };
}

export interface FunnelResult {
  configured: boolean;
  rows: LandingPageFunnelRow[];
}

/** Session→cart→checkout→purchase funnel by landing page, trailing 30 days. Returns
 * `{configured: false}` (never fabricated data) when Shopify credentials aren't set. */
export async function fetchLandingPageFunnel(): Promise<FunnelResult> {
  if (!isShopifyConfigured()) return { configured: false, rows: [] };

  const data = await callShopifyGraphQL<ShopifyQLTableResponse>(`query { shopifyqlQuery(query: ${JSON.stringify(FUNNEL_QUERY)}) {
    ... on TableResponse { tableData { rowData columns { name } } }
    parseErrors { code message }
  } }`);

  const result = data.shopifyqlQuery;
  if (result.parseErrors && result.parseErrors.length > 0) {
    throw new ShopifyRequestError(`ShopifyQL parse error: ${result.parseErrors.map((e) => e.message).join("; ")}`);
  }
  if (!result.tableData) return { configured: true, rows: [] };

  const rows: LandingPageFunnelRow[] = result.tableData.rowData.map((row) => ({
    landingPage: row[0] ?? "(unknown)",
    sessions: Number(row[1]) || 0,
    addToCarts: Number(row[2]) || 0,
    checkouts: Number(row[3]) || 0,
    conversions: Number(row[4]) || 0,
  }));

  return { configured: true, rows };
}
