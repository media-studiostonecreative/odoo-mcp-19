import "server-only";

import { readFileSync } from "node:fs";
import { resolveRootEnvPath, parseEnvFile, ConfigError } from "../env";

/**
 * Server-side, read-only JSON-2 client for the dashboard. Independent of the
 * odoo-mcp-19 MCP server's own OdooClient — no shared state, no shared
 * process — but mirrors its wire contract (Bearer auth, named-args JSON-2
 * body, X-Odoo-Database header skipped for *.odoo.com SaaS hosts, bare
 * response body with no {"result": ...} envelope) because that contract is
 * Odoo's, not this project's.
 *
 * Credential rotation: ODOO_API_KEY in the root .env is rewritten by an
 * external LaunchAgent every few hours while this server keeps running.
 * loadOdooCredentials() is never memoized — every call here re-reads the
 * root .env from disk immediately before use — and on an HTTP 401 we
 * re-read once more and retry the same request exactly once. A second 401
 * is a real failure and is surfaced (sanitized) to the caller.
 */

export interface OdooCredentials {
  url: string;
  db: string;
  apiKey: string;
}

export function loadOdooCredentials(): OdooCredentials {
  let raw: string;
  try {
    raw = readFileSync(resolveRootEnvPath(), "utf-8");
  } catch {
    throw new ConfigError("Root .env is not readable. Check ROOT_ENV_PATH / file permissions.");
  }

  const values = parseEnvFile(raw);
  const url = values.ODOO_URL;
  const db = values.ODOO_DB;
  const apiKey = values.ODOO_API_KEY;

  if (!url || !db || !apiKey) {
    const missing = [!url && "ODOO_URL", !db && "ODOO_DB", !apiKey && "ODOO_API_KEY"].filter(Boolean).join(", ");
    throw new ConfigError(`Root .env is missing required variable(s): ${missing}`);
  }

  return { url: url.replace(/\/+$/, ""), db, apiKey };
}

export class OdooRequestError extends Error {
  readonly status: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "OdooRequestError";
    this.status = status;
  }
}

export type Json2Args = Record<string, unknown>;

function isSaasHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === "odoo.com" || hostname.endsWith(".odoo.com");
  } catch {
    return false;
  }
}

async function postOnce(model: string, method: string, args: Json2Args): Promise<Response> {
  const creds = loadOdooCredentials();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${creds.apiKey}`,
  };
  if (!isSaasHost(creds.url)) headers["X-Odoo-Database"] = creds.db;

  return fetch(`${creds.url}/json/2/${model}/${method}`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
    cache: "no-store",
  });
}

export async function callOdoo<T>(model: string, method: string, args: Json2Args = {}): Promise<T> {
  let response = await postOnce(model, method, args);
  if (response.status === 401) response = await postOnce(model, method, args);

  if (!response.ok) {
    // Never forward Odoo's raw body: it can include a debug traceback.
    throw new OdooRequestError(`Odoo request failed (${model}.${method})`, response.status);
  }
  return (await response.json()) as T;
}

/**
 * Defense-in-depth read-only gate. This dashboard does not go through the
 * odoo-mcp-19 MCP server's safety.py classifier, so every call site in this
 * app is required to go through readOdoo() rather than callOdoo() directly.
 */
const READ_ONLY_METHODS = new Set(["search_read", "search_count", "formatted_read_group", "read", "fields_get"]);

export async function readOdoo<T>(model: string, method: string, args: Json2Args = {}): Promise<T> {
  if (!READ_ONLY_METHODS.has(method)) {
    throw new Error(`Refusing non-read Odoo method "${method}" — this dashboard is read-only.`);
  }
  return callOdoo<T>(model, method, args);
}

// Re-export ConfigError so callers don't need to import it from env directly
export { ConfigError };
