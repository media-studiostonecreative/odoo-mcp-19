import { NextRequest, NextResponse } from "next/server";
import { deleteTradeShow } from "@/lib/social/tradeShows";

export const dynamic = "force-dynamic";

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deleted = deleteTradeShow(Number(id));
  if (!deleted) return NextResponse.json({ error: "Trade show not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
