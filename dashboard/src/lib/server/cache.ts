import "server-only";

/**
 * Short-lived in-memory cache for expensive Odoo aggregate queries.
 * Per `<realtime_behavior>`: 30-60s TTL so the ~60s auto-refresh (and the
 * manual Refresh button) don't hammer Odoo. Never persisted to disk — this
 * is not the SQLite store, which is reserved for targets/preferences only.
 */
const store = new Map<string, { value: unknown; expiresAt: number }>();

const DEFAULT_TTL_MS = 45_000;

export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }
  const value = await fn();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function clearCache(): void {
  store.clear();
}
