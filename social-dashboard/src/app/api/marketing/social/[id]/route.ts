import { NextRequest, NextResponse } from "next/server";
import { deleteSocialPost } from "@/lib/marketing/socialPosts";

export const dynamic = "force-dynamic";

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deleted = deleteSocialPost(Number(id));
  if (!deleted) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
