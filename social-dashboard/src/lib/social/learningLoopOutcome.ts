// dashboard/src/lib/social/learningLoopOutcome.ts

/**
 * Turns a linked post's real metrics into a plain-language outcome note.
 * Deliberately does not compute a comparable numeric score against the
 * Trend Fit Score — Social Conversion Score (lib/social/scoring.ts) is a
 * relative, batch-normalized number, not on the same absolute scale as the
 * Trend Fit Score, so forcing them onto one axis would imply a precision
 * this data doesn't have. A single post is also never "sufficient sample
 * size" per the skill's own discount table, so this always says so.
 */

export interface LinkedPostMetrics {
  revenueAttributed: number;
  linkClicks: number;
  likes: number;
  comments: number;
  shares: number;
}

export type LearningLoopOutcome = "converted" | "engaged-no-revenue" | "no-engagement" | "awaiting-outcome";

export interface LearningLoopResult {
  outcome: LearningLoopOutcome;
  note: string;
}

const SAMPLE_SIZE_NOTE = "Based on a single linked post — not a sufficient sample size to adjust future scoring weights. Treat as one directional data point, not a verdict.";

export function evaluateLearningLoopOutcome(metrics: LinkedPostMetrics | null): LearningLoopResult {
  if (!metrics) {
    return { outcome: "awaiting-outcome", note: "Not linked to a post yet — link one once content for this trend has been published." };
  }
  if (metrics.revenueAttributed > 0) {
    return { outcome: "converted", note: `Attributed revenue recorded on the linked post. ${SAMPLE_SIZE_NOTE}` };
  }
  const engagement = metrics.likes + metrics.comments + metrics.shares + metrics.linkClicks;
  if (engagement > 0) {
    return { outcome: "engaged-no-revenue", note: `Engagement/clicks recorded, no attributed revenue yet. ${SAMPLE_SIZE_NOTE}` };
  }
  return { outcome: "no-engagement", note: `No engagement, clicks, or revenue recorded on the linked post. ${SAMPLE_SIZE_NOTE}` };
}
