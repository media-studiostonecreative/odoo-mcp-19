import "server-only";

import { loadOdooCredentials } from "./env-loader";

/**
 * Server-side, read-only JSON-2 client for the Business Pulse dashboard.
 *
 * This is intentionally independent of the odoo-mcp-19 MCP server's own
 * OdooClient (src/odoo_mcp/odoo_client.py) — no shared state, no shared
 * process. It mirrors that client's wire contract (Bearer auth, named-args
 * JSON-2 body, X-Odoo-Database header skipped for *.odoo.com SaaS hosts,
 * bare response body with no {"result": ...} envelope) because that
 * contract is Odoo's, not this project's.
 *
 * Credential rotation: ODOO_API_KEY in the root .env is rewritten by a
 * separate, unrelated LaunchAgent every few hours while this server keeps
 * running. Every call here re-reads the root .env from disk immediately
 * before use (loadOdooCredentials is never memoized), and on an HTTP 401
 * we re-read once more and retry the same request exactly once with
 * whatever key is on disk at that moment. A second 401 is a real failure
 * and is surfaced (sanitized) to the caller.
 */

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

async function postOnce(
  model: string,
  method: string,
  args: Json2Args,
): Promise<Response> {
  // Credentials are loaded fresh on every single call — never cache the
  // return value of loadOdooCredentials() outside this function's scope.
  const creds = loadOdooCredentials();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${creds.apiKey}`,
  };
  if (!isSaasHost(creds.url)) {
    headers["X-Odoo-Database"] = creds.db;
  }

  return fetch(`${creds.url}/json/2/${model}/${method}`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
    cache: "no-store",
  });
}

/**
 * Calls one Odoo JSON-2 method with named args. On a 401 (typically a
 * rotated-out key that this process hasn't picked up yet), reloads the
 * credentials from disk and retries exactly once.
 *
 * Only read methods are ever invoked through this dashboard — see
 * ODOO_READ_METHODS in kpi/queries.ts, which is the single allowlist every
 * call site is expected to go through.
 */
export async function callOdoo<T>(
  model: string,
  method: string,
  args: Json2Args = {},
): Promise<T> {
  let response = await postOnce(model, method, args);

  if (response.status === 401) {
    response = await postOnce(model, method, args);
  }

  if (!response.ok) {
    // Never forward Odoo's raw body: it can include a debug traceback.
    // Only the HTTP status is safe to surface.
    throw new OdooRequestError(
      `Odoo request failed (${model}.${method})`,
      response.status,
    );
  }

  return (await response.json()) as T;
}
