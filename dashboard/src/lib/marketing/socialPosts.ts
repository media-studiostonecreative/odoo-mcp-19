// dashboard/src/lib/marketing/socialPosts.ts
import "server-only";

import { getHealthDb } from "../db";

export type SocialPlatform = "instagram" | "facebook" | "tiktok" | "pinterest";

export interface SocialPost {
  id: number;
  posted_date: string;
  platform: SocialPlatform;
  post_type: string | null;
  caption: string | null;
  likes: number;
  comments: number;
  shares: number;
  link_clicks: number;
  notes: string | null;
  created_at: string;
}

export interface NewSocialPost {
  posted_date: string;
  platform: SocialPlatform;
  post_type?: string | null;
  caption?: string | null;
  likes: number;
  comments: number;
  shares: number;
  link_clicks: number;
  notes?: string | null;
}

export function listSocialPosts(platform?: SocialPlatform): SocialPost[] {
  const db = getHealthDb();
  if (platform) {
    return db.prepare("SELECT * FROM social_posts WHERE platform = ? ORDER BY posted_date DESC, id DESC").all(platform) as SocialPost[];
  }
  return db.prepare("SELECT * FROM social_posts ORDER BY posted_date DESC, id DESC").all() as SocialPost[];
}

export function createSocialPost(data: NewSocialPost): SocialPost {
  const db = getHealthDb();
  const result = db
    .prepare(
      `INSERT INTO social_posts (posted_date, platform, post_type, caption, likes, comments, shares, link_clicks, notes)
       VALUES (@posted_date, @platform, @post_type, @caption, @likes, @comments, @shares, @link_clicks, @notes)`,
    )
    .run({ ...data, post_type: data.post_type ?? null, caption: data.caption ?? null, notes: data.notes ?? null });
  return db.prepare("SELECT * FROM social_posts WHERE id = ?").get(result.lastInsertRowid) as SocialPost;
}

export function deleteSocialPost(id: number): boolean {
  const db = getHealthDb();
  const result = db.prepare("DELETE FROM social_posts WHERE id = ?").run(id);
  return result.changes > 0;
}
