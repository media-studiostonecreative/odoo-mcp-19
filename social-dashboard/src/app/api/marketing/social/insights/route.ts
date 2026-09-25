import { NextResponse } from "next/server";
import { listLatestPlatformInsights } from "@/lib/marketing/socialInsightsImport";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ insights: listLatestPlatformInsights() });
  } catch (error) {
    console.error("[social-dashboard] failed to load platform insights:", error);
    return NextResponse.json({ error: "Unable to load platform insights." }, { status: 500 });
  }
}
