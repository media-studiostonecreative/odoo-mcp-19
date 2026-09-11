import { NextRequest, NextResponse } from "next/server";
import { listIssues } from "@/lib/server/health/issues";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const severity = request.nextUrl.searchParams.get("severity") ?? undefined;
  const category = request.nextUrl.searchParams.get("category") ?? undefined;
  try {
    const issues = listIssues({ status, severity, category });
    return NextResponse.json({ issues });
  } catch (error) {
    console.error("[website-health] failed to list issues:", error);
    return NextResponse.json({ error: "Unable to load issues." }, { status: 500 });
  }
}
