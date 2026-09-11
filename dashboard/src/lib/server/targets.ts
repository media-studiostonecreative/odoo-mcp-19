import "server-only";

import { getDb } from "./db";

export const TARGET_KEYS = [
  "monthly_revenue_target",
  "annual_revenue_target",
  "monthly_sales_order_target",
  "new_wholesale_account_target",
] as const;

export type TargetKey = (typeof TARGET_KEYS)[number];

export type Targets = Record<TargetKey, number>;

const DEFAULTS: Targets = {
  monthly_revenue_target: 50_000,
  annual_revenue_target: 600_000,
  monthly_sales_order_target: 60_000,
  new_wholesale_account_target: 5,
};

export function getTargets(): Targets {
  const db = getDb();
  const rows = db.prepare(`SELECT key, value FROM targets`).all() as {
    key: string;
    value: number;
  }[];
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULTS, ...stored } as Targets;
}

export function setTargets(partial: Partial<Targets>): Targets {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO targets (key, value, updated_at)
    VALUES (@key, @value, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  const tx = db.transaction((entries: [string, number][]) => {
    for (const [key, value] of entries) {
      if (!TARGET_KEYS.includes(key as TargetKey)) continue;
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
      upsert.run({ key, value });
    }
  });
  tx(Object.entries(partial));
  return getTargets();
}
