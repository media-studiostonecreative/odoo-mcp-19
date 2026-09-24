// dashboard/src/lib/social/contentIdeas.ts
import "server-only";

import { getHealthDb } from "../db";
import type { SocialPlatform } from "../marketing/socialPosts";
import { suggestPostingTime } from "./postingTimes";

export type ContentIdeaType = "repost" | "refresh" | "new";
export type ContentIdeaConfidence = "high" | "promising" | "experimental" | "insufficient";
export type ContentIdeaStatus = "suggested" | "approved" | "used" | "dismissed";
export type ContentIdeaFormat = "photo" | "reel" | "carousel" | "story";

export interface HashtagEntry {
  tier: "core" | "subject" | "discovery" | "seasonal" | "regional";
  tag: string;
}

export interface ContentIdea {
  id: number;
  idea_type: ContentIdeaType;
  source_post_id: number | null;
  occasion_id: string | null;
  target_date: string | null;
  suggested_time: string | null;
  platform: SocialPlatform;
  format: ContentIdeaFormat;
  product: string;
  product_handle: string | null;
  pillar: string | null;
  hook: string | null;
  caption: string;
  hashtags: HashtagEntry[];
  cta: string | null;
  reasoning: string;
  confidence: ContentIdeaConfidence;
  inventory_verified: boolean;
  status: ContentIdeaStatus;
  created_at: string;
}

export interface NewContentIdea {
  idea_type: ContentIdeaType;
  source_post_id?: number | null;
  occasion_id?: string | null;
  target_date?: string | null;
  /** Explicit override. When omitted and target_date is set, this is auto-computed
   * from platform/format/weekday via lib/social/postingTimes.ts (general research,
   * not Studiostone-specific data — see that file's header). */
  suggested_time?: string | null;
  platform: SocialPlatform;
  format?: ContentIdeaFormat;
  product: string;
  product_handle?: string | null;
  pillar?: string | null;
  hook?: string | null;
  caption: string;
  hashtags?: HashtagEntry[];
  cta?: string | null;
  reasoning: string;
  confidence: ContentIdeaConfidence;
  inventory_verified?: boolean;
}

interface ContentIdeaRow {
  id: number;
  idea_type: ContentIdeaType;
  source_post_id: number | null;
  occasion_id: string | null;
  target_date: string | null;
  suggested_time: string | null;
  platform: SocialPlatform;
  format: ContentIdeaFormat;
  product: string;
  product_handle: string | null;
  pillar: string | null;
  hook: string | null;
  caption: string;
  hashtags: string | null;
  cta: string | null;
  reasoning: string;
  confidence: ContentIdeaConfidence;
  inventory_verified: number;
  status: ContentIdeaStatus;
  created_at: string;
}

function fromRow(row: ContentIdeaRow): ContentIdea {
  return {
    ...row,
    hashtags: row.hashtags ? (JSON.parse(row.hashtags) as HashtagEntry[]) : [],
    inventory_verified: row.inventory_verified === 1,
  };
}

export function listContentIdeas(): ContentIdea[] {
  const rows = getHealthDb().prepare("SELECT * FROM content_ideas ORDER BY target_date ASC, created_at DESC").all() as ContentIdeaRow[];
  return rows.map(fromRow);
}

function resolveSuggestedTime(data: NewContentIdea): string | null {
  if (data.suggested_time !== undefined) return data.suggested_time;
  if (!data.target_date) return null;
  return suggestPostingTime(data.platform, data.format ?? "photo", data.target_date).time;
}

