// dashboard/tests/no-secrets-exposed.test.ts
import { describe, it, expect } from "vitest";
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

describe("static guarantee: app/component/route surfaces never reference raw credentials", () => {
  const forbiddenIdentifiers = [
    "ODOO_API_KEY",
    "ODOO_PASSWORD",
    "apiKey",
    "accessToken",
    "TOKEN_ENCRYPTION_KEY",
    "loadOdooCredentials",
    "loadShopifyCredentials",
    "OdooCredentials",
  ];

  const allowlistedFiles = new Set([
    path.join(ROOT, "src/lib/env.ts"),
    path.join(ROOT, "src/lib/odoo/client.ts"),
    path.join(ROOT, "src/lib/shopify/client.ts"),
  ]);

  it("finds no forbidden credential identifiers outside the allowlisted client modules", () => {
    const files = [
      ...walk(path.join(ROOT, "src/app")),
      ...walk(path.join(ROOT, "src/components")),
      ...walk(path.join(ROOT, "src/lib/issues")),
      ...walk(path.join(ROOT, "src/lib/marketing")),
      ...walk(path.join(ROOT, "src/lib/odoo")),
      ...walk(path.join(ROOT, "src/lib/shopify")),
      path.join(ROOT, "src/lib/db.ts"),
    ];

    const offenders: string[] = [];
    for (const file of files) {
      if (allowlistedFiles.has(file)) continue;
      const contents = readFileSync(file, "utf-8");
      for (const identifier of forbiddenIdentifiers) {
        if (contents.includes(identifier)) offenders.push(`${path.relative(ROOT, file)} references "${identifier}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
