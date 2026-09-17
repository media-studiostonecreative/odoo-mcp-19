import "server-only";

import { readFileSync } from "node:fs";
import { resolveRootEnvPath, parseEnvFile } from "../env";

/**
 * Server-side, read-only Shopify Admin GraphQL client. Optional: every
 * caller must handle `null` credentials (Shopify not connected) and degrade
 * to an honest "not connected" state — never fabricated data.
 */

const API_VERSION = "2025-01";

export interface ShopifyCredentials {
  storeDomain: string;
  accessToken: string;
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
  const accessToken = values.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!storeDomain || !accessToken) return null;
  return { storeDomain: storeDomain.replace(/^https?:\/\//, "").replace(/\/+$/, ""), accessToken };
}

export function isShopifyConfigured(): boolean {
  return loadShopifyCredentials() != null;
}

export class ShopifyNotConfiguredError extends Error {
  constructor() {
    super("Shopify is not connected — SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_ACCESS_TOKEN missing from .env.");
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

export async function callShopifyGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const creds = loadShopifyCredentials();
  if (!creds) throw new ShopifyNotConfiguredError();

  const response = await fetch(`https://${creds.storeDomain}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": creds.accessToken,
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