export function createContentIdea(data: NewContentIdea): ContentIdea {
  const db = getHealthDb();
  const result = db
    .prepare(
      `INSERT INTO content_ideas
        (idea_type, source_post_id, occasion_id, target_date, suggested_time, platform, format, product, product_handle, pillar, hook, caption, hashtags, cta, reasoning, confidence, inventory_verified)
       VALUES
        (@idea_type, @source_post_id, @occasion_id, @target_date, @suggested_time, @platform, @format, @product, @product_handle, @pillar, @hook, @caption, @hashtags, @cta, @reasoning, @confidence, @inventory_verified)`,
    )
    .run({
      idea_type: data.idea_type,
      source_post_id: data.source_post_id ?? null,
      occasion_id: data.occasion_id ?? null,
      target_date: data.target_date ?? null,
      suggested_time: resolveSuggestedTime(data),
      platform: data.platform,
      format: data.format ?? "photo",
      product: data.product,
      product_handle: data.product_handle ?? null,
      pillar: data.pillar ?? null,
      hook: data.hook ?? null,
      caption: data.caption,
      hashtags: JSON.stringify(data.hashtags ?? []),
      cta: data.cta ?? null,
      reasoning: data.reasoning,
      confidence: data.confidence,
      inventory_verified: data.inventory_verified ? 1 : 0,
    });
  return fromRow(db.prepare("SELECT * FROM content_ideas WHERE id = ?").get(result.lastInsertRowid) as ContentIdeaRow);
}

export function updateContentIdeaStatus(id: number, status: ContentIdeaStatus): ContentIdea | null {
  const db = getHealthDb();
  const result = db.prepare("UPDATE content_ideas SET status = ? WHERE id = ?").run(status, id);
  if (result.changes === 0) return null;
  return fromRow(db.prepare("SELECT * FROM content_ideas WHERE id = ?").get(id) as ContentIdeaRow);
}

export interface ContentIdeaUpdate {
  target_date?: string | null;
  /** Explicit override. When omitted and target_date/platform/format change, this is
   * recomputed from the new values via lib/social/postingTimes.ts. */
  suggested_time?: string | null;
  platform?: SocialPlatform;
  format?: ContentIdeaFormat;
  status?: ContentIdeaStatus;
  pillar?: string | null;
}

/** General partial update for schedulable fields (when should this post go out, on
 * what platform/format) and categorization (pillar) — used to reschedule/recategorize
 * an idea rather than delete-and-recreate it. */
export function updateContentIdea(id: number, data: ContentIdeaUpdate): ContentIdea | null {
  const db = getHealthDb();
  const existing = db.prepare("SELECT * FROM content_ideas WHERE id = ?").get(id) as ContentIdeaRow | undefined;
  if (!existing) return null;

  const merged: ContentIdeaRow = { ...existing, ...data };
  const scheduleChanged = data.target_date !== undefined || data.platform !== undefined || data.format !== undefined;
  const suggestedTime = data.suggested_time !== undefined ? data.suggested_time : scheduleChanged ? (merged.target_date ? suggestPostingTime(merged.platform, merged.format, merged.target_date).time : null) : existing.suggested_time;

  db.prepare(`UPDATE content_ideas SET target_date = ?, suggested_time = ?, platform = ?, format = ?, status = ?, pillar = ? WHERE id = ?`).run(
    merged.target_date,
    suggestedTime,
    merged.platform,
    merged.format,
    merged.status,
    merged.pillar,
    id,
  );
  return fromRow(db.prepare("SELECT * FROM content_ideas WHERE id = ?").get(id) as ContentIdeaRow);
}

/** Backfills/recomputes suggested_time for an existing idea from its current
 * platform/format/target_date (used to apply postingTimes research retroactively). */
export function recomputeSuggestedTime(id: number): ContentIdea | null {
  const db = getHealthDb();
  const row = db.prepare("SELECT * FROM content_ideas WHERE id = ?").get(id) as ContentIdeaRow | undefined;
  if (!row || !row.target_date) return null;
  const time = suggestPostingTime(row.platform, row.format, row.target_date).time;
  db.prepare("UPDATE content_ideas SET suggested_time = ? WHERE id = ?").run(time, id);
  return fromRow(db.prepare("SELECT * FROM content_ideas WHERE id = ?").get(id) as ContentIdeaRow);
}

export function deleteContentIdea(id: number): boolean {
  const result = getHealthDb().prepare("DELETE FROM content_ideas WHERE id = ?").run(id);
  return result.changes > 0;
}
