import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/server/kpi/dashboard";
import type { PeriodKey } from "@/lib/server/periods";

export const dynamic = "force-dynamic";

const VALID_PERIODS: PeriodKey[] = ["month", "quarter", "ytd", "12months"];

export async function GET(request: NextRequest) {
  const periodParam = request.nextUrl.searchParams.get("period") ?? "month";
  const period = (VALID_PERIODS as string[]).includes(periodParam)
    ? (periodParam as PeriodKey)
    : "month";

  try {
    const data = await getDashboardData(period);
    return NextResponse.json(data);
  } catch (error) {
    // Sanitized: never forward the underlying error's message verbatim in
    // case it echoes request internals — log server-side only.
    console.error("[dashboard] failed to build dashboard data:", error);
    return NextResponse.json(
      { error: "Unable to reach Odoo right now. Please try refreshing shortly." },
      { status: 502 },
    );
  }
}
