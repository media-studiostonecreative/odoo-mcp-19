import "server-only";

import path from "node:path";

/**
 * Reads the ROOT .env (one level up from dashboard/) fresh from disk on
 * every call. Shared by lib/odoo/client.ts and lib/shopify/client.ts — the
 * ODOO_API_KEY in that file is rewritten every ~6 hours by an external
 * LaunchAgent while this server keeps running, so nothing derived from it
 * may be cached across calls.
 */

// Resolved fresh on every call (not cached at module scope) — the path
// itself never changes mid-run, but recomputing it here costs nothing and
// keeps "always read current state" true of the whole path, not just the
// file's contents.
export function resolveRootEnvPath(): string {
  return process.env.ROOT_ENV_PATH ?? path.resolve(process.cwd(), "..", ".env");
}

export function parseEnvFile(contents: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export class ConfigError extends Error {}
