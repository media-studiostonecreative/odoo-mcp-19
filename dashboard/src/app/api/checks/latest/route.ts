import { NextResponse } from "next/server";
import { getLatestScan, getScanChecks } from "@/lib/issues/quickScan";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const scan = getLatestScan();
    if (!scan) return NextResponse.json({ scan: null, checks: [] });
    return NextResponse.json({ scan, checks: getScanChecks(scan.id) });
  } catch (error) {
    console.error("[website-health] failed to load latest scan:", error);
    return NextResponse.json({ error: "Unable to load the latest scan." }, { status: 500 });
  }
}
