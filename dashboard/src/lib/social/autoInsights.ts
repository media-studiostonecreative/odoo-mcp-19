// dashboard/src/lib/social/autoInsights.ts

/**
 * Automated feedback and suggestions for Social & Conversion Intelligence,
 * generated from data that's already real and already in the dashboard
 * (imported Meta Business Suite insights + Shopify UTM attribution) — no
 * manual trend-observation logging required. This is a deterministic port of
 * the studiostone-social-conversion-analyst skill's analytical hierarchy and
 * confidence rules (see ~/.claude/skills/studiostone-social-conversion-analyst/SKILL.md),
 * not a live LLM call: every check below reasons over real numbers with fixed
 * logic, so it can run automatically on every page load without an API key,
 * a per-call cost, or a live trend provider. It complements — it doesn't
 * replace — the manual Trend Observation tool, which is for logging a
 * forward-looking hypothesis a live trend feed can't yet supply (Phase 3).
 *
 * The skill's #1 rule governs every check here: engagement is never treated
 * as success in its own right. Revenue/orders facts are always surfaced
 * first and are never averaged away by engagement growth, per the skill's
 * analytical hierarchy (revenue > orders > conversion > ... > engagement >
 * reach).
 */

export type InsightConfidence = "high" | "promising" | "experimental" | "insufficient";
export type InsightKind = "fact" | "inference" | "recommendation";

export interface Insight {
  id: string;
  kind: InsightKind;
  confidence: InsightConfidence;
  text: string;
}

export interface AutoInsightPost {
  platform: string;
  utmCampaign: string | null;
  revenueAttributed: number;
}

export interface AutoInsightPlatformMetric {
  platform: string;
  metric: string;
  value: number | null;
  changePct: number | null;
}

export interface AutoInsightCampaignRow {
  sessions: number;
  sales: number;
}

const MIN_POSTS_FOR_PATTERN_ANALYSIS = 5;

function findMetric(metrics: AutoInsightPlatformMetric[], platform: string, name: string): AutoInsightPlatformMetric | undefined {
  return metrics.find((m) => m.platform === platform && m.metric.toLowerCase() === name.toLowerCase());
}

function platforms(metrics: AutoInsightPlatformMetric[]): string[] {
  return Array.from(new Set(metrics.map((m) => m.platform)));
}

