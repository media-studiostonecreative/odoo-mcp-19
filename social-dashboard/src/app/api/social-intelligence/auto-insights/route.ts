import { NextResponse } from "next/server";
import { generateAutoInsights } from "@/lib/social/autoInsights";
import { listSocialPosts } from "@/lib/marketing/socialPosts";
import { listLatestPlatformInsights } from "@/lib/marketing/socialInsightsImport";
import { fetchCampaignAttribution } from "@/lib/shopify/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = listSocialPosts();
    const platformInsights = listLatestPlatformInsights();
    const attribution = await fetchCampaignAttribution();

    const insights = generateAutoInsights(
      posts.map((p) => ({ platform: p.platform, utmCampaign: p.utm_campaign, revenueAttributed: p.revenue_attributed })),
      platformInsights.map((m) => ({ platform: m.platform, metric: m.metric, value: m.value, changePct: m.change_vs_prev_period_pct })),
      attribution.configured ? attribution.rows.map((r) => ({ sessions: r.sessions, sales: r.sales })) : [],
    );

    return NextResponse.json({ insights, postCount: posts.length });
  } catch (error) {
    console.error("[social-dashboard] failed to generate auto insights:", error);
    return NextResponse.json({ error: "Unable to generate insights." }, { status: 500 });
  }
}
