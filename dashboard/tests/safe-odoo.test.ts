import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "dashboard-safe-odoo-test-"));
  const envPath = path.join(tmpDir, ".env");
  writeFileSync(envPath, "ODOO_URL=https://example.odoo.com\nODOO_DB=x\nODOO_API_KEY=k\n", "utf-8");
  process.env.ROOT_ENV_PATH = envPath;
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.ROOT_ENV_PATH;
});

describe("readOdoo write-method guard", () => {
  it.each(["create", "write", "unlink", "action_confirm", "action_post", "button_validate"])(
    "refuses to call Odoo for the write method %s",
    async (method) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const { readOdoo } = await import("@/lib/server/safe-odoo");
      await expect(readOdoo("sale.order", method, {})).rejects.toThrow(/read-only/i);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each(["search_read", "search_count", "formatted_read_group", "read", "fields_get"])(
    "allows the read method %s through to Odoo (reaches fetch, isn't refused)",
    async (method) => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      const { readOdoo } = await import("@/lib/server/safe-odoo");
      await readOdoo("sale.order", method, {});
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});