function pctLabel(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

/** Deterministic, revenue-first feedback generated from real, already-imported data.
 * Never fabricates a number that isn't present in the input. */
export function generateAutoInsights(
  posts: AutoInsightPost[],
  platformMetrics: AutoInsightPlatformMetric[],
  campaignAttribution: AutoInsightCampaignRow[],
): Insight[] {
  const insights: Insight[] = [];
  const plats = platforms(platformMetrics);

  // 1. Revenue/orders — the top of the hierarchy — always surfaced first,
  // regardless of what engagement metrics below might suggest.
  const orderMetrics = plats
    .map((p) => findMetric(platformMetrics, p, "Orders created"))
    .filter((m): m is AutoInsightPlatformMetric => m !== undefined);
  const totalAttributedSales = campaignAttribution.reduce((sum, r) => sum + r.sales, 0);
  const totalAttributedSessions = campaignAttribution.reduce((sum, r) => sum + r.sessions, 0);

  if (orderMetrics.length > 0) {
    const totalOrders = orderMetrics.reduce((sum, m) => sum + (m.value ?? 0), 0);
    if (totalOrders === 0) {
      insights.push({
        id: "zero-orders",
        kind: "fact",
        confidence: "high",
        text: `Across ${plats.join(" and ")}, 0 orders were attributed to social activity in the imported period (source: each platform's own "Orders created" metric). This is the top of the analytical hierarchy — it isn't offset by any engagement growth below, no matter how strong.`,
      });
      if (totalAttributedSessions === 0) {
        insights.push({
          id: "zero-utm-attribution",
          kind: "fact",
          confidence: "high",
          text: "Shopify's own UTM-based campaign attribution independently shows the same result: 0 tagged sessions and $0 attributed sales in the trailing 180 days. Two independent measurements agree — social is not currently a measured revenue channel.",
        });
      }
    } else {
      insights.push({
        id: "orders-present",
        kind: "fact",
        confidence: "high",
        text: `${totalOrders} order(s) attributed to social activity in the imported period across ${plats.join(" and ")}. This is the highest-priority result — lead with it over any engagement figure.`,
      });
    }
  } else if (totalAttributedSales > 0) {
    insights.push({
      id: "utm-sales-present",
      kind: "fact",
      confidence: "high",
      text: `Shopify UTM attribution shows ${formatCurrencyPlain(totalAttributedSales)} in attributed sales from tagged social campaigns — the single most important number here.`,
    });
  }

  // 2. Platform momentum comparison (measured fact, but explicitly kept below
  // the revenue fact per the hierarchy — never presented as if it were the
  // headline result).
  if (plats.length >= 2) {
    const viewsChanges = plats
      .map((p) => ({ platform: p, metric: findMetric(platformMetrics, p, "Views") }))
      .filter((x): x is { platform: string; metric: AutoInsightPlatformMetric } => x.metric?.changePct != null);
    if (viewsChanges.length >= 2) {
      const sorted = [...viewsChanges].sort((a, b) => (b.metric.changePct ?? 0) - (a.metric.changePct ?? 0));
      const top = sorted[0]!;
      const rest = sorted.slice(1);
      insights.push({
        id: "platform-momentum",
        kind: "inference",
        confidence: "promising",
        text: `${capitalize(top.platform)} is growing faster on reach/views this period (${pctLabel(top.metric.changePct!)}) than ${rest.map((r) => `${capitalize(r.platform)} (${pctLabel(r.metric.changePct!)})`).join(", ")}. Per the analytical hierarchy this is #9-11 territory (reach/engagement) — real, but it does not change the revenue/orders result above.`,
      });
    }
  }

  // 3. Conversation/new-contact gap — a stronger signal than passive
  // engagement because it implies actual buying-intent contact, not just a view.
  const conversationRows = plats
    .map((p) => ({
      platform: p,
      conversations: findMetric(platformMetrics, p, "Conversations started")?.value ?? null,
      newContacts: findMetric(platformMetrics, p, "New contacts")?.value ?? null,
    }))
    .filter((r) => r.conversations !== null || r.newContacts !== null);

  if (conversationRows.length >= 2) {
    const withSignal = conversationRows.filter((r) => (r.conversations ?? 0) > 0 || (r.newContacts ?? 0) > 0);
    const withoutSignal = conversationRows.filter((r) => (r.conversations ?? 0) === 0 && (r.newContacts ?? 0) === 0);
    if (withSignal.length > 0 && withoutSignal.length > 0) {
      insights.push({
        id: "conversation-gap",
        kind: "recommendation",
        confidence: "promising",
        text: `${withSignal.map((r) => capitalize(r.platform)).join(", ")} generated real buying-intent contact (${withSignal.map((r) => `${r.conversations ?? 0} conversation(s), ${r.newContacts ?? 0} new contact(s)`).join("; ")}) that ${withoutSignal.map((r) => capitalize(r.platform)).join(", ")} produced none of. Since a started conversation ranks above passive engagement in the hierarchy, prioritize following up there and investigate why the other platform isn't producing any.`,
      });
    }
  }

  // 4. Response-rate friction — an operational fix, not a prediction, so it
  // gets "high" confidence even though the sample behind it is small.
  for (const p of plats) {
    const responseRate = findMetric(platformMetrics, p, "Response rate");
    const conversations = findMetric(platformMetrics, p, "Conversations started");
    if (responseRate?.value != null && responseRate.value < 50 && (conversations?.value ?? 0) > 0) {
      insights.push({
        id: `response-rate-${p}`,
        kind: "recommendation",
        confidence: "high",
        text: `${capitalize(p)}'s response rate is only ${responseRate.value}% despite ${conversations!.value} conversation(s) started. These are buying-intent contacts, not passive engagement — closing the response gap is a low-effort, high-leverage fix.`,
      });
    }
  }

  // 5. UTM coverage — a structural gap, not a prediction: without tags,
  // nothing above can ever be measured against Shopify sessions.
  if (posts.length > 0) {
    const tagged = posts.filter((p) => p.utmCampaign).length;
    if (tagged === 0) {
      insights.push({
        id: "utm-coverage-gap",
        kind: "recommendation",
        confidence: "high",
        text: `None of the ${posts.length} logged post(s) carry a UTM tag, so it's structurally impossible to attribute any of this reach to a Shopify session. Tag every future post's link with the UTM Builder before publishing so this stops being a blind spot.`,
      });
    }
  }

  // 6. Sample-size honesty — the skill's own rule: a single post's numbers
  // are not a trend, and pillar/pattern analysis needs real volume.
  if (posts.length > 0 && posts.length < MIN_POSTS_FOR_PATTERN_ANALYSIS) {
    insights.push({
      id: "insufficient-sample",
      kind: "fact",
      confidence: "insufficient",
      text: `Only ${posts.length} post(s) are logged — not enough to compare content pillars (product vs. process vs. lifestyle, etc.) or detect content fatigue. Import more historical exports or keep logging new posts to build a real pattern base before drawing conclusions from content type.`,
    });
  }

  return insights;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatCurrencyPlain(value: number): string {
  return `$${value.toFixed(2)}`;
}
