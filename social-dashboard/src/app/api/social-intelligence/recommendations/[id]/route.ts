import { NextRequest, NextResponse } from "next/server";
import { linkTrendRecommendation, deleteTrendRecommendation } from "@/lib/social/learningLoop";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { linked_social_post_id?: number | null };
  const recommendation = linkTrendRecommendation(Number(id), body.linked_social_post_id ?? null);
  if (!recommendation) return NextResponse.json({ error: "Recommendation not found." }, { status: 404 });
  return NextResponse.json({ recommendation });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deleted = deleteTrendRecommendation(Number(id));
  if (!deleted) return NextResponse.json({ error: "Recommendation not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
