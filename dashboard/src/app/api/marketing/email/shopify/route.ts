import { NextResponse } from "next/server";
import { fetchEmailEngagements } from "@/lib/shopify/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await fetchEmailEngagements();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[website-health] failed to load Shopify email engagements:", error);
    return NextResponse.json({ error: "Unable to load Shopify Email performance." }, { status: 500 });
  }
}
