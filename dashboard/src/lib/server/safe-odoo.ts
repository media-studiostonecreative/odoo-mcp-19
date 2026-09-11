import "server-only";

import { callOdoo, type Json2Args } from "./odoo-client";

/**
 * Defense-in-depth read-only gate for this dashboard's own Odoo access.
 *
 * This dashboard is a separate application from the odoo-mcp-19 MCP server
 * and does not go through its safety.py classifier. It must still never
 * perform a write against Odoo, so every call in the codebase is required
 * to go through readOdoo() below rather than calling callOdoo() directly —
 * readOdoo() fails closed on any method outside this allowlist.
 */
const READ_ONLY_METHODS = new Set([
  "search_read",
  "search_count",
  "formatted_read_group",
  "read",
  "fields_get",
]);

export async function readOdoo<T>(
  model: string,
  method: string,
  args: Json2Args = {},
): Promise<T> {
  if (!READ_ONLY_METHODS.has(method)) {
    throw new Error(
      `Refusing non-read Odoo method "${method}" — this dashboard is read-only.`,
    );
  }
  return callOdoo<T>(model, method, args);
}
