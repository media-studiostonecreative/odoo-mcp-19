import { NextRequest, NextResponse } from "next/server";
import { listContentIdeas, createContentIdea, type NewContentIdea } from "@/lib/social/contentIdeas";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ideas: listContentIdeas() });
  } catch (error) {
    console.error("[website-health] failed to list content ideas:", error);
    return NextResponse.json({ error: "Unable to load content ideas." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Partial<NewContentIdea> | null;
  if (!body || !body.idea_type || !body.platform || !body.product || !body.caption || !body.reasoning || !body.confidence) {
    return NextResponse.json({ error: "idea_type, platform, product, caption, reasoning, and confidence are required." }, { status: 400 });
  }
  try {
    const idea = createContentIdea(body as NewContentIdea);
    return NextResponse.json({ idea }, { status: 201 });
  } catch (error) {
    console.error("[website-health] failed to create content idea:", error);
    return NextResponse.json({ error: "Unable to save content idea." }, { status: 500 });
  }
}
