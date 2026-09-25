import { NextRequest, NextResponse } from "next/server";
import { listContentIdeas, createContentIdea, type NewContentIdea } from "@/lib/social/contentIdeas";
import { commentsFor } from "@/lib/team/comments";
import { activityFor, logActivity } from "@/lib/team/activity";
import { currentPerson, unauthorized } from "@/lib/team/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const comments = commentsFor();
    const activity = activityFor("content_idea");
    const ideas = listContentIdeas().map((idea) => ({ ...idea, comments: comments.get(idea.id) ?? [], activity: activity.get(idea.id) ?? [] }));
    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("[social-dashboard] failed to list content ideas:", error);
    return NextResponse.json({ error: "Unable to load content ideas." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const person = await currentPerson();
  if (!person) return unauthorized();
  const body = (await request.json().catch(() => null)) as Partial<NewContentIdea> | null;
  if (!body || !body.idea_type || !body.platform || !body.product || !body.caption || !body.reasoning || !body.confidence) {
    return NextResponse.json({ error: "idea_type, platform, product, caption, reasoning, and confidence are required." }, { status: 400 });
  }
  try {
    const idea = createContentIdea(body as NewContentIdea);
    logActivity(person, "content_idea", idea.id, "create", "Created this post");
    return NextResponse.json({ idea }, { status: 201 });
  } catch (error) {
    console.error("[social-dashboard] failed to create content idea:", error);
    return NextResponse.json({ error: "Unable to save content idea." }, { status: 500 });
  }
}
