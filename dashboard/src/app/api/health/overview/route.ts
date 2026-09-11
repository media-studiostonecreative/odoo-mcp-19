import { NextResponse } from "next/server";
import { getHealthOverview } from "@/lib/server/health/overview";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = getHealthOverview();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[website-health] overview failed:", error);
    return NextResponse.json({ error: "Unable to load Website Health overview." }, { status: 500 });
  }
}
