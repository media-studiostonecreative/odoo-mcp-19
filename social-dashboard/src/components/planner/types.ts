import type { HashtagEntry, ContentIdeaType, ContentIdeaConfidence, ContentIdeaStatus, ContentIdeaFormat } from "@/lib/social/contentIdeas";

export type { ContentIdeaStatus, ContentIdeaFormat };

export interface Me {
  id: number;
  name: string;
  role: "admin" | "member";
}

export interface PlannerComment {
  id: number;
  content_idea_id: number;
  person_id: number | null;
  author_name: string;
  body: string;
  created_at: string;
  edited_at: string | null;
}

export interface PlannerActivity {
  id: number;
  author_name: string;
  action: string;
  summary: string;
  created_at: string;
}

export interface PlannerIdea {
  id: number;
  idea_type: ContentIdeaType;
  source_post_id: number | null;
  occasion_id: string | null;
  target_date: string | null;
  suggested_time: string | null;
  platform: string;
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
  comments: PlannerComment[];
  activity: PlannerActivity[];
}

export const FORMAT_LABEL: Record<ContentIdeaFormat, string> = { photo: "Photo", reel: "Reel", carousel: "Carousel", story: "Story" };
export const PLATFORM_LABEL: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", pinterest: "Pinterest" };
export const CONFIDENCE_LABEL: Record<ContentIdeaConfidence, string> = {
  high: "High confidence",
  promising: "Promising test",
  experimental: "Experimental",
  insufficient: "Insufficient data",
};

export const STATUS_LABEL: Record<ContentIdeaStatus, string> = { suggested: "Suggested", approved: "Approved", used: "Posted", dismissed: "Dismissed" };

/** One colour rule for status everywhere: an amber dot needs a decision, sage is settled. */
export function statusPillClass(status: ContentIdeaStatus): string {
  if (status === "suggested") return "pill pill-review";
  if (status === "approved" || status === "used") return "pill pill-second";
  return "pill";
}

/** SQLite's datetime('now') is UTC without a zone marker. */
export function parseDbTime(value: string): Date {
  return new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

export function relativeTime(value: string, now: Date = new Date()): string {
  const then = parseDbTime(value);
  const minutes = Math.round((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export async function readError(res: Response | null, fallback: string): Promise<string> {
  if (!res) return "Couldn't reach the app. Check it's still running, then try again.";
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}
