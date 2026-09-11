import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Reads the ROOT .env (one level up from /dashboard) fresh from disk on
 * every call. The odoo-mcp-19 rotation LaunchAgent rewrites ODOO_API_KEY in
 * that file every few hours while this dashboard keeps running, so the
 * value must never be cached in memory across requests — see
 * docs in odoo-client.ts for how each Odoo call re-reads this.
 */

export interface OdooCredentials {
  url: string;
  db: string;
  apiKey: string;
}

// Resolved fresh on every call (not cached at module scope): production
// never changes ROOT_ENV_PATH mid-run, but recomputing it here costs
// nothing and keeps "always read current state, never a stale snapshot"
// true of the whole path, not just the file's contents.
function resolveRootEnvPath(): string {
  return process.env.ROOT_ENV_PATH ?? path.resolve(process.cwd(), "..", ".env");
}

class ConfigError extends Error {}

function parseEnvFile(contents: string): Record<string, string> {
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

/**
 * Loads ODOO_URL / ODOO_DB / ODOO_API_KEY from the root .env, read fresh
 * from disk every time this is called. Throws ConfigError (message never
 * includes the file contents) if the file is missing or a required key is
 * absent — callers turn that into a sanitized dashboard error.
 */
export function loadOdooCredentials(): OdooCredentials {
  let raw: string;
  try {
    raw = readFileSync(resolveRootEnvPath(), "utf-8");
  } catch {
    throw new ConfigError(
      "Root .env is not readable. Check ROOT_ENV_PATH / file permissions.",
    );
  }

  const values = parseEnvFile(raw);
  const url = values.ODOO_URL;
  const db = values.ODOO_DB;
  const apiKey = values.ODOO_API_KEY;

  if (!url || !db || !apiKey) {
    const missing = [
      !url && "ODOO_URL",
      !db && "ODOO_DB",
      !apiKey && "ODOO_API_KEY",
    ]
      .filter(Boolean)
      .join(", ");
    throw new ConfigError(`Root .env is missing required variable(s): ${missing}`);
  }

  return { url: url.replace(/\/+$/, ""), db, apiKey };
}

export { ConfigError, resolveRootEnvPath };
