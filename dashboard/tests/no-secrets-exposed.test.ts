import { describe, it, expect, vi, beforeEach } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  let files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files = files.concat(walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

const ROOT = path.resolve(__dirname, "..");

describe("static guarantee: client/route surfaces never reference raw credentials", () => {
  const forbiddenIdentifiers = ["ODOO_API_KEY", "ODOO_PASSWORD", "apiKey", "TOKEN_ENCRYPTION_KEY"];

  // Only env-loader.ts and odoo-client.ts are allowed to know these names —
  // everything else in the app (API routes, pages, components) must go
  // through readOdoo()/getDashboardData(), which never surface credentials.
  const allowlistedFiles = new Set([
    path.join(ROOT, "src/lib/server/env-loader.ts"),
    path.join(ROOT, "src/lib/server/odoo-client.ts"),
  ]);

  it("finds no forbidden credential identifiers outside the allowlisted server modules", () => {
    const files = [
      ...walk(path.join(ROOT, "src/app")),
      ...walk(path.join(ROOT, "src/components")),
      ...walk(path.join(ROOT, "src/lib/server/kpi")),
      path.join(ROOT, "src/lib/server/safe-odoo.ts"),
      path.join(ROOT, "src/lib/server/targets.ts"),
      path.join(ROOT, "src/lib/server/db.ts"),
      path.join(ROOT, "src/lib/server/cache.ts"),
      path.join(ROOT, "src/lib/server/regions.ts"),
      path.join(ROOT, "src/lib/server/currency.ts"),
      path.join(ROOT, "src/lib/server/periods.ts"),
    ];

    const offenders: string[] = [];
    for (const file of files) {
      if (allowlistedFiles.has(file)) continue;
      const contents = readFileSync(file, "utf-8");
      for (const identifier of forbiddenIdentifiers) {
        if (contents.includes(identifier)) {
          offenders.push(`${path.relative(ROOT, file)} references "${identifier}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("dashboard API route: sanitized error on Odoo failure", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("never forwards the underlying error message to the HTTP response body", async () => {
    vi.doMock("@/lib/server/kpi/dashboard", () => ({
      getDashboardData: vi
        .fn()
        .mockRejectedValue(new Error("Odoo request failed (sale.order.search_read): key=sk_live_super_secret_value")),
    }));

    const { GET } = await import("@/app/api/dashboard/route");
    const { NextRequest } = await import("next/server");
    const request = new NextRequest("http://localhost/api/dashboard?period=month");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(JSON.stringify(body)).not.toContain("sk_live_super_secret_value");
    expect(body.error).toMatch(/unable to reach odoo/i);
  });
});
