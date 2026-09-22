import { describe, it, expect } from "vitest";
import { parseSocialInsightsCsv } from "@/lib/marketing/socialInsightsImport";

// A representative excerpt of the real Meta Business Suite export format —
// header plus one summary row per platform and the two real cross-posted
// posts, mirroring studiostone_social_insights_2026-08-25_to_2026-09-21.csv.
const SAMPLE_CSV = `platform,record_type,metric,period_start,period_end,date,value,unit,change_vs_prev_period_pct,post_published,post_title
Facebook,summary,Views,2026-08-25,2026-09-21,,402,count,88.7,,
Facebook,summary,Views from followers,2026-08-25,2026-09-21,,64.9,percent,86.9,,
Instagram,summary,Views,2026-08-25,2026-09-21,,836,count,142.3,,
Facebook,daily,Views,2026-08-25,2026-09-21,2026-08-25,1,count,,,
Facebook,post,Views,2026-08-25,2026-09-21,2026-09-14,80,count,,2026-09-14 11:00,Maple Leaf Carving Kits – An autumn favourite is back
Facebook,post,Reactions/Likes,2026-08-25,2026-09-21,2026-09-14,4,count,,2026-09-14 11:00,Maple Leaf Carving Kits – An autumn favourite is back
Facebook,post,Comments,2026-08-25,2026-09-21,2026-09-14,1,count,,2026-09-14 11:00,Maple Leaf Carving Kits – An autumn favourite is back
Facebook,post,Shares,2026-08-25,2026-09-21,2026-09-14,0,count,,2026-09-14 11:00,Maple Leaf Carving Kits – An autumn favourite is back
Instagram,post,Reach,2026-08-25,2026-09-21,2026-09-14,62,count,,2026-09-14 11:00,Maple Leaf Carving Kits – An autumn favourite is back
Instagram,post,Reactions/Likes,2026-08-25,2026-09-21,2026-09-14,4,count,,2026-09-14 11:00,Maple Leaf Carving Kits – An autumn favourite is back
Instagram,post,Comments,2026-08-25,2026-09-21,2026-09-14,0,count,,2026-09-14 11:00,Maple Leaf Carving Kits – An autumn favourite is back
Instagram,post,Shares,2026-08-25,2026-09-21,2026-09-14,0,count,,2026-09-14 11:00,Maple Leaf Carving Kits – An autumn favourite is back
`;

describe("parseSocialInsightsCsv", () => {
  it("extracts summary rows for each platform, skipping daily rows", () => {
    const { summaries } = parseSocialInsightsCsv(SAMPLE_CSV);
    expect(summaries).toHaveLength(3);
    expect(summaries.find((s) => s.platform === "facebook" && s.metric === "Views")).toMatchObject({
      periodStart: "2026-08-25",
      periodEnd: "2026-09-21",
      value: 402,
      unit: "count",
      changePct: 88.7,
    });
  });

  it("pivots per-post metric rows into one post per platform", () => {
    const { posts } = parseSocialInsightsCsv(SAMPLE_CSV);
    expect(posts).toHaveLength(2);

    const fbPost = posts.find((p) => p.platform === "facebook")!;
    expect(fbPost).toMatchObject({
      postedDate: "2026-09-14",
      title: "Maple Leaf Carving Kits – An autumn favourite is back",
      reach: 80,
      likes: 4,
      comments: 1,
      shares: 0,
    });

    const igPost = posts.find((p) => p.platform === "instagram")!;
    expect(igPost).toMatchObject({
      postedDate: "2026-09-14",
      title: "Maple Leaf Carving Kits – An autumn favourite is back",
      reach: 62,
      likes: 4,
      comments: 0,
      shares: 0,
    });
  });

  it("ignores unsupported platforms without throwing", () => {
    const csv = `platform,record_type,metric,period_start,period_end,date,value,unit,change_vs_prev_period_pct,post_published,post_title
LinkedIn,summary,Views,2026-08-25,2026-09-21,,10,count,,,
`;
    const result = parseSocialInsightsCsv(csv);
    expect(result.summaries).toHaveLength(0);
    expect(result.posts).toHaveLength(0);
  });

  it("returns empty results for an empty CSV", () => {
    expect(parseSocialInsightsCsv("")).toEqual({ posts: [], summaries: [] });
  });
});
