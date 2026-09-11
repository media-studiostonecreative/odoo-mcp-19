import { NextResponse } from "next/server";
import { getLatestLinkChecks } from "@/lib/server/health/quickScan";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const links = getLatestLinkChecks();
    return NextResponse.json({ links });
  } catch (error) {
    console.error("[website-health] failed to load link checks:", error);
    return NextResponse.json({ error: "Unable to load broken link data." }, { status: 500 });
  }
}
