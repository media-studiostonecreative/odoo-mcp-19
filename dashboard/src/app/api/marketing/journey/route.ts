import { NextResponse } from "next/server";
import { fetchLandingPageFunnel } from "@/lib/shopify/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await fetchLandingPageFunnel();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[website-health] failed to load customer journey funnel:", error);
    return NextResponse.json({ error: "Unable to load Shopify funnel data." }, { status: 500 });
  }
}
