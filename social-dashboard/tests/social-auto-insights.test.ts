import { describe, it, expect } from "vitest";
import { generateAutoInsights, type AutoInsightPost, type AutoInsightPlatformMetric } from "@/lib/social/autoInsights";

// Mirrors the real imported data from studiostone_social_insights_2026-08-25_to_2026-09-21.csv
const REAL_POSTS: AutoInsightPost[] = [
  { platform: "instagram", utmCampaign: null, revenueAttributed: 0 },
  { platform: "facebook", utmCampaign: null, revenueAttributed: 0 },
  { platform: "instagram", utmCampaign: null, revenueAttributed: 0 },
  { platform: "facebook", utmCampaign: null, revenueAttributed: 0 },
];

const REAL_METRICS: AutoInsightPlatformMetric[] = [
  { platform: "facebook", metric: "Views", value: 402, changePct: 88.7 },
  { platform: "facebook", metric: "Orders created", value: 0, changePct: 0 },
  { platform: "facebook", metric: "Conversations started", value: 0, changePct: -100 },
  { platform: "facebook", metric: "New contacts", value: 0, changePct: -100 },
  { platform: "instagram", metric: "Views", value: 836, changePct: 142.3 },
  { platform: "instagram", metric: "Orders created", value: 0, changePct: 0 },
  { platform: "instagram", metric: "Conversations started", value: 5, changePct: 66.7 },
  { platform: "instagram", metric: "New contacts", value: 3, changePct: 50 },
  { platform: "instagram", metric: "Response rate", value: 20, changePct: 100 },
];

describe("generateAutoInsights", () => {
  it("leads with zero orders as a high-confidence fact when no revenue exists anywhere", () => {
    const insights = generateAutoInsights(REAL_POSTS, REAL_METRICS, []);
    const zeroOrders = insights.find((i) => i.id === "zero-orders");
    expect(zeroOrders).toBeDefined();
    expect(zeroOrders!.kind).toBe("fact");
    expect(zeroOrders!.confidence).toBe("high");
  });

  it("cross-references Shopify UTM attribution when it is also empty", () => {
    const insights = generateAutoInsights(REAL_POSTS, REAL_METRICS, []);
    expect(insights.some((i) => i.id === "zero-utm-attribution")).toBe(true);
  });

  it("does not claim zero orders when a platform actually reports orders", () => {
    const metricsWithOrder = REAL_METRICS.map((m) => (m.platform === "instagram" && m.metric === "Orders created" ? { ...m, value: 2 } : m));
    const insights = generateAutoInsights(REAL_POSTS, metricsWithOrder, []);
    expect(insights.some((i) => i.id === "zero-orders")).toBe(false);
    expect(insights.some((i) => i.id === "orders-present")).toBe(true);
  });

  it("surfaces the platform momentum comparison below the revenue fact, not instead of it", () => {
    const insights = generateAutoInsights(REAL_POSTS, REAL_METRICS, []);
    const momentum = insights.find((i) => i.id === "platform-momentum");
    expect(momentum).toBeDefined();
    expect(momentum!.text).toContain("Instagram");
    expect(momentum!.confidence).not.toBe("high"); // engagement growth is never framed with the same certainty as a measured revenue fact
  });

  it("flags the conversation gap between a platform with buying-intent contact and one without", () => {
    const insights = generateAutoInsights(REAL_POSTS, REAL_METRICS, []);
    const gap = insights.find((i) => i.id === "conversation-gap");
    expect(gap).toBeDefined();
    expect(gap!.text).toContain("Instagram");
    expect(gap!.text).toContain("Facebook");
  });

  it("flags Instagram's low response rate as a fixable operational recommendation", () => {
    const insights = generateAutoInsights(REAL_POSTS, REAL_METRICS, []);
    const responseRate = insights.find((i) => i.id === "response-rate-instagram");
    expect(responseRate).toBeDefined();
    expect(responseRate!.kind).toBe("recommendation");
  });

  it("flags zero UTM coverage across all logged posts", () => {
    const insights = generateAutoInsights(REAL_POSTS, REAL_METRICS, []);
    const utmGap = insights.find((i) => i.id === "utm-coverage-gap");
    expect(utmGap).toBeDefined();
    expect(utmGap!.text).toContain("4");
  });

  it("does not flag the UTM gap once posts are tagged", () => {
    const taggedPosts = REAL_POSTS.map((p) => ({ ...p, utmCampaign: "fall-launch" }));
    const insights = generateAutoInsights(taggedPosts, REAL_METRICS, []);
    expect(insights.some((i) => i.id === "utm-coverage-gap")).toBe(false);
  });

  it("marks pattern analysis as insufficient data with only 4 posts logged", () => {
    const insights = generateAutoInsights(REAL_POSTS, REAL_METRICS, []);
    const sample = insights.find((i) => i.id === "insufficient-sample");
    expect(sample).toBeDefined();
    expect(sample!.confidence).toBe("insufficient");
  });

  it("does not flag insufficient sample once enough posts are logged", () => {
    const manyPosts: AutoInsightPost[] = Array.from({ length: 6 }, () => ({ platform: "instagram", utmCampaign: null, revenueAttributed: 0 }));
    const insights = generateAutoInsights(manyPosts, REAL_METRICS, []);
    expect(insights.some((i) => i.id === "insufficient-sample")).toBe(false);
  });

  it("returns no insights for empty input", () => {
    expect(generateAutoInsights([], [], [])).toEqual([]);
  });
});
