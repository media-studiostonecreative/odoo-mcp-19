import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let tmpDir: string;
let envPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "dashboard-shopify-client-test-"));
  envPath = path.join(tmpDir, ".env");
  process.env.ROOT_ENV_PATH = envPath;
  vi.restoreAllMocks();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.ROOT_ENV_PATH;
});

describe("loadShopifyCredentials / isShopifyConfigured", () => {
  it("returns null (not a throw) when the file is missing", async () => {
    process.env.ROOT_ENV_PATH = path.join(tmpDir, "does-not-exist.env");
    const { loadShopifyCredentials, isShopifyConfigured } = await import("@/lib/shopify/client");
    expect(loadShopifyCredentials()).toBeNull();
    expect(isShopifyConfigured()).toBe(false);
  });

  it("returns null when the required keys are absent", async () => {
    writeFileSync(envPath, "SOME_OTHER_VAR=1\n");
    const { loadShopifyCredentials } = await import("@/lib/shopify/client");
    expect(loadShopifyCredentials()).toBeNull();
  });

  it("strips a protocol prefix and trailing slash from the store domain", async () => {
    writeFileSync(envPath, "SHOPIFY_STORE_DOMAIN=https://example.myshopify.com/\nSHOPIFY_ADMIN_ACCESS_TOKEN=shpat_x\n");
    const { loadShopifyCredentials, isShopifyConfigured } = await import("@/lib/shopify/client");
    expect(loadShopifyCredentials()).toEqual({ storeDomain: "example.myshopify.com", accessToken: "shpat_x" });
    expect(isShopifyConfigured()).toBe(true);
  });
});

describe("callShopifyGraphQL", () => {
  it("throws ShopifyNotConfiguredError when credentials are missing", async () => {
    process.env.ROOT_ENV_PATH = path.join(tmpDir, "does-not-exist.env");
    const { callShopifyGraphQL, ShopifyNotConfiguredError } = await import("@/lib/shopify/client");
    await expect(callShopifyGraphQL("{ shop { name } }")).rejects.toThrow(ShopifyNotConfiguredError);
  });

  it("posts to the Admin API with the access token header and returns data", async () => {
    writeFileSync(envPath, "SHOPIFY_STORE_DOMAIN=example.myshopify.com\nSHOPIFY_ADMIN_ACCESS_TOKEN=shpat_x\n");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { shop: { name: "Test Shop" } } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { callShopifyGraphQL } = await import("@/lib/shopify/client");
    const result = await callShopifyGraphQL<{ shop: { name: string } }>("{ shop { name } }");

    expect(result).toEqual({ shop: { name: "Test Shop" } });
    const [url, init] = fetchMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toContain("example.myshopify.com/admin/api/");
    expect((init.headers as Record<string, string>)["X-Shopify-Access-Token"]).toBe("shpat_x");
  });

  it("throws ShopifyRequestError on a GraphQL errors array", async () => {
    writeFileSync(envPath, "SHOPIFY_STORE_DOMAIN=example.myshopify.com\nSHOPIFY_ADMIN_ACCESS_TOKEN=shpat_x\n");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: "bad query" }] }), { status: 200 }),
    ));
    const { callShopifyGraphQL, ShopifyRequestError } = await import("@/lib/shopify/client");
    await expect(callShopifyGraphQL("{ bad }")).rejects.toThrow(ShopifyRequestError);
  });

  it("throws ShopifyRequestError on a non-2xx response", async () => {
    writeFileSync(envPath, "SHOPIFY_STORE_DOMAIN=example.myshopify.com\nSHOPIFY_ADMIN_ACCESS_TOKEN=shpat_x\n");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })));
    const { callShopifyGraphQL, ShopifyRequestError } = await import("@/lib/shopify/client");
    await expect(callShopifyGraphQL("{ shop { name } }")).rejects.toThrow(ShopifyRequestError);
  });
});
