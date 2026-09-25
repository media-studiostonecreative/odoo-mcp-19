import { NextResponse } from "next/server";
import { fetchCampaignAttribution } from "@/lib/shopify/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await fetchCampaignAttribution();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[social-dashboard] failed to load campaign attribution:", error);
    return NextResponse.json({ error: "Unable to load Shopify campaign attribution." }, { status: 500 });
  }
}
