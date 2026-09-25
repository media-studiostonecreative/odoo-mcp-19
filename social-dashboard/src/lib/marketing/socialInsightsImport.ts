// dashboard/src/lib/marketing/socialInsightsImport.ts
import "server-only";

import { getHealthDb } from "../db";
import { createSocialPost, type SocialPlatform } from "./socialPosts";

/**
 * Imports the long-format CSV exported by Meta Business Suite (one row per
 * platform/record_type/metric/date) — real per-post and per-period numbers,
 * never fabricated. Two kinds of rows are used:
 *   - record_type "post": pivoted into social_posts rows (one row per
 *     platform per post), matching the same schema the Social Media page's
 *     manual-entry form writes to.
 *   - record_type "summary": kept as-is in social_platform_insights (one row
 *     per platform/metric/period) rather than normalized into fixed columns,
 *     since the metric set differs per platform and grows over time.
 * "daily" rows are intentionally skipped — see the social_platform_insights
 * schema comment in lib/db.ts.
 */

const SUPPORTED_PLATFORMS = new Set<SocialPlatform>(["instagram", "facebook", "tiktok", "pinterest"]);

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = parseCsvLine(lines[0]!).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]!);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = (fields[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

const POST_METRIC_TO_FIELD: Record<string, "reach" | "likes" | "comments" | "shares"> = {
  Views: "reach",
  Reach: "reach",
  "Reactions/Likes": "likes",
  Comments: "comments",
  Shares: "shares",
};

export interface ParsedPost {
  platform: SocialPlatform;
  postedDate: string;
  title: string;
  reach: number | null;
  likes: number;
  comments: number;
  shares: number;
}

export interface ParsedSummary {
  platform: SocialPlatform;
  metric: string;
  periodStart: string;
  periodEnd: string;
  value: number | null;
  unit: string | null;
  changePct: number | null;
}

export interface ParsedSocialInsights {
  posts: ParsedPost[];
  summaries: ParsedSummary[];
}

function toNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseSocialInsightsCsv(csvText: string): ParsedSocialInsights {
  const rows = parseCsv(csvText);
  const summaries: ParsedSummary[] = [];
  const postsByKey = new Map<string, ParsedPost>();

  for (const row of rows) {
    const platform = row.platform?.toLowerCase() as SocialPlatform | undefined;
    if (!platform || !SUPPORTED_PLATFORMS.has(platform)) continue;

    if (row.record_type === "summary") {
      summaries.push({
        platform,
        metric: row.metric ?? "",
        periodStart: row.period_start ?? "",
        periodEnd: row.period_end ?? "",
        value: toNumber(row.value),
        unit: row.unit || null,
        changePct: toNumber(row.change_vs_prev_period_pct),
      });
    } else if (row.record_type === "post") {
      const key = `${platform}|${row.post_published}|${row.post_title}`;
      const existing: ParsedPost = postsByKey.get(key) ?? {
        platform,
        postedDate: row.date ?? "",
        title: row.post_title ?? "",
        reach: null,
        likes: 0,
        comments: 0,
        shares: 0,
      };
      const field = row.metric ? POST_METRIC_TO_FIELD[row.metric] : undefined;
      const value = toNumber(row.value);
      if (field === "reach") existing.reach = value;
      else if (field === "likes") existing.likes = value ?? 0;
      else if (field === "comments") existing.comments = value ?? 0;
      else if (field === "shares") existing.shares = value ?? 0;
      postsByKey.set(key, existing);
    }
  }

  return { posts: Array.from(postsByKey.values()), summaries };
}

export interface ImportSocialInsightsResult {
  postsImported: number;
  postsSkipped: number;
  summariesImported: number;
}

/** Idempotent: a post already present (matched on platform + posted_date + caption)
 * is skipped rather than duplicated; summary rows upsert on their unique
 * (platform, metric, period_start, period_end) key, so re-importing a corrected
 * export overwrites rather than duplicating. */
export function importSocialInsightsCsv(csvText: string): ImportSocialInsightsResult {
  const { posts, summaries } = parseSocialInsightsCsv(csvText);
  const db = getHealthDb();

  let postsImported = 0;
  let postsSkipped = 0;
  const existsPost = db.prepare(`SELECT id FROM social_posts WHERE platform = ? AND posted_date = ? AND caption = ?`);
  for (const p of posts) {
    if (existsPost.get(p.platform, p.postedDate, p.title)) {
      postsSkipped++;
      continue;
    }
    createSocialPost({
      posted_date: p.postedDate,
      platform: p.platform,
      caption: p.title,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      link_clicks: 0,
      reach: p.reach,
      notes: "Imported from a Meta Business Suite insights export.",
    });
    postsImported++;
  }

  const upsertSummary = db.prepare(`
    INSERT INTO social_platform_insights (platform, metric, period_start, period_end, value, unit, change_vs_prev_period_pct)
    VALUES (@platform, @metric, @periodStart, @periodEnd, @value, @unit, @changePct)
    ON CONFLICT(platform, metric, period_start, period_end) DO UPDATE SET
      value = excluded.value,
      unit = excluded.unit,
      change_vs_prev_period_pct = excluded.change_vs_prev_period_pct,
      imported_at = datetime('now')
  `);
  for (const s of summaries) {
    upsertSummary.run(s);
  }

  return { postsImported, postsSkipped, summariesImported: summaries.length };
}

export interface PlatformInsightRow {
  platform: SocialPlatform;
  metric: string;
  period_start: string;
  period_end: string;
  value: number | null;
  unit: string | null;
  change_vs_prev_period_pct: number | null;
}

/** The most recently-imported period's summary metrics for each platform (not
 * necessarily the same period for every platform, if imports happen at
 * different times) — each platform's own latest period_end wins. */
export function listLatestPlatformInsights(): PlatformInsightRow[] {
  return getHealthDb()
    .prepare(
      `SELECT platform, metric, period_start, period_end, value, unit, change_vs_prev_period_pct
       FROM social_platform_insights
       WHERE (platform, period_end) IN (
         SELECT platform, MAX(period_end) FROM social_platform_insights GROUP BY platform
       )
       ORDER BY platform ASC, metric ASC`,
    )
    .all() as PlatformInsightRow[];
}
