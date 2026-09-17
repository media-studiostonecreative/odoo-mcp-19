import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let tmpDir: string;
let envPath: string;

function writeEnv(apiKey: string) {
  writeFileSync(
    envPath,
    `ODOO_URL=https://example.odoo.com\nODOO_DB=example-db\nODOO_API_KEY=${apiKey}\n`,
    "utf-8",
  );
}

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "dashboard-odoo-client-test-"));
  envPath = path.join(tmpDir, ".env");
  process.env.ROOT_ENV_PATH = envPath;
  vi.restoreAllMocks();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.ROOT_ENV_PATH;
});

describe("loadOdooCredentials", () => {
  it("reads ODOO_URL / ODOO_DB / ODOO_API_KEY and strips a trailing slash from the URL", async () => {
    writeEnv("k");
    writeFileSync(envPath, "ODOO_URL=https://example.odoo.com/\nODOO_DB=x\nODOO_API_KEY=k\n");
    const { loadOdooCredentials } = await import("@/lib/odoo/client");
    expect(loadOdooCredentials()).toEqual({ url: "https://example.odoo.com", db: "x", apiKey: "k" });
  });

  it("throws a sanitized ConfigError (no leaked values) when a required key is missing", async () => {
    writeFileSync(envPath, "ODOO_URL=https://example.odoo.com\nODOO_DB=example-db\n");
    const { loadOdooCredentials, ConfigError } = await import("@/lib/odoo/client");
    expect(() => loadOdooCredentials()).toThrow(ConfigError);
    try {
      loadOdooCredentials();
    } catch (err) {
      expect((err as Error).message).toContain("ODOO_API_KEY");
      expect((err as Error).message).not.toContain("example-db");
    }
  });
});

describe("callOdoo", () => {
  it("succeeds on the first attempt without any retry", async () => {
    writeEnv("good-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { callOdoo } = await import("@/lib/odoo/client");
    const result = await callOdoo("res.partner", "search_read", { domain: [] });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("on a 401, reloads credentials from disk and retries exactly once", async () => {
    writeEnv("stale-key");
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      if (headers.Authorization === "Bearer stale-key") {
        writeEnv("fresh-key");
        return new Response("Unauthorized", { status: 401 });
      }
      if (headers.Authorization === "Bearer fresh-key") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      throw new Error(`unexpected Authorization header: ${headers.Authorization}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { callOdoo } = await import("@/lib/odoo/client");
    const result = await callOdoo("res.partner", "search_read", { domain: [] });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws a sanitized OdooRequestError after a second consecutive 401", async () => {
    writeEnv("bad-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const { callOdoo, OdooRequestError } = await import("@/lib/odoo/client");
    await expect(callOdoo("res.partner", "search_read", {})).rejects.toThrow(OdooRequestError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never includes the api key in a thrown error's message", async () => {
    writeEnv("super-secret-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })));
    const { callOdoo } = await import("@/lib/odoo/client");
    try {
      await callOdoo("res.partner", "search_read", {});
      expect.unreachable("expected callOdoo to throw");
    } catch (err) {
      expect((err as Error).message).not.toContain("super-secret-key");
    }
  });
});

describe("readOdoo write-method guard", () => {
  it.each(["create", "write", "unlink", "action_confirm"])(
    "refuses to call Odoo for the write method %s",
    async (method) => {
      writeEnv("k");
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const { readOdoo } = await import("@/lib/odoo/client");
      await expect(readOdoo("sale.order", method, {})).rejects.toThrow(/read-only/i);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each(["search_read", "search_count", "formatted_read_group", "read", "fields_get"])(
    "allows the read method %s through to Odoo",
    async (method) => {
      writeEnv("k");
      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);
      const { readOdoo } = await import("@/lib/odoo/client");
      await readOdoo("sale.order", method, {});
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});
