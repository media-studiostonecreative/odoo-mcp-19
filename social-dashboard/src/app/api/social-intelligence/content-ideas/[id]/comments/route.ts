import { NextRequest, NextResponse } from "next/server";
import { addComment, CommentError } from "@/lib/team/comments";
import { currentPerson, unauthorized } from "@/lib/team/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const person = await currentPerson();
  if (!person) return unauthorized();
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { body?: unknown } | null;
  try {
    return NextResponse.json({ comment: addComment(Number(id), person, body?.body) }, { status: 201 });
  } catch (error) {
    if (error instanceof CommentError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[social-dashboard] failed to add comment:", error);
    return NextResponse.json({ error: "Unable to post that comment." }, { status: 500 });
  }
}
