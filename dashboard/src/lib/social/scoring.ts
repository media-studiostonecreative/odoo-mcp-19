// dashboard/src/lib/social/scoring.ts

/**
 * Social Conversion Score — Phase 1 (real-data-only). Deliberately narrow: it uses only
 * numbers that are either pulled live from Shopify or manually entered by a person as a
 * real observation (revenue_attributed, link_clicks, engagement counts). There is no
 * trend or prediction component here — that is Phase 2+ and depends on data sources
 * this dashboard doesn't have yet (see the studiostone-social-conversion-analyst skill's
 * scoring-models.md for the full weighted model this will grow into).
 *
 * Revenue is weighted highest and engagement lowest on purpose: a post with heavy
 * likes/comments but no attributed sales must never outrank a post that actually drove
 * revenue, per the "engagement is not the objective" rule this dashboard follows
 * throughout (see Customer Journey's drop-off panel for the same principle applied
 * elsewhere).
 */

export interface SocialPostMetrics {
  id: number;
  revenueAttributed: number;
  linkClicks: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface SocialConversionScore {
  id: number;
  /** 0-100, relative to the other posts passed in. `null` when this post has zero
   * signal on every metric — there's nothing to score. */
  score: number | null;
  /** Whether any post in the input set has revenue_attributed > 0. When false, no post
   * in the batch has a revenue signal yet, so the score falls back to clicks+engagement
   * only and should be labeled as such in the UI rather than presented as a normal score. */
  hasRevenueSignal: boolean;
}

const WITH_REVENUE_WEIGHTS = { revenue: 0.5, clicks: 0.3, engagement: 0.2 };
const WITHOUT_REVENUE_WEIGHTS = { revenue: 0, clicks: 0.6, engagement: 0.4 };

/** Scores each post relative to the others in the same list (min-max normalized per
 * metric). Scores are only meaningful within one call's batch — they are not on an
 * absolute, cross-period scale. */
export function scoreSocialPosts(posts: SocialPostMetrics[]): SocialConversionScore[] {
  if (posts.length === 0) return [];

  const engagementOf = (p: SocialPostMetrics) => p.likes + p.comments + p.shares;
  const maxRevenue = Math.max(...posts.map((p) => p.revenueAttributed), 0);
  const maxClicks = Math.max(...posts.map((p) => p.linkClicks), 0);
  const maxEngagement = Math.max(...posts.map(engagementOf), 0);
  const hasRevenueSignal = maxRevenue > 0;
  const weights = hasRevenueSignal ? WITH_REVENUE_WEIGHTS : WITHOUT_REVENUE_WEIGHTS;

  return posts.map((p) => {
    const engagement = engagementOf(p);
    if (p.revenueAttributed === 0 && p.linkClicks === 0 && engagement === 0) {
      return { id: p.id, score: null, hasRevenueSignal };
    }

    const revenueNorm = maxRevenue > 0 ? p.revenueAttributed / maxRevenue : 0;
    const clicksNorm = maxClicks > 0 ? p.linkClicks / maxClicks : 0;
    const engagementNorm = maxEngagement > 0 ? engagement / maxEngagement : 0;

    const raw = revenueNorm * weights.revenue + clicksNorm * weights.clicks + engagementNorm * weights.engagement;
    return { id: p.id, score: Math.round(raw * 100), hasRevenueSignal };
  });
}
