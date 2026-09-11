import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let tmpDir: string;
let envPath: string;

function writeEnv(contents: string) {
  writeFileSync(envPath, contents, "utf-8");
}

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "dashboard-env-test-"));
  envPath = path.join(tmpDir, ".env");
  process.env.ROOT_ENV_PATH = envPath;
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.ROOT_ENV_PATH;
});

describe("loadOdooCredentials", () => {
  it("reads ODOO_URL / ODOO_DB / ODOO_API_KEY fresh from the root .env", async () => {
    writeEnv(
      [
        "ODOO_URL=https://example.odoo.com",
        "ODOO_DB=example-db",
        "ODOO_API_KEY=initial-key-value",
        "ODOO_PASSWORD=unused",
        "MCP_SAFETY_MODE=locked",
      ].join("\n"),
    );

    const { loadOdooCredentials } = await import("@/lib/server/env-loader");
    const creds = loadOdooCredentials();

    expect(creds.url).toBe("https://example.odoo.com");
    expect(creds.db).toBe("example-db");
    expect(creds.apiKey).toBe("initial-key-value");
  });

  it("strips a trailing slash from ODOO_URL", async () => {
    writeEnv("ODOO_URL=https://example.odoo.com/\nODOO_DB=x\nODOO_API_KEY=k\n");
    const { loadOdooCredentials } = await import("@/lib/server/env-loader");
    expect(loadOdooCredentials().url).toBe("https://example.odoo.com");
  });

  it("throws a sanitized ConfigError (no file contents leaked) when a required key is missing", async () => {
    writeEnv("ODOO_URL=https://example.odoo.com\nODOO_DB=example-db\n");
    const { loadOdooCredentials, ConfigError } = await import("@/lib/server/env-loader");
    expect(() => loadOdooCredentials()).toThrow(ConfigError);
    try {
      loadOdooCredentials();
    } catch (err) {
      expect((err as Error).message).toContain("ODOO_API_KEY");
      expect((err as Error).message).not.toContain("example-db");
    }
  });

  it("throws ConfigError when the root .env file does not exist", async () => {
    process.env.ROOT_ENV_PATH = path.join(tmpDir, "does-not-exist.env");
    const { loadOdooCredentials, ConfigError } = await import("@/lib/server/env-loader");
    expect(() => loadOdooCredentials()).toThrow(ConfigError);
  });

  it("picks up a rewritten ODOO_API_KEY on the next call — never caches across calls", async () => {
    writeEnv("ODOO_URL=https://example.odoo.com\nODOO_DB=x\nODOO_API_KEY=key-before-rotation\n");
    const { loadOdooCredentials } = await import("@/lib/server/env-loader");
    expect(loadOdooCredentials().apiKey).toBe("key-before-rotation");

    // Simulate the rotation LaunchAgent rewriting .env while the dashboard
    // process keeps running, without restarting anything.
    writeEnv("ODOO_URL=https://example.odoo.com\nODOO_DB=x\nODOO_API_KEY=key-after-rotation\n");
    expect(loadOdooCredentials().apiKey).toBe("key-after-rotation");
  });
});
