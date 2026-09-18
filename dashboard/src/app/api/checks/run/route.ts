import { NextResponse } from "next/server";
import { startQuickScan, getLatestScan } from "@/lib/issues/quickScan";

export const dynamic = "force-dynamic";

export async function POST() {
  const running = getLatestScan("quick");
  if (running && running.status === "running") {
    return NextResponse.json({ scanId: running.id, alreadyRunning: true });
  }
  try {
    const scanId = startQuickScan();
    return NextResponse.json({ scanId, alreadyRunning: false });
  } catch (error) {
    console.error("[website-health] failed to start check:", error);
    return NextResponse.json({ error: "Unable to start check." }, { status: 500 });
  }
}
