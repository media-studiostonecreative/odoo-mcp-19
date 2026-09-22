import { NextRequest, NextResponse } from "next/server";
import { deleteTrendObservation } from "@/lib/social/trends";

export const dynamic = "force-dynamic";

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deleted = deleteTrendObservation(Number(id));
  if (!deleted) return NextResponse.json({ error: "Observation not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
