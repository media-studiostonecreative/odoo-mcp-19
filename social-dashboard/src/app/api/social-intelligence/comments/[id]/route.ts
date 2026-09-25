import { NextRequest, NextResponse } from "next/server";
import { CommentError, deleteComment, editComment } from "@/lib/team/comments";
import { currentPerson, unauthorized } from "@/lib/team/session";

export const dynamic = "force-dynamic";

function failure(error: unknown): NextResponse {
  if (error instanceof CommentError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[social-dashboard] comment update failed:", error);
  return NextResponse.json({ error: "Unable to update that comment." }, { status: 500 });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const person = await currentPerson();
  if (!person) return unauthorized();
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { body?: unknown } | null;
  try {
    return NextResponse.json({ comment: editComment(Number(id), person, body?.body) });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const person = await currentPerson();
  if (!person) return unauthorized();
  const { id } = await context.params;
  try {
    deleteComment(Number(id), person);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
