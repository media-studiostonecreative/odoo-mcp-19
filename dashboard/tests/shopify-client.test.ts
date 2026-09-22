import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let tmpDir: string;
let envPath: string;

function tokenResponse(accessToken = "shta_x", expiresIn = 86399) {
  return new Response(JSON.stringify({ access_token: accessToken, expires_in: expiresIn, scope: "read_reports" }), { status: 200 });
}

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "dashboard-shopify-client-test-"));
  envPath = path.join(tmpDir, ".env");
  process.env.ROOT_ENV_PATH = envPath;
  vi.restoreAllMocks();
  vi.resetModules(); // client.ts caches the access token at module scope — start each test fresh
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

  it("returns null when only the client ID is present (secret missing)", async () => {
    writeFileSync(envPath, "SHOPIFY_STORE_DOMAIN=example.myshopify.com\nSHOPIFY_CLIENT_ID=id123\n");
    const { loadShopifyCredentials } = await import("@/lib/shopify/client");
    expect(loadShopifyCredentials()).toBeNull();
  });

  it("strips a protocol prefix and trailing slash from the store domain", async () => {
    writeFileSync(envPath, "SHOPIFY_STORE_DOMAIN=https://example.myshopify.com/\nSHOPIFY_CLIENT_ID=id123\nSHOPIFY_CLIENT_SECRET=secret456\n");
    const { loadShopifyCredentials, isShopifyConfigured } = await import("@/lib/shopify/client");
    expect(loadShopifyCredentials()).toEqual({ storeDomain: "example.myshopify.com", clientId: "id123", clientSecret: "secret456" });
    expect(isShopifyConfigured()).toBe(true);
  });
});

describe("callShopifyGraphQL", () => {
  it("throws ShopifyNotConfiguredError when credentials are missing", async () => {
    process.env.ROOT_ENV_PATH = path.join(tmpDir, "does-not-exist.env");
    const { callShopifyGraphQL, ShopifyNotConfiguredError } = await import("@/lib/shopify/client");
    await expect(callShopifyGraphQL("{ shop { name } }")).rejects.toThrow(ShopifyNotConfiguredError);
  });

  it("exchanges client credentials for an access token, then posts to the Admin API with it", async () => {
    writeFileSync(envPath, "SHOPIFY_STORE_DOMAIN=example.myshopify.com\nSHOPIFY_CLIENT_ID=id123\nSHOPIFY_CLIENT_SECRET=secret456\n");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse("shta_x"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { shop: { name: "Test Shop" } } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { callShopifyGraphQL } = await import("@/lib/shopify/client");
    const result = await callShopifyGraphQL<{ shop: { name: string } }>("{ shop { name } }");

    expect(result).toEqual({ shop: { name: "Test Shop" } });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(tokenUrl).toBe("https://example.myshopify.com/admin/oauth/access_token");
    expect(tokenInit.method).toBe("POST");
    expect((tokenInit.headers as Record<string, string>)["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(tokenInit.body).toBe("grant_type=client_credentials&client_id=id123&client_secret=secret456");

    const [graphqlUrl, graphqlInit] = fetchMock.mock.calls[1] as [string, Record<string, unknown>];
    expect(graphqlUrl).toContain("example.myshopify.com/admin/api/");
    expect((graphqlInit.headers as Record<string, string>)["X-Shopify-Access-Token"]).toBe("shta_x");
  });

  it("caches the access token across calls instead of re-exchanging every time", async () => {
    writeFileSync(envPath, "SHOPIFY_STORE_DOMAIN=example.myshopify.com\nSHOPIFY_CLIENT_ID=id123\nSHOPIFY_CLIENT_SECRET=secret456\n");
    const graphqlOk = () => new Response(JSON.stringify({ data: { shop: { name: "Test Shop" } } }), { status: 200 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse("shta_cached"))
      .mockResolvedValueOnce(graphqlOk())
      .mockResolvedValueOnce(graphqlOk());
    vi.stubGlobal("fetch", fetchMock);

    const { callShopifyGraphQL } = await import("@/lib/shopify/client");
    await callShopifyGraphQL("{ shop { name } }");
    await callShopifyGraphQL("{ shop { name } }");

    // 1 token exchange + 2 GraphQL calls = 3, not 4 — the second call reused the cached token.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const secondCallHeaders = (fetchMock.mock.calls[2] as [string, Record<string, unknown>])[1].headers as Record<string, string>;
    expect(secondCallHeaders["X-Shopify-Access-Token"]).toBe("shta_cached");
  });

  it("re-exchanges the token once the cached one has expired", async () => {
    writeFileSync(envPath, "SHOPIFY_STORE_DOMAIN=example.myshopify.com\nSHOPIFY_CLIENT_ID=id123\nSHOPIFY_CLIENT_SECRET=secret456\n");
    const graphqlOk = () => new Response(JSON.stringify({ data: { shop: { name: "Test Shop" } } }), { status: 200 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse("shta_old", 1)) // expires almost immediately
      .mockResolvedValueOnce(graphqlOk())
      .mockResolvedValueOnce(tokenResponse("shta_new", 86399))
      .mockResolvedValueOnce(graphqlOk());
    vi.stubGlobal("fetch", fetchMock);

    const { callShopifyGraphQL } = await import("@/lib/shopify/client");
    await callShopifyGraphQL("{ shop { name } }");
    await new Promise((resolve) => setTimeout(resolve, 1100)); // let the 1s token expire
    await callShopifyGraphQL("{ shop { name } }");

    expect(fetchMock).toHaveBeenCalledTimes(4); // 2 token exchanges + 2 GraphQL calls
    const secondGraphqlHeaders = (fetchMock.mock.calls[3] as [string, Record<string, unknown>])[1].headers as Record<string, string>;
    expect(secondGraphqlHeaders["X-Shopify-Access-Token"]).toBe("shta_new");
  });

  it("throws ShopifyRequestError when the token exchange itself fails", async () => {
    writeFileSync(envPath, "SHOPIFY_STORE_DOMAIN=example.myshopify.com\nSHOPIFY_CLIENT_ID=id123\nSHOPIFY_CLIENT_SECRET=secret456\n");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })));
    const { callShopifyGraphQL, ShopifyRequestError } = await import("@/lib/shopify/client");
    await expect(callShopifyGraphQL("{ shop { name } }")).rejects.toThrow(ShopifyRequestError);
  });

  it("throws ShopifyRequestError on a GraphQL errors array", async () => {
    writeFileSync(envPath, "SHOPIFY_STORE_DOMAIN=example.myshopify.com\nSHOPIFY_CLIENT_ID=id123\nSHOPIFY_CLIENT_SECRET=secret456\n");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(new Response(JSON.stringify({ errors: [{ message: "bad query" }] }), { status: 200 })),
    );
    const { callShopifyGraphQL, ShopifyRequestError } = await import("@/lib/shopify/client");
    await expect(callShopifyGraphQL("{ bad }")).rejects.toThrow(ShopifyRequestError);
  });

  it("throws ShopifyRequestError on a non-2xx response from the Admin API", async () => {
    writeFileSync(envPath, "SHOPIFY_STORE_DOMAIN=example.myshopify.com\nSHOPIFY_CLIENT_ID=id123\nSHOPIFY_CLIENT_SECRET=secret456\n");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(new Response("Unauthorized", { status: 401 })),
    );
    const { callShopifyGraphQL, ShopifyRequestError } = await import("@/lib/shopify/client");
    await expect(callShopifyGraphQL("{ shop { name } }")).rejects.toThrow(ShopifyRequestError);
  });
});
