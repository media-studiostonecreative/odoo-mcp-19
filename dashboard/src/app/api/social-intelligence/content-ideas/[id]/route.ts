import { NextRequest, NextResponse } from "next/server";
import { updateContentIdeaStatus, updateContentIdea, recomputeSuggestedTime, type ContentIdeaStatus, type ContentIdeaUpdate, deleteContentIdea } from "@/lib/social/contentIdeas";

export const dynamic = "force-dynamic";

const VALID_STATUSES: ContentIdeaStatus[] = ["suggested", "approved", "used", "dismissed"];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { status?: string; recompute_time?: boolean } & ContentIdeaUpdate;

  if (body.recompute_time) {
    const idea = recomputeSuggestedTime(Number(id));
    if (!idea) return NextResponse.json({ error: "Idea not found or has no target_date." }, { status: 404 });
    return NextResponse.json({ idea });
  }

  if (body.target_date !== undefined || body.platform !== undefined || body.format !== undefined) {
    const idea = updateContentIdea(Number(id), body);
    if (!idea) return NextResponse.json({ error: "Idea not found." }, { status: 404 });
    return NextResponse.json({ idea });
  }

  if (!body.status || !VALID_STATUSES.includes(body.status as ContentIdeaStatus)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}.` }, { status: 400 });
  }
  const idea = updateContentIdeaStatus(Number(id), body.status as ContentIdeaStatus);
  if (!idea) return NextResponse.json({ error: "Idea not found." }, { status: 404 });
  return NextResponse.json({ idea });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deleted = deleteContentIdea(Number(id));
  if (!deleted) return NextResponse.json({ error: "Idea not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
