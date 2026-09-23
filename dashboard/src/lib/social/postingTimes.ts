// dashboard/src/lib/social/postingTimes.ts

/**
 * General best-practice posting-time guidance, researched from published
 * cross-account engagement studies (cited below) — NOT measured from
 * Studiostone's own account, which only has 4 real logged posts so far
 * (explicitly flagged elsewhere as an insufficient sample to derive
 * account-specific optimal times). Per the studiostone-social-conversion-
 * analyst skill's "distinguishing what you know" rule, this is external
 * data, not a measured fact — label it as such wherever it's shown, and
 * replace it with real Studiostone audience-active-hours data (available
 * natively in Meta Business Suite Insights) once enough posting history
 * exists to make that comparison meaningful.
 *
 * Sources (checked 2026-09-23):
 * - Buffer, "Best Time to Post on Instagram" (9.6M posts): https://buffer.com/resources/when-is-the-best-time-to-post-on-instagram/
 * - Later, "Best time to post on Instagram" (6M+ posts): https://later.com/blog/best-time-to-post-on-instagram/
 * - Sendible / Zeely AI, Reels-specific timing: https://www.sendible.com/insights/best-time-to-upload-reels-on-instagram
 * - Sprout Social, "Best Times to Post on Facebook": https://sproutsocial.com/insights/best-times-to-post-on-facebook/
 * - Buffer, "Best Time to Post on Facebook" (14M posts): https://buffer.com/resources/best-time-to-post-on-facebook/
 * - Sprout Social / RecurPost, Pinterest timing: https://recurpost.com/blog/best-time-to-post-on-pinterest/
 */

export const POSTING_TIME_RESEARCH_NOTE =
  "General industry best-practice guidance (Buffer, Later, Sprout Social — see lib/social/postingTimes.ts for sources, checked 2026-09-23), not measured from Studiostone's own account. Replace with real audience-active-hours data from Meta Business Suite once there's enough posting history to make that comparison meaningful.";

export type PostingPlatform = "instagram" | "facebook" | "tiktok" | "pinterest";
export type PostingFormat = "photo" | "reel" | "carousel" | "story";

interface TimeRule {
  /** 0=Sun..6=Sat, undefined = applies any day */
  weekday?: number;
  time: string;
  reason: string;
}

const RULES: Record<PostingPlatform, { reel?: TimeRule[]; default: TimeRule[] }> = {
  instagram: {
    reel: [
      { weekday: 3, time: "7:00 PM", reason: "Reels on Wednesday evening (6-11 PM window) show the strongest engagement across studies." },
      { weekday: 4, time: "7:00 PM", reason: "Reels on Thursday evening (6-11 PM window) show the strongest engagement across studies." },
      { time: "7:30 PM", reason: "Reels generally outperform in the 7-9 PM evening window on weekdays." },
    ],
    default: [
      { weekday: 3, time: "12:00 PM", reason: "Wednesday midday is one of Buffer's top three windows for Instagram feed posts (9.6M posts analyzed)." },
      { weekday: 4, time: "9:00 AM", reason: "Thursday 9 AM is Buffer's top single window for Instagram feed posts." },
      { time: "11:00 AM", reason: "Tuesday-Thursday 10 AM-3 PM is the consistent cross-study window for Instagram feed posts." },
    ],
  },
  facebook: {
    default: [
      { weekday: 2, time: "10:00 AM", reason: "Tuesday 10 AM is the single most consistent top performer across Facebook studies." },
      { weekday: 1, time: "12:00 PM", reason: "Monday users are catching up on email in the morning; midday performs better." },
      { time: "9:00 AM", reason: "Weekday mornings (8-11 AM) are Facebook's dominant intentional-browsing window." },
    ],
  },
  pinterest: {
    default: [
      { weekday: 0, time: "8:00 PM", reason: "Sunday evening is Pinterest's highest cross-study engagement window." },
      { weekday: 1, time: "8:00 PM", reason: "Monday evening (8-11 PM) performs well for Pinterest per multiple studies." },
      { time: "10:00 AM", reason: "Tue-Thu 10 AM-1 PM is Sprout Social's identified peak-engagement window for Pinterest." },
    ],
  },
  tiktok: {
    default: [{ weekday: 3, time: "7:00 PM", reason: "Evening weekday windows generally carry over from Reels/short-form video research." }],
  },
};

export interface PostingTimeSuggestion {
  time: string;
  reason: string;
}

/** Picks the best-matching researched time for a platform/format/weekday, falling
 * back to that platform's general default rule when no day-specific rule matches. */
export function suggestPostingTime(platform: PostingPlatform, format: PostingFormat, dateIso: string): PostingTimeSuggestion {
  const weekday = new Date(`${dateIso}T00:00:00Z`).getUTCDay();
  const ruleSet = RULES[platform] ?? RULES.instagram;
  const candidates = format === "reel" && ruleSet.reel ? ruleSet.reel : ruleSet.default;
  const dayMatch = candidates.find((r) => r.weekday === weekday);
  const rule = dayMatch ?? candidates[candidates.length - 1]!;
  return { time: rule.time, reason: rule.reason };
}
