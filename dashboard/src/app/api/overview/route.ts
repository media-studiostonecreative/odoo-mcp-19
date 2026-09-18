import { NextResponse } from "next/server";
import { getLatestAudit } from "@/lib/issues/auditImport";
import { getLatestScan } from "@/lib/issues/quickScan";

export const dynamic = "force-dynamic";

// getLatestAudit() imports any new monthly audit report files first (see
// lib/issues/auditImport.ts), so their findings land in /api/issues before
// this response is even read — same "read triggers refresh" pattern as the
// pre-rebuild app's getHealthOverview().
export async function GET() {
  try {
    return NextResponse.json({
      lastAudit: getLatestAudit(),
      lastQuickScan: getLatestScan("quick"),
    });
  } catch (error) {
    console.error("[website-health] failed to load overview:", error);
    return NextResponse.json({ error: "Unable to load overview." }, { status: 500 });
  }
}
