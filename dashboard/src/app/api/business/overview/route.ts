import { NextRequest, NextResponse } from "next/server";
import { resolvePeriod, resolveCustomPeriod, type PeriodKey } from "@/lib/odoo/periods";
import { fetchResolvedQuotations } from "@/lib/odoo/quotations";
import { summarizeConversion, compareConversion } from "@/lib/odoo/conversion";

export const dynamic = "force-dynamic";

const VALID_PERIODS: PeriodKey[] = ["month", "quarter", "ytd", "12months", "custom"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const period = (params.get("period") ?? "month") as PeriodKey;

  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: `Invalid period: ${period}` }, { status: 400 });
  }

  let periodRange;
  try {
    if (period === "custom") {
      const start = params.get("start");
      const end = params.get("end");
      if (!start || !end) {
        return NextResponse.json({ error: "period=custom requires both start and end query params" }, { status: 400 });
      }
      periodRange = resolveCustomPeriod(start, end);
    } else {
      periodRange = resolvePeriod(period);
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid date range" }, { status: 400 });
  }

  try {
    const [currentOrders, previousOrders] = await Promise.all([
      fetchResolvedQuotations(periodRange.current),
      fetchResolvedQuotations(periodRange.previous),
    ]);
    const comparison = compareConversion(summarizeConversion(currentOrders), summarizeConversion(previousOrders));
    return NextResponse.json({ label: periodRange.label, ...comparison });
  } catch (error) {
    console.error("[website-health] failed to load business overview:", error);
    return NextResponse.json({ error: "Unable to load business data from Odoo." }, { status: 500 });
  }
}
