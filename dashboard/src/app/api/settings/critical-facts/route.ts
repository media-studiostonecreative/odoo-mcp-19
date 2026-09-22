import { NextRequest, NextResponse } from "next/server";
import { listCriticalFacts, createCriticalFact, type NewCriticalFact } from "@/lib/settings/criticalFacts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ facts: listCriticalFacts() });
  } catch (error) {
    console.error("[website-health] failed to list critical facts:", error);
    return NextResponse.json({ error: "Unable to load critical facts." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Partial<NewCriticalFact> | null;
  if (!body || !body.description || !body.expected_value) {
    return NextResponse.json({ error: "description and expected_value are required." }, { status: 400 });
  }
  try {
    const fact = createCriticalFact({
      description: body.description,
      expected_value: body.expected_value,
      source_url: body.source_url ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json({ fact }, { status: 201 });
  } catch (error) {
    console.error("[website-health] failed to create critical fact:", error);
    return NextResponse.json({ error: "Unable to save critical fact." }, { status: 500 });
  }
}
