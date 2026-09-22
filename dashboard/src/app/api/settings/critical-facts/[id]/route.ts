import { NextRequest, NextResponse } from "next/server";
import { verifyCriticalFact, deleteCriticalFact, type CriticalFactStatus } from "@/lib/settings/criticalFacts";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { status?: string };
  if (body.status !== "confirmed" && body.status !== "mismatch") {
    return NextResponse.json({ error: "status must be 'confirmed' or 'mismatch'." }, { status: 400 });
  }
  const fact = verifyCriticalFact(Number(id), body.status as Extract<CriticalFactStatus, "confirmed" | "mismatch">);
  if (!fact) return NextResponse.json({ error: "Fact not found." }, { status: 404 });
  return NextResponse.json({ fact });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deleted = deleteCriticalFact(Number(id));
  if (!deleted) return NextResponse.json({ error: "Fact not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
