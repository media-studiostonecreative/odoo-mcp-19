/**
 * One-time snapshot copy of the social tables from the Website Health
 * dashboard's database (../dashboard/data/website-health.sqlite3) into this
 * app's own data/social.sqlite3. Preserves row IDs so the cross-table
 * references (content_ideas.source_post_id, trend_recommendations.*) still
 * line up. Not a sync: run once, before first use.
 *
 * Columns are copied by name, not position -- columns added later via
 * addColumnIfMissing can sit at different positions in the two files.
 *
 * Usage (from social-dashboard/):
 *   npm run migrate:from-dashboard
 * Override the source with SOURCE_DB=/path/to/website-health.sqlite3.
 */
import path from "node:path";
import { existsSync } from "node:fs";
import { getHealthDb, closeHealthDb } from "../src/lib/db.ts";

const TABLES = [
  "social_posts",
  "trend_observations",
  "trend_recommendations",
  "social_platform_insights",
  "content_ideas",
  "trade_shows",
] as const;

const source = process.env.SOURCE_DB ?? path.resolve(process.cwd(), "..", "dashboard", "data", "website-health.sqlite3");
if (!existsSync(source)) {
  console.error(`Source database not found: ${source}`);
  process.exit(1);
}

// Opening through getHealthDb() creates the schema and runs migrations.
const db = getHealthDb();

const columnsOf = (schema: string, table: string): string[] =>
  (db.prepare(`PRAGMA ${schema}.table_info(${table})`).all() as Array<{ name: string }>).map((c) => c.name);
const countOf = (schema: string, table: string): number =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${schema}.${table}`).get() as { n: number }).n;

const nonEmpty = TABLES.filter((t) => countOf("main", t) > 0);
if (nonEmpty.length > 0) {
  console.error(`Refusing to migrate: social.sqlite3 already has rows in ${nonEmpty.join(", ")}.`);
  console.error("Delete data/social.sqlite3* first if you really want to re-run the copy.");
  closeHealthDb();
  process.exit(1);
}

db.prepare("ATTACH DATABASE ? AS old").run(source);
try {
  const copy = db.transaction(() => {
    const results: Array<{ table: string; source: number; copied: number; skippedColumns: string }> = [];
    for (const table of TABLES) {
      const target = columnsOf("main", table);
      const from = columnsOf("old", table);
      const shared = target.filter((c) => from.includes(c));
      const cols = shared.map((c) => `"${c}"`).join(", ");
      db.exec(`INSERT INTO main.${table} (${cols}) SELECT ${cols} FROM old.${table}`);
      results.push({
        table,
        source: countOf("old", table),
        copied: countOf("main", table),
        skippedColumns: from.filter((c) => !target.includes(c)).join(", ") || "-",
      });
    }
    return results;
  });
  const results = copy();
  console.table(results);
  const mismatched = results.filter((r) => r.source !== r.copied);
  if (mismatched.length > 0) {
    console.error(`Row count mismatch in: ${mismatched.map((r) => r.table).join(", ")}`);
    process.exitCode = 1;
  }
} finally {
  db.exec("DETACH DATABASE old");
  closeHealthDb();
}
