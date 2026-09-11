import { NextRequest, NextResponse } from "next/server";
import { getTargets, setTargets, TARGET_KEYS } from "@/lib/server/targets";
import { clearCache } from "@/lib/server/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getTargets());
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const partial: Record<string, number> = {};
  for (const key of TARGET_KEYS) {
    const value = (body as Record<string, unknown>)[key];
    if (typeof value === "number") partial[key] = value;
  }

  const updated = setTargets(partial);
  // Targets feed the revenue-vs-target chart, which is served from the
  // dashboard cache — invalidate it so the change is visible immediately
  // rather than waiting out the TTL.
  clearCache();
  return NextResponse.json(updated);
}
