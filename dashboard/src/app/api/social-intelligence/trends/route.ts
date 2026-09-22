import { NextRequest, NextResponse } from "next/server";
import { listTrendObservations, createTrendObservation, type NewTrendObservation } from "@/lib/social/trends";

export const dynamic = "force-dynamic";

const FACTOR_KEYS = [
  "product_relevance",
  "commercial_intent",
  "regional_momentum",
  "historical_performance",
  "seasonality_timing",
  "content_suitability",
  "inventory_availability",
] as const;

function isValidFactor(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

export async function GET() {
  try {
    return NextResponse.json({ observations: listTrendObservations() });
  } catch (error) {
    console.error("[website-health] failed to list trend observations:", error);
    return NextResponse.json({ error: "Unable to load trend observations." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Partial<NewTrendObservation> | null;
  if (!body || !body.term || !body.observed_date) {
    return NextResponse.json({ error: "term and observed_date are required." }, { status: 400 });
  }
  for (const key of FACTOR_KEYS) {
    if (!isValidFactor(body[key])) {
      return NextResponse.json({ error: `${key} must be a number between 0 and 100.` }, { status: 400 });
    }
  }
  try {
    const observation = createTrendObservation({
      term: body.term,
      platform: body.platform ?? null,
      observed_date: body.observed_date,
      product_relevance: body.product_relevance!,
      commercial_intent: body.commercial_intent!,
      regional_momentum: body.regional_momentum!,
      historical_performance: body.historical_performance!,
      seasonality_timing: body.seasonality_timing!,
      content_suitability: body.content_suitability!,
      inventory_availability: body.inventory_availability!,
      note: body.note ?? null,
      source_url: body.source_url ?? null,
    });
    return NextResponse.json({ observation }, { status: 201 });
  } catch (error) {
    console.error("[website-health] failed to create trend observation:", error);
    return NextResponse.json({ error: "Unable to save trend observation." }, { status: 500 });
  }
}
