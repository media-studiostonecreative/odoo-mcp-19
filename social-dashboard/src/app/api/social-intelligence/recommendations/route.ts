import { NextRequest, NextResponse } from "next/server";
import { listTrendRecommendations, createTrendRecommendation, type NewTrendRecommendation } from "@/lib/social/learningLoop";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ recommendations: listTrendRecommendations() });
  } catch (error) {
    console.error("[social-dashboard] failed to list trend recommendations:", error);
    return NextResponse.json({ error: "Unable to load trend recommendations." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Partial<NewTrendRecommendation> | null;
  if (!body || !body.term || typeof body.score_at_recommendation !== "number" || !body.classification_at_recommendation) {
    return NextResponse.json({ error: "term, score_at_recommendation, and classification_at_recommendation are required." }, { status: 400 });
  }
  try {
    const recommendation = createTrendRecommendation({
      trend_observation_id: body.trend_observation_id ?? null,
      term: body.term,
      score_at_recommendation: body.score_at_recommendation,
      classification_at_recommendation: body.classification_at_recommendation,
    });
    return NextResponse.json({ recommendation }, { status: 201 });
  } catch (error) {
    console.error("[social-dashboard] failed to log trend recommendation:", error);
    return NextResponse.json({ error: "Unable to log trend recommendation." }, { status: 500 });
  }
}
