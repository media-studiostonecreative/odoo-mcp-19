import "server-only";

import { readFileSync } from "node:fs";
import { resolveRootEnvPath, parseEnvFile } from "../env";

/**
 * Server-side, read-only Shopify Admin GraphQL client. Optional: every
 * caller must handle `null` credentials (Shopify not connected) and degrade
 * to an honest "not connected" state — never fabricated data.
 *
 * Since January 2026, Shopify no longer issues long-lived static Admin API
 * access tokens for new custom ("Dev Dashboard") apps — only a Client ID and
 * Client Secret are shown. An access token is obtained on demand via the
 * OAuth client credentials grant (POST /admin/oauth/access_token) and is
 * only valid for 24h (86399s), so it's fetched fresh and cached in memory
 * rather than read once from .env like the old shpat_ tokens were. This
 * only works when the app and the store are in the same Shopify
 * organization — see https://shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens.
 */

// 2026-07 is the minimum version that exposes shopifyqlQuery — verified against
// Shopify's docs and the real Admin API on 2026-09-22.
const API_VERSION = "2026-07";

export interface ShopifyCredentials {
  storeDomain: string;
  clientId: string;
  clientSecret: string;
}

export function loadShopifyCredentials(): ShopifyCredentials | null {
  let raw: string;
  try {
    raw = readFileSync(resolveRootEnvPath(), "utf-8");
  } catch {
    return null;
  }
  const values = parseEnvFile(raw);
  const storeDomain = values.SHOPIFY_STORE_DOMAIN;
  const clientId = values.SHOPIFY_CLIENT_ID;
  const clientSecret = values.SHOPIFY_CLIENT_SECRET;
  if (!storeDomain || !clientId || !clientSecret) return null;
  return { storeDomain: storeDomain.replace(/^https?:\/\//, "").replace(/\/+$/, ""), clientId, clientSecret };
}

export function isShopifyConfigured(): boolean {
  return loadShopifyCredentials() != null;
}

export class ShopifyNotConfiguredError extends Error {
  constructor() {
    super("Shopify is not connected — SHOPIFY_STORE_DOMAIN / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET missing from .env.");
    this.name = "ShopifyNotConfiguredError";
  }
}

export class ShopifyRequestError extends Error {
  readonly status: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ShopifyRequestError";
    this.status = status;
  }
}

interface CachedToken {
  accessToken: string;
  storeDomain: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

// 60s safety margin so a token doesn't expire mid-request.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

async function getAccessToken(creds: ShopifyCredentials): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.storeDomain === creds.storeDomain && tokenCache.expiresAt - EXPIRY_SAFETY_MARGIN_MS > now) {
    return tokenCache.accessToken;
  }

  const response = await fetch(`https://${creds.storeDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }).toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ShopifyRequestError("Failed to obtain a Shopify access token — check SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET and that the app is installed on this store.", response.status);
  }

  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token || !body.expires_in) {
    throw new ShopifyRequestError("Shopify token response had no access_token/expires_in.");
  }

  tokenCache = { accessToken: body.access_token, storeDomain: creds.storeDomain, expiresAt: now + body.expires_in * 1000 };
  return tokenCache.accessToken;
}

export async function callShopifyGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const creds = loadShopifyCredentials();
  if (!creds) throw new ShopifyNotConfiguredError();

  const accessToken = await getAccessToken(creds);

  const response = await fetch(`https://${creds.storeDomain}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) throw new ShopifyRequestError("Shopify Admin API request failed", response.status);

  const body = (await response.json()) as { data?: T; errors?: unknown[] };
  if (body.errors && body.errors.length > 0) {
    throw new ShopifyRequestError(`Shopify GraphQL error: ${JSON.stringify(body.errors).slice(0, 300)}`);
  }
  if (!body.data) throw new ShopifyRequestError("Shopify GraphQL response had no data.");
  return body.data;
}
