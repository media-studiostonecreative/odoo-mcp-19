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

describe("callOdoo", () => {
  it("succeeds on the first attempt without any retry", async () => {
    writeEnv("good-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { callOdoo } = await import("@/lib/server/odoo-client");
    const result = await callOdoo("res.partner", "search_read", { domain: [] });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("on a 401, reloads credentials from disk and retries exactly once, succeeding with the new key", async () => {
    writeEnv("stale-key-before-rotation");

    const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      if (headers.Authorization === "Bearer stale-key-before-rotation") {
        // Simulate the rotation LaunchAgent rewriting .env in between the
        // failed first attempt and the retry, exactly like production.
        writeEnv("fresh-key-after-rotation");
        return new Response("Unauthorized", { status: 401 });
      }
      if (headers.Authorization === "Bearer fresh-key-after-rotation") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      throw new Error(`unexpected Authorization header: ${headers.Authorization}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { callOdoo } = await import("@/lib/server/odoo-client");
    const result = await callOdoo("res.partner", "search_read", { domain: [] });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws a sanitized error after a second consecutive 401 (no infinite retry)", async () => {
    writeEnv("permanently-invalid-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const { callOdoo, OdooRequestError } = await import("@/lib/server/odoo-client");
    await expect(callOdoo("res.partner", "search_read", { domain: [] })).rejects.toThrow(
      OdooRequestError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry on a non-401 error status", async () => {
    writeEnv("good-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response("Server error", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const { callOdoo } = await import("@/lib/server/odoo-client");
    await expect(callOdoo("res.partner", "search_read", { domain: [] })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never includes the api key in a thrown error's message", async () => {
    writeEnv("super-secret-key-value");
    const fetchMock = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const { callOdoo } = await import("@/lib/server/odoo-client");
    try {
      await callOdoo("res.partner", "search_read", { domain: [] });
      expect.unreachable("expected callOdoo to throw");
    } catch (err) {
      expect((err as Error).message).not.toContain("super-secret-key-value");
    }
  });
});
